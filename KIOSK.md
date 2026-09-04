# Exhibition kiosk build

The same games, wrapped in an Electron app that installs on the TV's Mac, runs
fullscreen with no browser chrome, needs no internet, and writes every player's
details to a JSON file on disk.

## Build the installers

```bash
npm install
npm run kiosk:dist        # all three -> dist/Janmashtami-Games-mac-arm64.dmg
                          #              dist/Janmashtami-Games-mac-x64.dmg
                          #              dist/Janmashtami-Games-windows.exe
npm run kiosk:dist:mac    # just the two .dmg files
npm run kiosk:dist:win    # just the .exe
```

One `.dmg` per Mac architecture, plus an x64 NSIS installer for Windows that
lets the user pick the install directory. All three are produced on macOS —
electron-builder ships its own `makensis`, so no Wine is needed.

A single universal `.dmg` would be neater, but `@electron/universal` has to
merge the two app trees file by file and stalls on this app, because `asar` is
off and `build/` is ~180 MB of media. Two downloads is the cheaper trade.

**Mac**: open the `.dmg`, drag the app to Applications. Unsigned, so the very
first launch needs **right-click → Open** once (Gatekeeper). After that it
opens normally.

**Windows**: run the `.exe`. Unsigned, so SmartScreen shows "Windows protected
your PC" — **More info → Run anyway**, once.

Neither ever touches the network. To try it without packaging: `npm run kiosk`.

## Publishing the installers for download

The footer of the website links to these two files on the repo's GitHub
releases (the buttons only render in a browser — inside the kiosk app there's
nothing to download). The filenames carry no version number, so
`releases/latest/download/<file>` stays valid across releases:

```bash
gh release create v0.1.0 dist/Janmashtami-Games-mac-*.dmg dist/Janmashtami-Games-windows.exe \
  --title "Kiosk v0.1.0" --notes "Offline exhibition build."

# later versions: bump package.json, rebuild, then
gh release create v0.1.1 dist/Janmashtami-Games-mac-*.dmg dist/Janmashtami-Games-windows.exe --generate-notes
```

`dist/` is gitignored — each installer is ~350 MB and must never be committed.
The website's footer buttons 404 until a release with these filenames exists.

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
