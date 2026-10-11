// Toast helper for CyberPaste. GPL-3.0.
import { toast as sonnerToast } from 'sonner';
import { invoke } from '@tauri-apps/api/core';

interface ToastOptions {
  bypassQuietHours?: boolean;
  id?: string | number;
  duration?: number;
  description?: string;
}

/**
 * In-app toast notification for UI actions, feedback, and errors inside the CyberPaste window.
 * Powered by Sonner to render cleanly within the app viewport instead of spawning OS windows.
 */
export const inAppToast = {
  success: (message: string, options?: ToastOptions) => {
    return sonnerToast.success(message, {
      id: options?.id,
      duration: options?.duration,
      description: options?.description,
    });
  },
  error: (message: string, options?: ToastOptions) => {
    return sonnerToast.error(message, {
      id: options?.id,
      duration: options?.duration,
      description: options?.description,
    });
  },
  duplicate: (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, {
      id: options?.id,
      duration: options?.duration,
      description: options?.description,
    });
  },
  warning: (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, {
      id: options?.id,
      duration: options?.duration,
      description: options?.description,
    });
  },
  info: (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, {
      id: options?.id,
      duration: options?.duration,
      description: options?.description,
    });
  },
  update: (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, {
      id: options?.id,
      duration: options?.duration,
      description: options?.description,
    });
  },
  loading: (message: string, options?: ToastOptions) => {
    return sonnerToast.loading(message, {
      id: options?.id,
      duration: options?.duration,
      description: options?.description,
    });
  },
  dismiss: (id?: string | number) => {
    sonnerToast.dismiss(id);
  },
};

/**
 * Default `toast` export for all in-window notifications.
 */
export const toast = inAppToast;

/**
 * Desktop / OS-level floating toast window (spawned via Tauri's show_toast).
 * Reserved strictly for system clipboard captures / copy actions across external applications.
 */
export const systemToast = {
  success: (message: string, options?: ToastOptions) => {
    invoke('show_toast', {
      message,
      toastType: 'success',
      clipType: null,
      imagePreview: null,
      bypassQuietHours: options?.bypassQuietHours ?? false,
    }).catch(console.error);
  },
  error: (message: string, options?: ToastOptions) => {
    invoke('show_toast', {
      message,
      toastType: 'error',
      clipType: null,
      imagePreview: null,
      bypassQuietHours: options?.bypassQuietHours ?? false,
    }).catch(console.error);
  },
  duplicate: (message: string, options?: ToastOptions) => {
    invoke('show_toast', {
      message,
      toastType: 'duplicate',
      clipType: null,
      imagePreview: null,
      bypassQuietHours: options?.bypassQuietHours ?? false,
    }).catch(console.error);
  },
  warning: (message: string, options?: ToastOptions) => {
    invoke('show_toast', {
      message,
      toastType: 'duplicate',
      clipType: null,
      imagePreview: null,
      bypassQuietHours: options?.bypassQuietHours ?? false,
    }).catch(console.error);
  },
  info: (message: string, options?: ToastOptions) => {
    invoke('show_toast', {
      message,
      toastType: 'info',
      clipType: null,
      imagePreview: null,
      bypassQuietHours: options?.bypassQuietHours ?? false,
    }).catch(console.error);
  },
  update: (message: string, options?: ToastOptions) => {
    invoke('show_toast', {
      message,
      toastType: 'update',
      clipType: null,
      imagePreview: null,
      bypassQuietHours: options?.bypassQuietHours ?? false,
    }).catch(console.error);
  },
  loading: (message: string, options?: ToastOptions) => {
    invoke('show_toast', {
      message,
      toastType: 'info',
      clipType: null,
      imagePreview: null,
      bypassQuietHours: options?.bypassQuietHours ?? false,
    }).catch(console.error);
    return message;
  },
  dismiss: (_id?: string | number) => {
    invoke('hide_toast').catch(console.error);
  },
};
