const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;
let activeFFmpegProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0b0d11',
    title: 'Saad Video Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    show: false,
  });

  mainWindow.setMenuBarVisibility(false);

  // In dev mode or packaged app
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler: Open Media File Dialog
ipcMain.handle('dialog:openMediaFiles', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Media Files - Saad Video Studio',
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'All Supported Media',
        extensions: [
          'mp4', 'mov', 'avi', 'mkv', 'webm', 'mpeg',
          'mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg',
          'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'
        ],
      },
      { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mpeg'] },
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg'] },
      { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
    ],
  });
  return result.filePaths;
});

// IPC Handler: Save Project Dialog
ipcMain.handle('dialog:saveProject', async (event, defaultName) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Project - Saad Video Studio',
    defaultPath: `${defaultName || 'Untitled'}.saadvideo`,
    filters: [{ name: 'Saad Video Project', extensions: ['saadvideo'] }],
  });
  return result.filePath;
});

// IPC Handler: Open Project Dialog
ipcMain.handle('dialog:openProject', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Project - Saad Video Studio',
    properties: ['openFile'],
    filters: [{ name: 'Saad Video Project', extensions: ['saadvideo'] }],
  });
  return result.filePaths?.[0] || null;
});

// IPC Handler: Run Native FFmpeg Export
ipcMain.handle('ffmpeg:execute', async (event, { args, outputPath }) => {
  return new Promise((resolve, reject) => {
    // Locate local FFmpeg binary
    const localFfmpegPath = path.join(__dirname, 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    const ffmpegCmd = fs.existsSync(localFfmpegPath) ? localFfmpegPath : 'ffmpeg';

    activeFFmpegProcess = spawn(ffmpegCmd, args);

    let stderrData = '';

    activeFFmpegProcess.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderrData += text;

      // Extract time / frame progress
      const timeMatch = text.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
      const frameMatch = text.match(/frame=\s*(\d+)/);

      if (timeMatch || frameMatch) {
        event.sender.send('ffmpeg:progress', {
          time: timeMatch ? timeMatch[1] : null,
          frame: frameMatch ? parseInt(frameMatch[1], 10) : null,
          raw: text,
        });
      }
    });

    activeFFmpegProcess.on('close', (code) => {
      activeFFmpegProcess = null;
      if (code === 0) {
        resolve({ success: true, outputPath });
      } else {
        reject(new Error(`FFmpeg exited with code ${code}. Details: ${stderrData.slice(-500)}`));
      }
    });

    activeFFmpegProcess.on('error', (err) => {
      activeFFmpegProcess = null;
      reject(err);
    });
  });
});

// IPC Handler: Cancel FFmpeg
ipcMain.handle('ffmpeg:cancel', () => {
  if (activeFFmpegProcess) {
    activeFFmpegProcess.kill('SIGTERM');
    activeFFmpegProcess = null;
    return true;
  }
  return false;
});
