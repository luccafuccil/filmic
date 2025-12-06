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

    return inProgress.slice(0, 3).map(([movieId, progress]) => {
      const remainingSeconds = progress.duration - progress.time;
      const remainingMinutes = Math.ceil(remainingSeconds / 60);

      return {
        movieId,
        time: progress.time,
        duration: progress.duration,
        percentage: progress.percentage,
        lastWatched: progress.lastWatched,
        remainingMinutes,
      };
    });
  }
}

const watchProgressCache = new WatchProgressCache();

module.exports = watchProgressCache;
