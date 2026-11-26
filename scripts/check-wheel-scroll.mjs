import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
let dataDir;
let cdpUrl = 'http://127.0.0.1:9227';

for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--data-dir' && args[i + 1]) dataDir = args[++i];
  else if (args[i] === '--cdp' && args[i + 1]) cdpUrl = args[++i];
  else if (args[i] === '--help') {
    console.log(
      'Usage: node scripts/check-wheel-scroll.mjs --data-dir <isolated-qa-data> [--cdp <url>]'
    );
    process.exit(0);
  } else {
    throw new Error(`Unknown or incomplete argument: ${args[i]}`);
  }
}

if (!dataDir) {
  throw new Error(
    '--data-dir is required; real CyberPaste data must never be used for this check.'
  );
}

const qaData = fs.realpathSync.native(path.resolve(dataDir));
if (!fs.existsSync(path.join(qaData, 'cyber_paste.db'))) {
  throw new Error(`No CyberPaste database found in ${qaData}`);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function samePath(a, b) {
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    };
    socket.onclose = () => {
      for (const request of this.pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error('CDP connection closed'));
      }
      this.pending.clear();
    };
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = () => reject(new Error(`Cannot connect to ${url}`));
    });
    return new Cdp(socket);
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 15000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, awaitPromise = false) {
    const response = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || 'Page evaluation failed');
    }
    return response.result.value;
  }

  close() {
    this.socket.close();
  }
}

async function waitFor(read, description, timeout = 8000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await read();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await delay(50);
  }
  throw new Error(
    `Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`
  );
}

const endpoint = new URL('/json/list', cdpUrl);
const targets = await (await fetch(endpoint)).json();
const mainTarget = targets.find((target) => {
  if (target.type !== 'page') return false;
  const url = new URL(target.url);
  return (
    (url.pathname === '/' || url.pathname === '/index.html') &&
    url.search === '' &&
    target.title.includes('CyberPaste')
  );
});
assert(mainTarget, 'CyberPaste main window was not found in the CDP target list.');

const cdp = await Cdp.connect(mainTarget.webSocketDebuggerUrl);
const createdPrefix = `Wheel QA ${Date.now().toString(36)}`;
let originalSettings;
let cleanupError;

async function invoke(command, argsValue = {}) {
  const result = await cdp.evaluate(
    `window.__TAURI_INTERNALS__.invoke(${JSON.stringify(command)}, ${JSON.stringify(argsValue)})
      .then(value => ({ ok: true, value }), error => ({ ok: false, error: String(error) }))`,
    true
  );
  assert(result?.ok, `${command} failed: ${result?.error || 'missing Tauri bridge'}`);
  return result.value;
}

async function assertIsolated() {
  const activeData = await invoke('get_data_dir_path');
  const resolved = fs.realpathSync.native(activeData);
  assert(
    samePath(resolved, qaData),
    `Refusing to modify active data ${resolved}; expected isolated profile ${qaData}.`
  );
  const settings = await invoke('get_settings');
  assert(
    settings.startup_with_windows === false,
    'Refusing to run with Windows autostart enabled.'
  );
  return settings;
}

async function saveSettings(patch) {
  const current = await assertIsolated();
  await invoke('save_settings', {
    settings: { ...current, ...patch, startup_with_windows: false },
  });
  const saved = await invoke('get_settings');
  for (const [key, value] of Object.entries(patch)) {
    assert(saved[key] === value, `Setting ${key} did not persist.`);
  }
}

async function createFolders() {
  for (let i = 1; i <= 30; i += 1) {
    const name = `${createdPrefix} ${String(i).padStart(2, '0')}`;
    await invoke('create_folder', { name, icon: null, color: null });
  }
}

async function deleteQaFolders() {
  await assertIsolated();
  const folders = await invoke('get_folders');
  for (const folder of folders) {
    if (!folder.is_system && folder.name.startsWith(`${createdPrefix} `)) {
      await invoke('delete_folder', { id: String(folder.id) });
    }
  }
}

