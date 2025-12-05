const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("versions", {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
});

contextBridge.exposeInMainWorld("fileAPI", {
  openFile: () => ipcRenderer.invoke("dialog:openFile"),

  readFile: (filePath) => ipcRenderer.invoke("fs:readFile", filePath),

  writeFile: (filePath, content) =>
    ipcRenderer.invoke("fs:writeFile", filePath, content),

  exists: (filePath) => ipcRenderer.invoke("fs:exists", filePath),

  openFolder: () => ipcRenderer.invoke("dialog:openFolder"),

  readDirectory: (dirPath) => ipcRenderer.invoke("fs:readDirectory", dirPath),

  getMovies: (dirPath) => ipcRenderer.invoke("fs:getMovies", dirPath),

  getVideoFile: (movie) => ipcRenderer.invoke("video:getFile", movie),

  getSubtitles: (videoPath) =>
    ipcRenderer.invoke("video:getSubtitles", videoPath),

  openInExternalPlayer: (videoPath) =>
    ipcRenderer.invoke("video:openExternal", videoPath),

  generateThumbnail: (movie) =>
    ipcRenderer.invoke("thumbnails:generate", movie),

  cleanupThumbnails: (movies) =>
    ipcRenderer.invoke("thumbnails:cleanup", movies),

  onMenuChangeFolder: (callback) => {
    ipcRenderer.on("menu:changeFolder", callback);
    // Retornar função de cleanup
    return () => ipcRenderer.removeListener("menu:changeFolder", callback);
  },

  onMoviesProgress: (callback) => {
    ipcRenderer.on("movies:progress", (event, data) => callback(data));
    // Retornar função de cleanup
    return () => ipcRenderer.removeAllListeners("movies:progress");
  },

  getWatchProgress: (movieId) =>
    ipcRenderer.invoke("watch:getProgress", movieId),

  saveWatchProgress: (movieId, progress) =>
    ipcRenderer.invoke("watch:saveProgress", movieId, progress),

  removeWatchProgress: (movieId) =>
    ipcRenderer.invoke("watch:removeProgress", movieId),

  getContinueWatching: () => ipcRenderer.invoke("watch:getContinueWatching"),

  onWatchProgressUpdated: (callback) => {
    ipcRenderer.on("watch-progress-updated", callback);
    // Retornar função de cleanup
    return () => ipcRenderer.removeListener("watch-progress-updated", callback);
  },

  minimizeWindow: () => ipcRenderer.send("window:minimize"),
  maximizeWindow: () => ipcRenderer.send("window:maximize"),
  closeWindow: () => ipcRenderer.send("window:close"),
});
