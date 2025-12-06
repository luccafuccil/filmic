const fileAPI = window.fileAPI;

export const electronAPI = {
  openFile: () => fileAPI.openFile(),
  openFolder: () => fileAPI.openFolder(),
  readFile: (filePath) => fileAPI.readFile(filePath),
  writeFile: (filePath, content) => fileAPI.writeFile(filePath, content),
  fileExists: (filePath) => fileAPI.exists(filePath),
  readDirectory: (dirPath) => fileAPI.readDirectory(dirPath),
  getMovies: (dirPath) => fileAPI.getMovies(dirPath),
  getVideoFile: (movie) => fileAPI.getVideoFile(movie),
  getSubtitles: (videoPath) => fileAPI.getSubtitles(videoPath),
  openInExternalPlayer: (videoPath) => fileAPI.openInExternalPlayer(videoPath),
  generateThumbnail: (movie) => fileAPI.generateThumbnail(movie),
  cleanupThumbnails: (movies) => fileAPI.cleanupThumbnails(movies),
  onMenuChangeFolder: (callback) => fileAPI.onMenuChangeFolder(callback),
  onMoviesProgress: (callback) => fileAPI.onMoviesProgress(callback),
  getWatchProgress: (movieId) => fileAPI.getWatchProgress(movieId),
  saveWatchProgress: (movieId, progress) =>
    fileAPI.saveWatchProgress(movieId, progress),
  removeWatchProgress: (movieId) => fileAPI.removeWatchProgress(movieId),
  getContinueWatching: () => fileAPI.getContinueWatching(),
  onWatchProgressUpdated: (callback) =>
    fileAPI.onWatchProgressUpdated(callback),
  minimizeWindow: () => fileAPI.minimizeWindow(),
  maximizeWindow: () => fileAPI.maximizeWindow(),
  closeWindow: () => fileAPI.closeWindow(),
  getMovieMetadata: (title, year) => fileAPI.getMovieMetadata(title, year),

  // Update API
  checkForUpdates: () => fileAPI.checkForUpdates(),
  downloadUpdate: () => fileAPI.downloadUpdate(),
  installUpdate: () => fileAPI.installUpdate(),
  getAppVersion: () => fileAPI.getAppVersion(),
  onUpdateAvailable: (callback) => fileAPI.onUpdateAvailable(callback),
  onUpdateProgress: (callback) => fileAPI.onUpdateProgress(callback),
  onUpdateDownloaded: (callback) => fileAPI.onUpdateDownloaded(callback),
};
