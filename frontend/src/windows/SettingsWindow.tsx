import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Settings } from '../types';
import { SettingsPanel } from '../components/SettingsPanel';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeoutId: any;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function SettingsWindow() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const settingsRef = useRef<Settings | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useLanguage(settings?.language);
  useTheme(settings?.theme ?? 'cyberpaste');

  useEffect(() => {
    invoke<Settings>('get_settings').then(setSettings).catch(console.error);
  }, []);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    const persistWindow = debounce(async () => {
      if (await appWindow.isMaximized()) return;

      const currentSettings = settingsRef.current;
      if (!currentSettings) return;

      try {
        const size = await appWindow.innerSize();
        const pos = await appWindow.innerPosition();
        const factor = await appWindow.scaleFactor();

        const logicalSize = size.toLogical(factor);
        const logicalPos = pos.toLogical(factor);

        if (logicalSize.width > 100 && logicalSize.height > 100) {
          invoke('save_settings', {
            settings: {
              ...currentSettings,
              settings_window_width: logicalSize.width,
              settings_window_height: logicalSize.height,
              settings_window_x: logicalPos.x,
              settings_window_y: logicalPos.y,
            },
          }).catch(() => {});
        }
      } catch {
        // Window might have closed during debounce
      }
    }, 1000);

    const unlistenResize = appWindow.onResized(() => {
      persistWindow();
    });
    const unlistenMoved = appWindow.onMoved(() => {
      persistWindow();
    });

    return () => {
      unlistenResize.then((f) => f());
      unlistenMoved.then((f) => f());
    };
  }, []);

  useEffect(() => {
    if (settings) {
      // Small timeout to allow the DOM to render with the new theme classes before showing
      const timer = setTimeout(() => {
        const win = getCurrentWindow();
        win.show().then(() => {
          win.setFocus().catch(console.error);
        }).catch(console.error);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [settings]);

  const handleClose = async () => {
    const win = getCurrentWindow();
    try {
      await win.close();
    } catch (e) {
      console.error('Failed to close settings window:', e);
    }
  };

  if (!settings) {
    return <div className="flex h-screen items-center justify-center bg-background text-foreground">Loading...</div>;
  }

  return (
    <div className="h-screen">
      <div className="h-full overflow-hidden bg-background text-foreground">
        <SettingsPanel settings={settings} onClose={handleClose} />
      </div>
    </div>
  );
}
