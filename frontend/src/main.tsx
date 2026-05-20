import ReactDOM from 'react-dom/client';
import App from './App';
import { SettingsWindow } from './windows/SettingsWindow';
import { ToastWindow } from './windows/ToastWindow';
import { ImageViewerWindow } from './windows/ImageViewerWindow';
import { attachConsole } from '@tauri-apps/plugin-log';
import './i18n/config'; // Initialize i18n
import './index.css';

import { getCurrentWindow } from '@tauri-apps/api/window';

attachConsole()
  .then(() => console.log('[WinPaste] Tauri console attached successfully'))
  .catch((err) => console.error('[WinPaste] Failed to attach Tauri console:', err));

const windowLabel = getCurrentWindow().label;

ReactDOM.createRoot(document.getElementById('root')!).render(
  windowLabel === 'settings' ? (
    <SettingsWindow />
  ) : windowLabel === 'toast' ? (
    <ToastWindow />
  ) : windowLabel === 'image_viewer' ? (
    <ImageViewerWindow />
  ) : (
    <App />
  )
);
