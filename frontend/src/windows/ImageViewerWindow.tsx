import { useEffect, useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { X, Edit, Clipboard, Maximize2, Minimize2, Maximize, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { ClipboardItem, Settings } from '../types';
import { ContextMenu } from '../components/ContextMenu';

// Debounce utility for window persistence
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeoutId: any;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function ImageViewerWindow() {
  const { t } = useTranslation();
  const [clip, setClip] = useState<ClipboardItem | null>(null);
  const [fitToWindow, setFitToWindow] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const appWindow = getCurrentWebviewWindow();
  const settingsRef = useRef<Settings | null>(null);

  const loadClip = useCallback((id: string) => {
    setLoading(true);
    invoke<ClipboardItem>('get_clip', { clipId: id })
      .then((clipData) => {
        setClip(clipData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load viewer data:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const clipId = urlParams.get('clip_id');

    // Show window ASAP to avoid "two clicks" issue, relying on bg-zinc-950 to hide flash
    appWindow
      .show()
      .then(() => {
        appWindow.setFocus().catch(() => {});
      })
      .catch(() => {});

    if (clipId) {
      loadClip(clipId);
    }

    // Check initial maximized state
    appWindow.isMaximized().then(setIsMaximized);

    // Apply theme
    const applyTheme = (theme: string) => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    invoke<Settings>('get_settings')
      .then((s) => {
        settingsRef.current = s;
        applyTheme(s.theme);
      })
      .catch(console.error);

    // Listen for setting changes to update theme in real-time
    const unlistenSettings = listen<Settings>('settings-changed', (event) => {
      settingsRef.current = event.payload;
      applyTheme(event.payload.theme);
    });

    // Listen for content updates if window is already open
    const unlistenUpdate = listen<string>('update-viewer-clip', (event) => {
      loadClip(event.payload);
      appWindow
        .show()
        .then(() => {
          appWindow.setFocus().catch(() => {});
        })
        .catch(() => {});
    });

    // Persistence logic
    const persistWindow = debounce(async () => {
      // Don't persist if maximized as those dimensions are temporary
      if (await appWindow.isMaximized()) return;

      const currentSettings = settingsRef.current;
      if (!currentSettings) return;

      try {
        const size = await appWindow.innerSize();
        const pos = await appWindow.innerPosition();
        const factor = await appWindow.scaleFactor();

        const logicalSize = size.toLogical(factor);
        const logicalPos = pos.toLogical(factor);

        // Only save if dimensions are sane and changed
        if (logicalSize.width > 100 && logicalSize.height > 100) {
          invoke('save_settings', {
            settings: {
              ...currentSettings,
              viewer_window_width: logicalSize.width,
              viewer_window_height: logicalSize.height,
              viewer_window_x: logicalPos.x,
              viewer_window_y: logicalPos.y,
            },
          }).catch(() => {}); // Silent catch to prevent console flood
        }
      } catch (e) {
        // Window might have closed during debounce
      }
    }, 1000);

    const unlistenResize = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
      persistWindow();
    });
    const unlistenMoved = appWindow.onMoved(() => persistWindow());

    return () => {
      unlistenSettings.then((f) => f());
      unlistenUpdate.then((f) => f());
      unlistenResize.then((f) => f());
      unlistenMoved.then((f) => f());
    };
  }, [loadClip]); // Removed appWindow from deps as it's stable and avoids unnecessary effect resets

  const handleClose = () => {
    appWindow.close();
  };

  const handleMinimize = () => {
    appWindow.minimize();
  };

  const handleMaximize = () => {
    appWindow.toggleMaximize();
  };

  const handleEdit = () => {
    const currentSettings = settingsRef.current;
    if (clip && currentSettings?.image_editor_path) {
      const path = clip.image_path;

      if (!path) {
        console.warn('Cannot edit: No file path available for this image yet.');
        return;
      }

      // Close viewer IMMEDIATELY so we don't block the editor window or OS prompts
      appWindow.close().then(() => {
        invoke('open_with', {
          appPath: currentSettings.image_editor_path,
          filePath: path,
        }).catch((err) => {
          console.error('Failed to open editor after closing viewer:', err);
        });
      });
    }
  };

  const handleCopy = () => {
    if (clip) {
      invoke('paste_clip', { id: clip.id }).catch(console.error);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  if (loading && !clip) {
    return (
      <div className="flex h-screen w-screen animate-pulse items-center justify-center bg-zinc-950 font-mono text-[#00F2FF]">
        LOADING_IMAGE_SYSTEM...
      </div>
    );
  }

  if (!clip) {
    return (
      <div className="flex h-screen w-screen items-center justify-center border border-[#FF00D0]/30 bg-zinc-950 font-mono text-[#FF00D0]">
        ERROR::CLIP_NOT_FOUND
      </div>
    );
  }

  const fileName = clip.image_path
    ? clip.image_path.split(/[\\/]/).pop()
    : clip.metadata
      ? (() => {
          try {
            const m = JSON.parse(clip.metadata);
            return m.file_name || 'ClipboardImage.png';
          } catch {
            return 'ClipboardImage.png';
          }
        })()
      : 'ClipboardImage.png';

  const friendlyDate = formatDistanceToNow(new Date(clip.created_at), { addSuffix: true });

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden rounded-lg border border-[#7A00FF]/30 bg-zinc-950/95 shadow-2xl"
      onContextMenu={handleContextMenu}
    >
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          options={[
            {
              label: fitToWindow
                ? t('viewer.originalSize', 'Original Size')
                : t('viewer.fitToWindow', 'Fit to Window'),
              onClick: () => setFitToWindow(!fitToWindow),
            },
            {
              label: t('common.edit', 'Edit'),
              onClick: handleEdit,
            },
            {
              label: t('common.copy', 'Copy to Clipboard'),
              onClick: handleCopy,
            },
            {
              label: t('common.close', 'Close'),
              onClick: handleClose,
              danger: true,
            },
          ]}
        />
      )}
      {/* Header */}
      <div
        className="z-10 flex items-center justify-between border-b border-white/5 bg-zinc-900/90 px-4 py-2"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-3" data-tauri-drag-region>
          <div className="h-2.5 w-2.5 rounded-full bg-[#00F2FF] shadow-[0_0_8px_#00F2FF]" />

          <div className="flex items-center" data-tauri-drag-region>
            <span
              className="mr-1.5 text-sm font-bold tracking-tight text-white/90"
              data-tauri-drag-region
            >
              CyberPaste
            </span>
            <span
              className="rounded-sm border border-indigo-400/20 bg-indigo-400/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-indigo-400/80"
              data-tauri-drag-region
            >
              Viewer
            </span>

            <span className="mx-3 text-sm text-zinc-600" data-tauri-drag-region>
              //
            </span>

            <div
              className="flex items-center gap-0 font-mono text-[11px] font-medium"
              data-tauri-drag-region
            >
              <span className="text-cyan-400/80" data-tauri-drag-region>
                {fileName}
              </span>
              <span className="mx-2 text-zinc-700" data-tauri-drag-region>
                |
              </span>
              <span className="text-indigo-400/80" data-tauri-drag-region>
                {friendlyDate}
              </span>
              <span className="mx-2 text-zinc-700" data-tauri-drag-region>
                |
              </span>
              <span className="text-zinc-400" data-tauri-drag-region>
                ID: {clip.id.substring(0, 8)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Group 1: Image Actions */}
          <div className="flex items-center gap-0.5 rounded-lg border border-white/5 bg-white/5 p-0.5">
            <button
              onClick={() => setFitToWindow(!fitToWindow)}
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-cyan-400"
              title={fitToWindow ? 'Original Size' : 'Fit to Window'}
            >
              {fitToWindow ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button
              onClick={handleEdit}
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-indigo-400"
              title="Edit"
            >
              <Edit size={15} />
            </button>

            <button
              onClick={handleCopy}
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-emerald-400"
              title="Copy to Clipboard"
            >
              <Clipboard size={15} />
            </button>
          </div>

          {/* Group 2: Window Controls */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleMinimize}
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              title="Minimize"
            >
              <Minus size={16} />
            </button>

            <button
              onClick={handleMaximize}
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-cyan-400"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize size={16} />}
            </button>

            <button
              onClick={handleClose}
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-rose-400"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex flex-1 items-center justify-center overflow-auto bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950 p-4">
        {/* Subtle grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(#fff 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        <img
          src={`data:image/png;base64,${clip.content}`}
          alt=""
          className={`shadow-2xl transition-all duration-500 ease-out ${fitToWindow ? 'max-h-full max-w-full object-contain' : 'min-h-fit min-w-fit cursor-move'}`}
          style={{
            filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.8))',
          }}
        />
      </div>

      {/* Footer Accent */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#7A00FF]/50 to-transparent" />
    </div>
  );
}
