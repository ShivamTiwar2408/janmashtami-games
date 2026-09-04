# Exhibition kiosk build

The same games, wrapped in an Electron app that installs on the TV's Mac, runs
fullscreen with no browser chrome, needs no internet, and writes every player's
details to a JSON file on disk.

## Build the installer

```bash
npm install
npm run kiosk:dist        # -> dist/Janmashtami Games-<version>-arm64.dmg
```

Copy the `.dmg` to the exhibition machine, open it, drag the app to
Applications. Nothing else is needed — the app never touches the network.

The app is unsigned, so the very first launch needs **right-click → Open** once
(Gatekeeper). After that it opens normally.

To try it without packaging: `npm run kiosk`.

## Exit

**Ctrl + Alt + Shift + Q** (or Cmd + Alt + Shift + Q).

Every other shortcut is swallowed — no devtools, no menu bar, no reload, no
zoom, no right-click menu, no closing the window, no leaving fullscreen. Plain
keys still reach the page, so players can type their name and phone number.

## Player data

```
~/Library/Application Support/janmashtami-games/players.json
```

One entry per (game, name, phone) — the same rows IndexedDB holds inside the
app, same fields:

```json
[
  {
    "id": "arrange|9876543210|radha",
    "gameId": "arrange",
    "name": "Radha",
    "phone": "9876543210",
    "best": 42,
    "lastScore": 42,
    "plays": 3,
    "updatedAt": "..."
  }
]
```

Playing again updates that entry: `plays` goes up, `best` keeps the highest
score. Written after every finished run, so pulling the plug loses nothing but
the run in progress.

## What macOS still allows

Electron cannot intercept the OS's own shortcuts — **Cmd + Tab**, Mission
Control, and Ctrl + Cmd + Q (lock screen) belong to macOS, not to the app. For
a hands-off booth, close that gap outside the app:

1. A dedicated macOS user account with nothing else installed and no other apps
   in the Dock.
2. System Settings → General → Login Items → add **Janmashtami Games**, so the
   booth comes back up on its own after a restart.
3. System Settings → Desktop & Dock → Hot Corners → set all four to `-`.

## How it works

`electron/main.js` serves the CRA build over a custom `app://kiosk/` scheme
instead of `file://`, which is why the games needed no changes: absolute asset
paths (`/ding.mp3`, `/wheel_game_card.png`) and React Router's history both
behave exactly as they do on the web. `asar` is off so audio and video stream
straight off disk.

`electron/scoreFile.js` owns players.json. `node electron/scoreFile.js` runs its
self-check.