async function setView(viewMode, compactFolderLayout) {
  await saveSettings({
    view_mode: viewMode,
    compact_folder_layout: compactFolderLayout,
    compact_sidebar_collapsed: false,
    wheel_folder_navigation: false,
    hide_on_blur: false,
    pinned: true,
    theme: 'dark',
    language: 'en',
  });
  const axis =
    viewMode === 'full' || compactFolderLayout === 'horizontal' ? 'horizontal' : 'vertical';
  const selector = `[data-folder-container="${axis}"]`;
  await waitFor(async () => {
    const state = await cdp.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const max = ${axis === 'horizontal' ? 'el.scrollWidth - el.clientWidth' : 'el.scrollHeight - el.clientHeight'};
      return { max, count: el.querySelectorAll('[data-folder-id]').length };
    })()`);
    return state && state.count >= 31 && state.max >= 240 ? state : null;
  }, `${viewMode} ${axis} folder overflow`);
  return { selector, axis };
}

async function resetStrip(selector, axis) {
  const property = axis === 'horizontal' ? 'scrollLeft' : 'scrollTop';
  await cdp.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) throw new Error('Folder strip disappeared');
    el.scrollTo({ ${axis === 'horizontal' ? 'left' : 'top'}: 0, behavior: 'instant' });
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    // Pointer down clears the smooth controller's pending target between cases.
    window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    window.dispatchEvent(new CustomEvent('cyberpaste:hide-all-tooltips'));
  })()`);
  await waitFor(
    () => cdp.evaluate(`document.querySelector(${JSON.stringify(selector)})?.${property} === 0`),
    'folder strip reset'
  );
  await delay(120);
}

async function scrollMetrics(selector, axis) {
  return cdp.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const property = ${JSON.stringify(axis === 'horizontal' ? 'scrollLeft' : 'scrollTop')};
    return {
      current: el[property],
      max: ${axis === 'horizontal' ? 'el.scrollWidth - el.clientWidth' : 'el.scrollHeight - el.clientHeight'},
      pageSize: ${axis === 'horizontal' ? 'el.clientWidth' : 'el.clientHeight'},
    };
  })()`);
}

async function beginScrollSampling(selector, axis) {
  await cdp.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) throw new Error('Folder strip disappeared');
    const property = ${JSON.stringify(axis === 'horizontal' ? 'scrollLeft' : 'scrollTop')};
    window.__cyberpasteWheelQa = { started: performance.now(), positions: [], hover: [] };
    const sample = now => {
      const state = window.__cyberpasteWheelQa;
      const tabs = [...el.querySelectorAll('[data-folder-id]')];
      const observation = {
        time: now - state.started,
        value: el[property],
        tooltips: document.querySelectorAll('.premium-tooltip').length,
        tooltipTabs: tabs.filter(tab => tab.hasAttribute('data-has-tooltip')).length,
        hoverTabs: tabs.filter(tab => tab.getAttribute('data-selected') !== 'true' && /(?:^|\\s)hover:bg-accent(?:\\s|$)/.test(tab.className)).length,
      };
      state.positions.push({ time: observation.time, value: observation.value });
      state.hover.push(observation);
      if (now - state.started < 4000) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  })()`);
}

