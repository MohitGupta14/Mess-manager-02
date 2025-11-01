const { app, BrowserWindow } = require('electron');
const next = require('next');
const express = require('express');

const isDev = !app.isPackaged;
const port = 3000;
let mainWindow;

async function createWindow() {
  const server = express();
  const nextApp = next({ dev: isDev, dir: isDev ? __dirname + '/../' : __dirname });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();
  server.all('*', (req, res) => handle(req, res));

  const httpServer = server.listen(port, () => {
    console.log(`✅ Next.js running on http://localhost:${port}`);
    createMainWindow(); // Open window **after** server starts
  });

  function createMainWindow() {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      webPreferences: {
        contextIsolation: true,
      },
    });

    mainWindow.loadURL(`http://localhost:${port}`);

    mainWindow.on('closed', () => {
      mainWindow = null;
      httpServer.close();
    });
  }
}

app.on('ready', createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
