import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Settings } from '../types';
import { SettingsPanel } from '../components/SettingsPanel';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';



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
      if (!(await win.isMaximized()) && !(await win.isMinimized())) {
        const size = await win.innerSize();
        const pos = await win.innerPosition();
        const factor = await win.scaleFactor();

        const logicalSize = size.toLogical(factor);
        const logicalPos = pos.toLogical(factor);

        if (logicalSize.width > 100 && logicalSize.height > 100) {
          const currentSettings = settingsRef.current;
          if (currentSettings) {
            await invoke('save_settings', {
              settings: {
                ...currentSettings,
                settings_window_width: logicalSize.width,
                settings_window_height: logicalSize.height,
                settings_window_x: logicalPos.x,
                settings_window_y: logicalPos.y,
              },
            });
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
    return <div className="flex h-screen items-center justify-center bg-background text-foreground">Loading...</div>;
  }

  return (
    <div className="settings-window h-screen">
      <div className="h-full overflow-hidden bg-background text-foreground">
        <SettingsPanel settings={settings} onClose={handleClose} />
      </div>
    </div>
  );
}
