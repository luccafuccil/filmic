const { ipcMain } = require("electron");
const { getMovieMetadata } = require("../utils/tmdbService");
const { getCachedTmdbData, setCachedTmdbData } = require("../utils/tmdbCache");

function registerTmdbHandlers() {
  // Get movie metadata (director and overview) from TMDB
  ipcMain.handle("tmdb:getMovieMetadata", async (event, title, year) => {
    try {
      console.log("[TMDB] Fetching metadata for:", title, year);

      // Check cache first
      const cached = getCachedTmdbData(title, year);
      if (cached) {
        console.log("[TMDB] Using cached metadata");
        return { success: true, metadata: cached };
      }

      // If not cached, fetch from API
      console.log("[TMDB] No cache found, fetching from API");
      const metadata = await getMovieMetadata(title, year);
      console.log("[TMDB] Metadata received:", metadata);

      // Cache the result (even if null, to avoid repeated failed requests)
      setCachedTmdbData(title, year, metadata);

      return { success: true, metadata };
    } catch (err) {
      console.error("[TMDB] Error in tmdb:getMovieMetadata handler:", err);
      return { success: false, metadata: { director: null, overview: null } };
    }
  });
}

module.exports = { registerTmdbHandlers };
