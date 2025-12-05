const fs = require("fs");
const path = require("path");
const { app } = require("electron");

let cache = null;
let cacheFilePath = null;

function getCacheFilePath() {
  if (!cacheFilePath) {
    const userDataPath = app.getPath("userData");
    cacheFilePath = path.join(userDataPath, "metadata-cache.json");
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
  } catch (error) {}
}

function getCachedMetadata(videoPath) {
  const currentCache = loadCache();
  return currentCache[videoPath] || null;
}

function setCachedMetadata(videoPath, metadata) {
  const currentCache = loadCache();
  currentCache[videoPath] = metadata;
  saveCache(currentCache);
}

module.exports = {
  loadCache,
  saveCache,
  getCachedMetadata,
  setCachedMetadata,
};
