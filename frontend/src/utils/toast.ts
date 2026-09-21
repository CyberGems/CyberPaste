// Toast helper derived from CyberSnap (originally OddSnap by jasperdevs), heavily rewritten for CyberPaste. GPL-3.0.
import { invoke } from '@tauri-apps/api/core';

interface ToastOptions {
  bypassQuietHours?: boolean;
  id?: string | number;
}

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
    return message; // return id
  },
  dismiss: (_id?: string | number) => {
    invoke('hide_toast').catch(console.error);
  },
};
