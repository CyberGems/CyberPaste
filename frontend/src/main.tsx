import ReactDOM from 'react-dom/client';
import App from './App';
import { SettingsWindow } from './windows/SettingsWindow';
import { AboutWindow } from './windows/AboutWindow';
import { ToastWindow } from './windows/ToastWindow';
import { ImageViewerWindow } from './windows/ImageViewerWindow';
import { TrayMenuWindow } from './windows/TrayMenuWindow';
import { TrayPinTipWindow } from './windows/TrayPinTipWindow';
import { attachConsole } from '@tauri-apps/plugin-log';
import './i18n/config'; // Initialize i18n
import './index.css';

import { getCurrentWindow } from '@tauri-apps/api/window';

attachConsole()
  .then(() => console.log('[CyberPaste] Tauri console attached successfully'))
  .catch((err) => console.error('[CyberPaste] Failed to attach Tauri console:', err));

const windowLabel = getCurrentWindow().label;

// Mark the viewer surface before the first render so the document paints the
// themed background instead of a transparent page over the native surface.
if (windowLabel === 'image_viewer') {
  document.documentElement.classList.add('viewer-window');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  windowLabel === 'settings' ? (
    <SettingsWindow />
  ) : windowLabel === 'about' ? (
    <AboutWindow />
  ) : windowLabel === 'toast' ? (
    <ToastWindow />
  ) : windowLabel === 'image_viewer' ? (
    <ImageViewerWindow />
  ) : windowLabel === 'tray_menu' ? (
    <TrayMenuWindow />
  ) : windowLabel === 'tray_pin_tip' ? (
    <TrayPinTipWindow />
  ) : (
    <App />
  )
);
