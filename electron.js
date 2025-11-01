const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    // In development — load localhost:3000
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // In production — load the built Next.js HTML
    const indexPath = path.join(__dirname, '../.next/server/pages/index.html');
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load built app:', err);
      mainWindow.loadURL('data:text/html,<h1>Failed to load app</h1>');
    });
  }

  mainWindow.on('closed', () => (mainWindow = null));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
