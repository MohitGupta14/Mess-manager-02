const { app, BrowserWindow } = require("electron");
const path = require("path");
const next = require("next");
const express = require("express");

const isDev = !app.isPackaged;
const PORT = 2000;
let mainWindow;

async function createWindow() {
  const server = express();
  const nextApp = next({
    dev: isDev,
    dir: path.join(__dirname, ".."),        // same dir for both dev + prod
  });

  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  server.all("*", (req, res) => handle(req, res));

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    launchWindow(`http://localhost:${PORT}`);
  });
}

function launchWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(url);
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
