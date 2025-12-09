const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { app } = require("electron");

const cacheDir = path.join(app.getPath("userData"), "subtitle-cache");

function ensureCacheDir() {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
}

function getFileHash(filePath) {
  return crypto.createHash("md5").update(filePath).digest("hex");
}

function getCachePath(videoPath) {
  const hash = getFileHash(videoPath);
  return path.join(cacheDir, `${hash}.json`);
}

async function hasCachedSubtitles(videoPath) {
  try {
    ensureCacheDir();
    const cachePath = getCachePath(videoPath);

    if (!fs.existsSync(cachePath)) {
      return false;
    }

    const videoStats = await fs.promises.stat(videoPath);
    const cacheStats = await fs.promises.stat(cachePath);

    return cacheStats.mtime > videoStats.mtime;
  } catch (error) {
    console.error("[SubtitleCache] Error checking cache:", error);
    return false;
  }
}

async function getCachedSubtitles(videoPath) {
  try {
    const cachePath = getCachePath(videoPath);
    const data = await fs.promises.readFile(cachePath, "utf-8");
    const cached = JSON.parse(data);

    console.log("[SubtitleCache] Cache hit for:", videoPath);
    return cached;
  } catch (error) {
    console.error("[SubtitleCache] Error reading cache:", error);
    return null;
  }
}

async function cacheSubtitles(videoPath, tracks, extractedContent) {
  try {
    ensureCacheDir();
    const cachePath = getCachePath(videoPath);

    const cacheData = {
      videoPath,
      timestamp: new Date().toISOString(),
      tracks,
      extractedContent,
    };

    await fs.promises.writeFile(
      cachePath,
      JSON.stringify(cacheData, null, 2),
      "utf-8"
    );

    console.log("[SubtitleCache] Cached subtitles for:", videoPath);
  } catch (error) {
    console.error("[SubtitleCache] Error writing cache:", error);
  }
}

async function cleanupOldCache() {
  try {
    ensureCacheDir();
    const files = await fs.promises.readdir(cacheDir);
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(cacheDir, file);
      const stats = await fs.promises.stat(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        await fs.promises.unlink(filePath);
        console.log("[SubtitleCache] Removed old cache:", file);
      }
    }
  } catch (error) {
    console.error("[SubtitleCache] Error cleaning cache:", error);
  }
}

module.exports = {
  hasCachedSubtitles,
  getCachedSubtitles,
  cacheSubtitles,
  cleanupOldCache,
};
