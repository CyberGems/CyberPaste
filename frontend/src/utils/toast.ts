import { invoke } from '@tauri-apps/api/core';

export const systemToast = {
  success: (message: string, _options?: any) => {
    invoke('show_toast', {
      message,
      toastType: 'success',
      clipType: null,
      imagePreview: null,
    }).catch(console.error);
  },
  error: (message: string, _options?: any) => {
    invoke('show_toast', { message, toastType: 'error', clipType: null, imagePreview: null }).catch(
      console.error
    );
  },
  info: (message: string, _options?: any) => {
    invoke('show_toast', { message, toastType: 'info', clipType: null, imagePreview: null }).catch(
      console.error
    );
  },
  loading: (message: string, _options?: any) => {
    invoke('show_toast', { message, toastType: 'info', clipType: null, imagePreview: null }).catch(
      console.error
    );
    return message; // return id
  },
  dismiss: (_id?: string | number) => {
    invoke('hide_toast').catch(console.error);
  },
};
