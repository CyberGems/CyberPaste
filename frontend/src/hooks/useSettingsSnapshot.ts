import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Settings } from '../types';

export function useSettingsSnapshot() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let active = true;
    let receivedChange = false;
    const unsubscribe = listen<Settings>('settings-changed', ({ payload }) => {
      if (!active) return;
      receivedChange = true;
      setSettings(payload);
    });
    void unsubscribe
      .then(() => invoke<Settings>('get_settings'))
      .then((snapshot) => {
        if (active && !receivedChange) setSettings(snapshot);
      })
      .catch(console.error);

    return () => {
      active = false;
      void unsubscribe.then((stop) => stop()).catch(console.error);
    };
  }, []);

  return settings;
}
