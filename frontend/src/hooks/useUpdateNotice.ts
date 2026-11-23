import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { IS_PORTABLE_BUILD } from '../utils/build';
import { MOCK_UPDATE_PREVIEW } from '../utils/mockUpdate';
import { isSkippedUpdateVersion, type UpdatePhase, type UpdateStatus } from '../utils/updater';

const updatePreview: UpdateStatus = {
  ...MOCK_UPDATE_PREVIEW,
  releaseNotes: MOCK_UPDATE_PREVIEW.body,
  state: 'available',
  transferred: 0,
  manual: true,
  dismissed: false,
  openRequest: 1,
  failed: false,
  cancelling: false,
};

export function useUpdateNotice(automatic: boolean, skipped: string | undefined | null) {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [preview, setPreview] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    if (IS_PORTABLE_BUILD) return;
    let active = true;
    let received = false;
    const subscription = listen<UpdateStatus | null>('update:status', (event) => {
      if (!active) return;
      received = true;
      setStatus(event.payload);
    });
    void subscription
      .then(async () => {
        const snapshot = await invoke<UpdateStatus | null>('get_update_status');
        if (active && !received) setStatus(snapshot);
      })
      .catch(console.error);
    return () => {
      active = false;
      void subscription.then((stop) => stop()).catch(console.error);
    };
  }, []);

  const togglePreview = useCallback(() => {
    setPreview((previous) => (previous ? null : updatePreview));
  }, []);

  useEffect(() => {
    const controls = window as Window & { __CYBERPASTE_TOGGLE_UPDATE_PREVIEW__?: () => void };
    controls.__CYBERPASTE_TOGGLE_UPDATE_PREVIEW__ = togglePreview;
    window.addEventListener('cyberpaste:toggle-update-preview', togglePreview);
    return () => {
      delete controls.__CYBERPASTE_TOGGLE_UPDATE_PREVIEW__;
      window.removeEventListener('cyberpaste:toggle-update-preview', togglePreview);
    };
  }, [togglePreview]);

  const previewPhase = preview?.state;
  useEffect(() => {
    if (previewPhase !== 'downloading') return;
    const timer = setInterval(() => {
      setPreview((current) => {
        if (!current || current.state !== 'downloading') return current;
        const transferred = current.transferred + 4_000_000;
        const complete = transferred >= 32_000_000;
        return {
          ...current,
          transferred,
          state: complete ? 'downloaded' : 'downloading',
          dismissed: !complete && current.dismissed,
        };
      });
    }, 250);
    return () => clearInterval(timer);
  }, [previewPhase]);

  const isPreview = Boolean(preview);
  const pending =
    preview ??
    (status &&
    (status.state !== 'available' ||
      status.manual ||
      (automatic && !isSkippedUpdateVersion(status.version, skipped)))
      ? status
      : null);

  const open = useCallback(async () => {
    if (isPreview) {
      setPreview(
        (current) =>
          current && { ...current, dismissed: false, openRequest: current.openRequest + 1 }
      );
    } else {
      await invoke('open_update_notice');
    }
  }, [isPreview]);

  const dismiss = async (version: string, phase: UpdatePhase) => {
    if (isPreview) setPreview((current) => current && { ...current, dismissed: true });
    else await invoke('dismiss_update_notice', { version, phase });
  };

  const skip = async (version: string) => {
    if (isPreview) setPreview(null);
    else await invoke('skip_update_version', { version });
  };

  const download = async (version: string) => {
    if (isPreview) setPreview({ ...updatePreview, state: 'downloading', total: 32_000_000 });
    else await invoke('download_update', { version });
  };

  const cancel = async (version: string) => {
    if (isPreview) setPreview(updatePreview);
    else await invoke('cancel_update_download', { version });
  };

  const install = useCallback(
    async (version: string) => {
      if (isPreview) setPreview(null);
      else await invoke('install_update', { version });
    },
    [isPreview]
  );

  return { pending, isPreview, open, dismiss, skip, download, cancel, install };
}
