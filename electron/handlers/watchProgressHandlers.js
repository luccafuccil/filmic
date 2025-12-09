const watchProgressCache = require("../utils/watchProgressCache");

function handleGetWatchProgress(event, mediaId) {
  return watchProgressCache.getProgress(mediaId);
}

function handleSaveWatchProgress(event, mediaId, progress) {
  watchProgressCache.saveProgress(mediaId, progress);

  // Emit event to notify frontend of changes
  event.sender.send("watch-progress-updated");

  return { success: true };
}

function handleRemoveWatchProgress(event, mediaId) {
  const removed = watchProgressCache.removeProgress(mediaId);

  if (removed) {
    // Emit event to notify frontend of changes
    event.sender.send("watch-progress-updated");
  }

  return { success: removed };
}

function handleGetContinueWatching(event) {
  return watchProgressCache.getContinueWatching();
}

// Episode-specific handlers
function handleGetEpisodeProgress(event, showName, year, season, episode) {
  return watchProgressCache.getEpisodeProgress(showName, year, season, episode);
}

function handleSaveEpisodeProgress(
  event,
  showName,
  year,
  season,
  episode,
  progress
) {
  watchProgressCache.saveEpisodeProgress(
    showName,
    year,
    season,
    episode,
    progress
  );

  // Emit event to notify frontend of changes
  event.sender.send("watch-progress-updated");

  return { success: true };
}

function handleFindNextEpisode(event, showName, year, allEpisodes) {
  return watchProgressCache.findNextEpisode(showName, year, allEpisodes);
}

module.exports = {
  handleGetWatchProgress,
  handleSaveWatchProgress,
  handleRemoveWatchProgress,
  handleGetContinueWatching,
  handleGetEpisodeProgress,
  handleSaveEpisodeProgress,
  handleFindNextEpisode,
};
