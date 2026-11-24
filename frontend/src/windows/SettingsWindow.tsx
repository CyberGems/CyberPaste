import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsSnapshot } from '../hooks/useSettingsSnapshot';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Settings } from '../types';
import { SettingsPanel } from '../components/SettingsPanel';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';

import { Toaster } from 'sonner';

export function SettingsWindow() {
  const settings = useSettingsSnapshot();
  const settingsRef = useRef<Settings | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let disposed = false;
    let unlistenResize: (() => void) | null = null;
    const win = getCurrentWindow();
    const updateMaximizedState = () => {
      win.isMaximized().then(setIsMaximized).catch(console.error);
    };

    updateMaximizedState();
    win
      .onResized(updateMaximizedState)
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }
        unlistenResize = unlisten;
      })
      .catch(console.error);

    return () => {
      disposed = true;
      unlistenResize?.();
    };
  }, []);

  useLanguage(settings?.language);
  useTheme(settings?.theme ?? 'cyberpaste');

  const settingsReady = settings !== null;
  useEffect(() => {
    if (settingsReady) {
      // Small timeout to allow the DOM to render with the new theme classes before showing
      const timer = setTimeout(() => {
        const win = getCurrentWindow();
        win
          .show()
          .then(() => {
            win.setFocus().catch(console.error);
          })
          .catch(console.error);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [settingsReady]);

  const handleClose = async () => {
    const win = getCurrentWindow();
    try {
      if (!(await win.isMaximized()) && !(await win.isMinimized())) {
        const size = await win.innerSize();
        const pos = await win.innerPosition();
        const factor = await win.scaleFactor();

        const logicalSize = size.toLogical(factor);
        const logicalPos = pos.toLogical(factor);

        if (logicalSize.width > 100 && logicalSize.height > 100) {
          try {
            const currentSettings = await invoke<Settings>('get_settings');
            await invoke('save_settings', {
              settings: {
                ...currentSettings,
                settings_window_width: logicalSize.width,
                settings_window_height: logicalSize.height,
                settings_window_x: logicalPos.x,
                settings_window_y: logicalPos.y,
              },
            });
          } catch (e2) {
            const fallback = settingsRef.current;
            if (fallback) {
              await invoke('save_settings', {
                settings: {
                  ...fallback,
                  settings_window_width: logicalSize.width,
                  settings_window_height: logicalSize.height,
                  settings_window_x: logicalPos.x,
                  settings_window_y: logicalPos.y,
                },
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to save settings window size/position:', e);
    }

    try {
      await win.close();
    } catch (e) {
      console.error('Failed to close settings window:', e);
    }
  };

  if (!settings) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div
      className="settings-window h-screen"
      style={
        isMaximized
          ? undefined
          : { border: '1px solid var(--window-border-color, rgba(var(--primary-rgb), 0.25))' }
      }
    >
      <div className="h-full overflow-hidden bg-background text-foreground">
        <SettingsPanel settings={settings} onClose={handleClose} />
      </div>
      <Toaster
        position="bottom-center"
        richColors
        closeButton
        visibleToasts={1}
        duration={2500}
        theme={settings?.theme === 'light' ? 'light' : 'dark'}
      />
    </div>
  );
}
