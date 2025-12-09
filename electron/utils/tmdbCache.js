const fs = require("fs");
const path = require("path");
const { app } = require("electron");

let cache = null;
let cacheFilePath = null;

function getCacheFilePath() {
  if (!cacheFilePath) {
    const userDataPath = app.getPath("userData");
    cacheFilePath = path.join(userDataPath, "tmdb-cache.json");
  }
  return cacheFilePath;
}

function loadCache() {
  if (cache !== null) {
    return cache;
  }

  try {
    const filePath = getCacheFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      cache = JSON.parse(data);
    } else {
      cache = {};
    }
  } catch (error) {
    console.error("Error loading TMDB cache:", error);
    cache = {};
  }

  return cache;
}

function saveCache(cacheData) {
  try {
    const filePath = getCacheFilePath();
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(cacheData, null, 2), "utf-8");
    cache = cacheData;
  } catch (error) {
    console.error("Error saving TMDB cache:", error);
  }
}

function getCacheKey(
  title,
  year,
  type = null,
  seasonNumber = null,
  episodeNumber = null
) {
  const normalizedTitle = title.toLowerCase().trim();
  const normalizedYear = year ? String(year) : "no-year";

  // Base key for movies or shows
  let key = `${normalizedTitle}||${normalizedYear}`;

  // Add type prefix if specified
  if (type) {
    key = `${type}||${key}`;
  }

  // Add season/episode info for TV shows
  if (seasonNumber !== null) {
    const seasonStr = String(seasonNumber).padStart(2, "0");
    key += `||S${seasonStr}`;

    if (episodeNumber !== null) {
      const episodeStr = String(episodeNumber).padStart(2, "0");
      key += `E${episodeStr}`;
    }
  }

  return key;
}

function getCachedTmdbData(
  title,
  year,
  type = null,
  seasonNumber = null,
  episodeNumber = null
) {
  const currentCache = loadCache();
  const key = getCacheKey(title, year, type, seasonNumber, episodeNumber);
  return currentCache[key] || null;
}

function setCachedTmdbData(
  title,
  year,
  metadata,
  type = null,
  seasonNumber = null,
  episodeNumber = null
) {
  const currentCache = loadCache();
  const key = getCacheKey(title, year, type, seasonNumber, episodeNumber);

  currentCache[key] = {
    ...metadata,
    cachedAt: new Date().toISOString(),
  };

  saveCache(currentCache);
}

module.exports = {
  loadCache,
  saveCache,
  getCachedTmdbData,
  setCachedTmdbData,
  getCacheKey,
};
