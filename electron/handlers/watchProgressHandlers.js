const watchProgressCache = require("../utils/watchProgressCache");

function handleGetWatchProgress(event, movieId) {
  return watchProgressCache.getProgress(movieId);
}

function handleSaveWatchProgress(event, movieId, progress) {
  watchProgressCache.saveProgress(movieId, progress);

  // Emit event to notify frontend of changes
  event.sender.send("watch-progress-updated");

  return { success: true };
}

function handleRemoveWatchProgress(event, movieId) {
  const removed = watchProgressCache.removeProgress(movieId);

  if (removed) {
    // Emit event to notify frontend of changes
    event.sender.send("watch-progress-updated");
  }

  return { success: removed };
}

function handleGetContinueWatching(event) {
  return watchProgressCache.getContinueWatching();
}

module.exports = {
  handleGetWatchProgress,
  handleSaveWatchProgress,
  handleRemoveWatchProgress,
  handleGetContinueWatching,
};
