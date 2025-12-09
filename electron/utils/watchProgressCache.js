const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const CACHE_DIR = path.join(app.getPath("userData"), "cache");
const WATCH_PROGRESS_FILE = path.join(CACHE_DIR, "watch-progress.json");

class WatchProgressCache {
  constructor() {
    this.cache = this.loadCache();
  }

  loadCache() {
    try {
      if (fs.existsSync(WATCH_PROGRESS_FILE)) {
        const data = fs.readFileSync(WATCH_PROGRESS_FILE, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {}
    return {};
  }

  saveCache() {
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
      fs.writeFileSync(
        WATCH_PROGRESS_FILE,
        JSON.stringify(this.cache, null, 2),
        "utf8"
      );
    } catch (error) {}
  }

  getProgress(movieId) {
    return this.cache[movieId] || null;
  }

  saveProgress(movieId, progress) {
    this.cache[movieId] = {
      ...progress,
      lastWatched: new Date().toISOString(),
    };
    this.saveCache();
  }

  removeProgress(movieId) {
    if (this.cache[movieId]) {
      delete this.cache[movieId];
      this.saveCache();
      return true;
    }
    return false;
  }

  getContinueWatching() {
    const entries = Object.entries(this.cache);

    const inProgress = entries.filter(([_, progress]) => {
      const percentage = progress.percentage || 0;
      return percentage >= 1 && percentage < 95;
    });

    inProgress.sort((a, b) => {
      const dateA = new Date(a[1].lastWatched);
      const dateB = new Date(b[1].lastWatched);
      return dateB - dateA;
    });

    return inProgress.slice(0, 3).map(([mediaId, progress]) => {
      const remainingSeconds = progress.duration - progress.time;
      const remainingMinutes = Math.ceil(remainingSeconds / 60);

      return {
        mediaId, // Can be movieId or episodeId (showName (year)||S01E01)
        movieId: mediaId, // Backward compatibility
        time: progress.time,
        duration: progress.duration,
        percentage: progress.percentage,
        lastWatched: progress.lastWatched,
        remainingMinutes,
        mediaType: progress.mediaType || "movie", // 'movie' or 'tvshow'
        // TV show specific fields
        showName: progress.showName || null,
        season: progress.season || null,
        episode: progress.episode || null,
      };
    });
  }

  // Helper to get progress for a specific episode
  getEpisodeProgress(showName, year, season, episode) {
    const episodeId = this.getEpisodeId(showName, year, season, episode);
    return this.getProgress(episodeId);
  }

  // Helper to save episode progress
  saveEpisodeProgress(showName, year, season, episode, progress) {
    const episodeId = this.getEpisodeId(showName, year, season, episode);
    this.saveProgress(episodeId, {
      ...progress,
      mediaType: "tvshow",
      showName,
      season,
      episode,
    });
  }

  // Generate episode ID: "Show Name (Year)||S01E01"
  getEpisodeId(showName, year, season, episode) {
    const seasonStr = String(season).padStart(2, "0");
    const episodeStr = String(episode).padStart(2, "0");
    const yearStr = year || "no-year";
    return `${showName} (${yearStr})||S${seasonStr}E${episodeStr}`;
  }

  // Find next episode in a show (helper for auto-play)
  findNextEpisode(showName, year, allEpisodes) {
    if (!allEpisodes || allEpisodes.length === 0) {
      return null;
    }

    // Get all progress for this show
    const showProgressEntries = Object.entries(this.cache).filter(
      ([mediaId]) => {
        const yearStr = year || "no-year";
        return mediaId.startsWith(`${showName} (${yearStr})||S`);
      }
    );

    // Find the most recently watched episode
    if (showProgressEntries.length === 0) {
      // No episodes watched yet, return first episode of first season
      const firstSeason = allEpisodes[0];
      if (
        firstSeason &&
        firstSeason.episodes &&
        firstSeason.episodes.length > 0
      ) {
        return {
          season: firstSeason.seasonNumber,
          episode: firstSeason.episodes[0].episodeNumber,
        };
      }
      return null;
    }

    // Sort by last watched
    showProgressEntries.sort((a, b) => {
      const dateA = new Date(a[1].lastWatched);
      const dateB = new Date(b[1].lastWatched);
      return dateB - dateA;
    });

    const [lastWatchedId, lastWatchedProgress] = showProgressEntries[0];

    // Extract season and episode from ID
    const match = lastWatchedId.match(/S(\d{2})E(\d{2})$/);
    if (!match) return null;

    const currentSeason = parseInt(match[1], 10);
    const currentEpisode = parseInt(match[2], 10);

    // If current episode is complete (>=95%), find next episode
    if (lastWatchedProgress.percentage >= 95) {
      // Find current season
      const season = allEpisodes.find((s) => s.seasonNumber === currentSeason);
      if (!season) return null;

      // Try next episode in same season
      const nextEpisodeInSeason = season.episodes.find(
        (ep) => ep.episodeNumber === currentEpisode + 1
      );

      if (nextEpisodeInSeason) {
        return {
          season: currentSeason,
          episode: nextEpisodeInSeason.episodeNumber,
        };
      }

      // Try first episode of next season
      const nextSeason = allEpisodes.find(
        (s) => s.seasonNumber === currentSeason + 1
      );
      if (nextSeason && nextSeason.episodes && nextSeason.episodes.length > 0) {
        return {
          season: nextSeason.seasonNumber,
          episode: nextSeason.episodes[0].episodeNumber,
        };
      }

      return null; // No more episodes
    }

    // Current episode is incomplete, return it
    return {
      season: currentSeason,
      episode: currentEpisode,
    };
  }
}

const watchProgressCache = new WatchProgressCache();

module.exports = watchProgressCache;
