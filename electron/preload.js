/*
 * The only thing the games can reach outside the page: writing a finished run
 * to players.json. `window.kiosk` being defined is also how the app knows it
 * is running in the exhibition shell rather than a browser.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kiosk', {
  saveScore: (entry) => ipcRenderer.invoke('kiosk:save-score', entry),
});
