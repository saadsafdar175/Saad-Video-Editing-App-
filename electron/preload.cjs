const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  openMediaFiles: () => ipcRenderer.invoke('dialog:openMediaFiles'),
  saveProjectDialog: (defaultName) => ipcRenderer.invoke('dialog:saveProject', defaultName),
  openProjectDialog: () => ipcRenderer.invoke('dialog:openProject'),
  executeFFmpeg: (args, outputPath) => ipcRenderer.invoke('ffmpeg:execute', { args, outputPath }),
  cancelFFmpeg: () => ipcRenderer.invoke('ffmpeg:cancel'),
  onFFmpegProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('ffmpeg:progress', handler);
    return () => ipcRenderer.removeListener('ffmpeg:progress', handler);
  },
});
