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

function getCacheKey(title, year) {
  const normalizedTitle = title.toLowerCase().trim();
  const normalizedYear = year ? String(year) : "no-year";
  return `${normalizedTitle}||${normalizedYear}`;
}

function getCachedTmdbData(title, year) {
  const currentCache = loadCache();
  const key = getCacheKey(title, year);
  return currentCache[key] || null;
}

function setCachedTmdbData(title, year, metadata) {
  const currentCache = loadCache();
  const key = getCacheKey(title, year);

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
