import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export function useClipboardMonitoring() {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let unlistenPause: (() => void) | undefined;
    let unlistenState: (() => void) | undefined;

    invoke<boolean>('is_clipboard_monitoring_paused')
      .then((paused) => setIsPaused(Boolean(paused)))
      .catch(console.error);

    listen<boolean>('clipboard-pause-changed', (event) => {
      setIsPaused(Boolean(event.payload));
    }).then((un) => {
      unlistenPause = un;
    });

    listen<boolean>('clipboard-monitoring-state-changed', (event) => {
      setIsPaused(Boolean(event.payload));
    }).then((un) => {
      unlistenState = un;
    });

    return () => {
      unlistenPause?.();
      unlistenState?.();
    };
  }, []);

  const toggleMonitoring = useCallback(async () => {
    try {
      const next = await invoke<boolean>('toggle_clipboard_monitoring');
      setIsPaused(Boolean(next));
      return next;
    } catch (e) {
      console.error('Failed to toggle clipboard monitoring:', e);
      return false;
    }
  }, []);

  return { isPaused, toggleMonitoring };
}
