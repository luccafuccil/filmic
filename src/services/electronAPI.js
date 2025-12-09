const fileAPI = window.fileAPI;

export const electronAPI = {
  openFile: () => fileAPI.openFile(),
  openFolder: () => fileAPI.openFolder(),
  getFilePathFromDrop: (file) => fileAPI.getFilePathFromDrop(file),
  getDroppedPath: (filePath) => fileAPI.getDroppedPath(filePath),
  readFile: (filePath) => fileAPI.readFile(filePath),
  writeFile: (filePath, content) => fileAPI.writeFile(filePath, content),
  fileExists: (filePath) => fileAPI.exists(filePath),
  readDirectory: (dirPath) => fileAPI.readDirectory(dirPath),
  getMovies: (dirPath) => fileAPI.getMovies(dirPath),
  getMedia: (dirPath) => fileAPI.getMedia(dirPath),
  getVideoFile: (movie) => fileAPI.getVideoFile(movie),
  getEpisodeVideoFile: (show, season, episode) =>
    fileAPI.getEpisodeVideoFile(show, season, episode),
  getSubtitles: (videoPath) => fileAPI.getSubtitles(videoPath),
  extractSubtitleTrack: (videoPath, trackIndex) =>
    fileAPI.extractSubtitleTrack(videoPath, trackIndex),
  cacheSubtitles: (videoPath, tracks, extractedContent) =>
    fileAPI.cacheSubtitles(videoPath, tracks, extractedContent),
  openInExternalPlayer: (videoPath) => fileAPI.openInExternalPlayer(videoPath),
  generateThumbnail: (movie) => fileAPI.generateThumbnail(movie),
  generateEpisodeThumbnail: (episode) =>
    fileAPI.generateEpisodeThumbnail(episode),
  cleanupThumbnails: (movies) => fileAPI.cleanupThumbnails(movies),
  onMenuChangeFolder: (callback) => fileAPI.onMenuChangeFolder(callback),
  onMoviesProgress: (callback) => fileAPI.onMoviesProgress(callback),
  onMediaProgress: (callback) => fileAPI.onMediaProgress(callback),
  getWatchProgress: (movieId) => fileAPI.getWatchProgress(movieId),
  saveWatchProgress: (movieId, progress) =>
    fileAPI.saveWatchProgress(movieId, progress),
  removeWatchProgress: (movieId) => fileAPI.removeWatchProgress(movieId),
  getContinueWatching: () => fileAPI.getContinueWatching(),
  getEpisodeProgress: (showName, year, season, episode) =>
    fileAPI.getEpisodeProgress(showName, year, season, episode),
  saveEpisodeProgress: (showName, year, season, episode, progress) =>
    fileAPI.saveEpisodeProgress(showName, year, season, episode, progress),
  findNextEpisode: (showName, year, allEpisodes) =>
    fileAPI.findNextEpisode(showName, year, allEpisodes),
  onWatchProgressUpdated: (callback) =>
    fileAPI.onWatchProgressUpdated(callback),
  minimizeWindow: () => fileAPI.minimizeWindow(),
  maximizeWindow: () => fileAPI.maximizeWindow(),
  closeWindow: () => fileAPI.closeWindow(),
  getMovieMetadata: (title, year) => fileAPI.getMovieMetadata(title, year),
  getMediaMetadata: (title, year, mediaType) =>
    fileAPI.getMediaMetadata(title, year, mediaType),
  getTVShowMetadata: (title, year) => fileAPI.getTVShowMetadata(title, year),
  getSeasonDetails: (title, year, seasonNumber) =>
    fileAPI.getSeasonDetails(title, year, seasonNumber),
  getEpisodeDetails: (title, year, seasonNumber, episodeNumber) =>
    fileAPI.getEpisodeDetails(title, year, seasonNumber, episodeNumber),

  // Update API
  checkForUpdates: () => fileAPI.checkForUpdates(),
  downloadUpdate: () => fileAPI.downloadUpdate(),
  installUpdate: () => fileAPI.installUpdate(),
  getAppVersion: () => fileAPI.getAppVersion(),
  onUpdateAvailable: (callback) => fileAPI.onUpdateAvailable(callback),
  onUpdateProgress: (callback) => fileAPI.onUpdateProgress(callback),
  onUpdateDownloaded: (callback) => fileAPI.onUpdateDownloaded(callback),
};