async function dispatchWheel(selector, target, delta, deltaMode) {
  if (deltaMode === 0) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: target.x,
      y: target.y,
      deltaX: 0,
      deltaY: delta,
    });
    return;
  }
  await cdp.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) throw new Error('Folder strip disappeared');
    el.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: ${delta},
      deltaMode: ${deltaMode},
    }));
  })()`);
}

async function visibleTooltipTarget(selector) {
  return waitFor(async () => {
    const target = await cdp.evaluate(`(() => {
      const container = document.querySelector(${JSON.stringify(selector)});
      const bounds = container?.getBoundingClientRect();
      if (!bounds) return null;
      for (const tab of container.querySelectorAll('[data-folder-id][data-has-tooltip="true"]')) {
        const rect = tab.getBoundingClientRect();
        if (
          rect.width > 0 &&
          rect.left >= bounds.left - 1 &&
          rect.right <= bounds.right + 1 &&
          rect.top >= bounds.top - 1 &&
          rect.bottom <= bounds.bottom + 1
        ) {
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
      }
      return null;
    })()`);
    return target || null;
  }, 'visible folder tooltip target');
}

async function mouseMove(x, y) {
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x,
    y,
    button: 'none',
    buttons: 0,
  });
}

async function showRestoredTooltip(selector) {
  await mouseMove(2, 2);
  await delay(60);
  const target = await visibleTooltipTarget(selector);
  await mouseMove(target.x, target.y);
  await waitFor(
    () => cdp.evaluate(`document.querySelectorAll('.premium-tooltip').length > 0`),
    'tooltip restoration after scrolling'
  );
}

async function hoverState(selector) {
  return cdp.evaluate(`(() => {
    const tabs = [...document.querySelectorAll(${JSON.stringify(`${selector} [data-folder-id]`)})];
    return {
      tooltips: document.querySelectorAll('.premium-tooltip').length,
      tooltipTabs: tabs.filter(tab => tab.hasAttribute('data-has-tooltip')).length,
      hoverTabs: tabs.filter(tab => tab.getAttribute('data-selected') !== 'true' && /(?:^|\\s)hover:bg-accent(?:\\s|$)/.test(tab.className)).length,
    };
  })()`);
}

async function runCase(
  label,
  selector,
  axis,
  { delta, multiplier = 1, deltaMode = 0, startAtMax = false }
) {
  await resetStrip(selector, axis);
  const target = await visibleTooltipTarget(selector);
  await mouseMove(target.x, target.y);
  await waitFor(
    () => cdp.evaluate(`document.querySelectorAll('.premium-tooltip').length > 0`),
    `${label} tooltip before wheel`
  );

  const metrics = await scrollMetrics(selector, axis);
  const unit = deltaMode === 1 ? 16 : deltaMode === 2 ? metrics.pageSize : 1;
  const start = startAtMax ? metrics.max : 0;
  const expected = Math.max(0, Math.min(metrics.max, start + delta * unit * multiplier));
  if (startAtMax) {
    await cdp.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      el.scrollTo({ ${axis === 'horizontal' ? 'left' : 'top'}: ${metrics.max}, behavior: 'instant' });
    })()`);
    await waitFor(
      async () => Math.abs((await scrollMetrics(selector, axis)).current - metrics.max) <= 1,
      `${label} maximum scroll position`
    );
  }

  await beginScrollSampling(selector, axis);
  const wheelDeltas = [delta / 2, delta / 2];
  await delay(32);
  await dispatchWheel(selector, target, wheelDeltas[0], deltaMode);
  await delay(64);
  const firstWheelPosition = (await scrollMetrics(selector, axis)).current;
  assert(
    firstWheelPosition > Math.min(start, expected) &&
      firstWheelPosition < Math.max(start, expected),
    `${label}: the first wheel event did not start a partial smooth scroll.`
  );
  await dispatchWheel(selector, target, wheelDeltas[1], deltaMode);

  await waitFor(
    async () => Math.abs((await scrollMetrics(selector, axis)).current - expected) <= 1,
    `${label} scroll settlement`,
    4000
  );
  await delay(420);
  const result = await cdp.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    const samples = window.__cyberpasteWheelQa;
    delete window.__cyberpasteWheelQa;
    const property = ${JSON.stringify(axis === 'horizontal' ? 'scrollLeft' : 'scrollTop')};
    return { current: el[property], max: el.${axis === 'horizontal' ? 'scrollWidth - el.clientWidth' : 'scrollHeight - el.clientHeight'}, ...samples };
  })()`);
  assert(
    Math.abs(result.current - expected) <= 2,
    `${label}: expected ${expected}px, received ${result.current}px.`
  );
  assert(
    result.positions.every((sample) => sample.value >= -2 && sample.value <= result.max + 2),
    `${label}: scrolling escaped the container bounds.`
  );
  const lower = Math.min(start, expected);
  const upper = Math.max(start, expected);
  const intermediate = result.positions.filter(
    (sample) => sample.value > lower + 1 && sample.value < upper - 1
  );
  assert(intermediate.length >= 2, `${label}: smooth scrolling had no intermediate frames.`);
  const movingSamples = result.hover
    .slice(1)
    .filter((sample, index) => Math.abs(sample.value - result.hover[index].value) > 0.25);
  assert(movingSamples.length >= 2, `${label}: no moving frames were sampled.`);
  const lastMoving = movingSamples.at(-1);
  assert(
    lastMoving.tooltips === 0 && lastMoving.tooltipTabs === 0 && lastMoving.hoverTabs === 0,
    `${label}: hover was not suppressed while the scroll position was still changing.`
  );

  const settled = await hoverState(selector);
  assert(settled.tooltipTabs > 0, `${label}: tooltip anchors did not recover after settling.`);
  assert(settled.hoverTabs > 0, `${label}: folder hover classes did not recover after settling.`);
  await showRestoredTooltip(selector);
  const mode = ['pixels', 'lines', 'pages'][deltaMode];
  console.log(
    `PASS ${label}: ${result.current}px from ${wheelDeltas.join('+')} ${mode}, ${intermediate.length} intermediate frames, hover suppressed during motion and restored`
  );
  await cdp.evaluate(`window.dispatchEvent(new CustomEvent('cyberpaste:hide-all-tooltips'))`);
}

try {
  await cdp.send('Runtime.enable');
  originalSettings = await assertIsolated();
  const paused = await invoke('is_clipboard_monitoring_paused');
  if (!paused)
    assert(
      (await invoke('toggle_clipboard_monitoring')) === true,
      'Could not pause clipboard monitoring.'
    );
  assert(
    (await invoke('is_clipboard_monitoring_paused')) === true,
    'Clipboard monitoring must stay paused.'
  );

  await saveSettings({
    view_mode: 'full',
    compact_folder_layout: 'horizontal',
    wheel_folder_navigation: false,
    hide_on_blur: false,
    pinned: true,
    theme: 'dark',
    language: 'en',
  });
  await createFolders();

  const full = await setView('full', 'horizontal');
  await runCase('Full horizontal', full.selector, full.axis, { delta: 240 });
  await runCase('Full horizontal line units', full.selector, full.axis, {
    delta: 10,
    deltaMode: 1,
  });
  await runCase('Full horizontal page units', full.selector, full.axis, {
    delta: 0.35,
    deltaMode: 2,
  });
  const fullMetrics = await scrollMetrics(full.selector, full.axis);
  await runCase('Full horizontal upper clamp', full.selector, full.axis, {
    delta: fullMetrics.max * 2,
  });
  await runCase('Full horizontal lower clamp', full.selector, full.axis, {
    delta: -fullMetrics.max * 2,
    startAtMax: true,
  });

  const compactHorizontal = await setView('compact', 'horizontal');
  await runCase('Compact horizontal 1.5x', compactHorizontal.selector, compactHorizontal.axis, {
    delta: 160,
    multiplier: 1.5,
  });

  const compactVertical = await setView('compact', 'vertical');
  await runCase('Compact vertical', compactVertical.selector, compactVertical.axis, { delta: 160 });
  await runCase('Compact vertical line units', compactVertical.selector, compactVertical.axis, {
    delta: 10,
    deltaMode: 1,
  });
  await runCase('Compact vertical page units', compactVertical.selector, compactVertical.axis, {
    delta: 0.35,
    deltaMode: 2,
  });

  console.log('WHEEL CDP PASS');
} catch (error) {
  console.error(`WHEEL CDP FAIL: ${error.message}`);
  process.exitCode = 1;
} finally {
  try {
    await cdp.evaluate(`delete window.__cyberpasteWheelQa;
      window.dispatchEvent(new CustomEvent('cyberpaste:hide-all-tooltips'));`);
    await deleteQaFolders();
    if (originalSettings) {
      await assertIsolated();
      await invoke('save_settings', { settings: originalSettings });
    }
  } catch (error) {
    cleanupError = error;
    console.error(`Cleanup failed: ${error.message}`);
  }
  cdp.close();
  if (cleanupError) process.exitCode = 1;
}
