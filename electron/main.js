/*
 * Exhibition kiosk shell.
 *
 * Wraps the existing CRA build with zero changes to the games: the bundle is
 * served over a custom `app://kiosk/` scheme rather than `file://`, so the
 * absolute asset paths (`/ding.mp3`, `/wheel_game_card.png`, ...) and
 * BrowserRouter's pushState both keep working exactly as they do on the web.
 *
 * No network calls anywhere — the window only ever loads app://kiosk.
 */

const { app, BrowserWindow, Menu, protocol, ipcMain, net, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { saveScore } = require('./scoreFile');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const START_URL = 'app://kiosk/';

/*
 * Ctrl + Alt + Shift + Q quits.
 *
 * Deliberately Control and not Command: Cmd+Opt+Shift+Q is macOS's own "log out
 * immediately", and the OS claims it before any app sees the keystroke. Control
 * combos are unclaimed on macOS.
 *
 * Matched on `code`, not `key`: holding Option on a Mac turns the Q keystroke
 * into "œ", and the one way out of a kiosk must not depend on the layout.
 */
const isExitCombo = (input) =>
  input.control && input.alt && input.shift && input.code === 'KeyQ';

/*
 * Second way out, for when nobody can remember the combination: hold Escape
 * down for four seconds.
 *
 * A timer armed on key-down and disarmed on key-up, rather than counting
 * repeats — key auto-repeat can be turned off system-wide, and the one escape
 * hatch from a kiosk must not depend on a setting.
 *
 * Releasing Escape disarms it, so a visitor hammering the key never gets there.
 */
const HOLD_TO_EXIT_MS = 4000;
let holdTimer = null;

const disarmHold = () => {
  if (holdTimer) clearTimeout(holdTimer);
  holdTimer = null;
};

const trackHoldToExit = (input, quit) => {
  if (input.code !== 'Escape') return disarmHold();
  if (input.type === 'keyUp') return disarmHold();
  if (input.type === 'keyDown' && !holdTimer) holdTimer = setTimeout(quit, HOLD_TO_EXIT_MS);
};

/** Set before app.quit() so the close/leave-fullscreen guards stand down. */
let exiting = false;

// ---------------------------------------------------------------------------
// JSON mirror of the leaderboard
// ---------------------------------------------------------------------------

const dataFile = () => path.join(app.getPath('userData'), 'players.json');

const recordScore = (entry) => {
  const file = dataFile();
  const total = saveScore(file, entry);
  // eslint-disable-next-line no-console
  console.log(`[kiosk] saved ${entry.gameId} ${entry.name} ${entry.lastScore} (${total} rows)`);
  return file;
};

// ---------------------------------------------------------------------------
// app://kiosk — the built bundle, served like a website
// ---------------------------------------------------------------------------

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

const registerBundleProtocol = () => {
  protocol.handle('app', async (request) => {
    const requested = path.join(BUILD_DIR, decodeURIComponent(new URL(request.url).pathname));

    // A crafted path must not escape the bundle.
    if (requested !== BUILD_DIR && !requested.startsWith(BUILD_DIR + path.sep)) {
      return new Response('Forbidden', { status: 403 });
    }

    if (fs.existsSync(requested) && fs.statSync(requested).isFile()) {
      return net.fetch(pathToFileURL(requested).toString());
    }

    // A miss with no file extension is a client-side route, so hand back the
    // shell. A miss on `something.js` is a genuine 404 — serving index.html
    // there would only surface as a baffling syntax error in the console.
    if (path.extname(requested)) return new Response('Not found', { status: 404 });

    return net.fetch(pathToFileURL(path.join(BUILD_DIR, 'index.html')).toString());
  });
};

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

const createWindow = () => {
  const win = new BrowserWindow({
    kiosk: true,
    fullscreen: true,
    frame: false,
    backgroundColor: '#10163a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false,
      spellcheck: false,
      // The 3D game must not be throttled if the window ever loses focus.
      backgroundThrottling: false,
    },
  });

  const contents = win.webContents;

  const quit = () => {
    exiting = true;
    app.quit();
  };

  // Swallow every shortcut. Bare keys still reach the page, so typing a name
  // and a phone number into the score form works normally.
  contents.on('before-input-event', (event, input) => {
    trackHoldToExit(input, quit);

    if (input.type !== 'keyDown') return;

    if (isExitCombo(input)) {
      quit();
      return;
    }

    if (input.control || input.meta || input.alt || /^F\d+$/.test(input.key)) {
      event.preventDefault();
    }
  });

  contents.on('context-menu', (event) => event.preventDefault());
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.setVisualZoomLevelLimits(1, 1);

  // Dropping a file on the window, or any link out of the bundle, is a no-op.
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith(START_URL)) event.preventDefault();
  });

  // Nothing but the exit combo closes this window or leaves fullscreen.
  win.on('close', (event) => {
    if (!exiting) event.preventDefault();
  });
  win.on('leave-full-screen', () => {
    if (!exiting) win.setFullScreen(true);
  });

  // The operator needs to know how to get out, and a visitor shouldn't have to
  // look at it. Shown over the first few seconds, then gone.
  contents.once('did-finish-load', () => {
    contents.executeJavaScript(`
      const hint = document.createElement('div');
      hint.textContent = 'Exit: Ctrl + Alt + Shift + Q  ·  or hold Esc';
      hint.style.cssText = 'position:fixed;bottom:10px;right:14px;z-index:2147483647;' +
        'font:12px/1 -apple-system,sans-serif;color:rgba(255,255,255,.65);' +
        'background:rgba(0,0,0,.55);padding:6px 10px;border-radius:8px;' +
        'pointer-events:none;transition:opacity 1s';
      document.body.appendChild(hint);
      setTimeout(() => { hint.style.opacity = '0'; }, 12000);
      setTimeout(() => hint.remove(), 13500);
    `);
  });

  win.loadURL(START_URL);
  return win;
};

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  Menu.setApplicationMenu(null);
  app.commandLine.appendSwitch('disable-pinch');

  ipcMain.handle('kiosk:save-score', (_event, entry) => recordScore(entry));

  app.whenReady().then(() => {
    registerBundleProtocol();
    createWindow();

    // Third route out, in case the window ever isn't the thing with focus —
    // before-input-event only fires for the focused web contents.
    globalShortcut.register('Control+Alt+Shift+Q', () => {
      exiting = true;
      app.quit();
    });

    // eslint-disable-next-line no-console
    console.log(`[kiosk] player data: ${dataFile()}`);
  });

  app.on('window-all-closed', () => app.quit());
}
