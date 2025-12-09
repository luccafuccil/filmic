const { ipcMain } = require("electron");
const {
  getMovieMetadata,
  getTVShowMetadata,
  getMediaMetadata,
  getSeasonDetails,
  getEpisodeDetails,
} = require("../utils/tmdbService");
const { getCachedTmdbData, setCachedTmdbData } = require("../utils/tmdbCache");

function registerTmdbHandlers() {
  // Legacy movie metadata handler (kept for backward compatibility)
  ipcMain.handle("tmdb:getMovieMetadata", async (event, title, year) => {
    try {
      console.log("[TMDB] Fetching metadata for:", title, year);

      const cached = getCachedTmdbData(title, year, "movie");
      if (cached) {
        console.log("[TMDB] Using cached metadata");
        return { success: true, metadata: cached };
      }

      console.log("[TMDB] No cache found, fetching from API");
      const metadata = await getMovieMetadata(title, year);
      console.log("[TMDB] Metadata received:", metadata);

      setCachedTmdbData(title, year, metadata, "movie");

      return { success: true, metadata };
    } catch (err) {
      console.error("[TMDB] Error in tmdb:getMovieMetadata handler:", err);
      return { success: false, metadata: { director: null, overview: null } };
    }
  });

  // Unified media metadata handler (auto-detects movie vs TV show)
  ipcMain.handle(
    "tmdb:getMediaMetadata",
    async (event, title, year, mediaType = null) => {
      try {
        console.log(
          "[TMDB] Fetching media metadata for:",
          title,
          year,
          mediaType
        );

        const cached = getCachedTmdbData(title, year, mediaType);
        if (cached) {
          console.log("[TMDB] Using cached metadata");
          return {
            success: true,
            metadata: cached,
            type: mediaType,
            fallback: false,
          };
        }

        console.log("[TMDB] No cache found, fetching from API");
        const result = await getMediaMetadata(title, year, mediaType);

        if (result.fallback) {
          console.log("[TMDB] Using fallback (no TMDB match)");
          return result;
        }

        console.log("[TMDB] Metadata received:", result);

        setCachedTmdbData(title, year, result.metadata, result.type);

        return result;
      } catch (err) {
        console.error("[TMDB] Error in tmdb:getMediaMetadata handler:", err);
        return { success: false, metadata: null, fallback: true };
      }
    }
  );

  // TV show metadata handler
  ipcMain.handle("tmdb:getTVShowMetadata", async (event, title, year) => {
    try {
      console.log("[TMDB] Fetching TV show metadata for:", title, year);

      const cached = getCachedTmdbData(title, year, "tvshow");
      if (cached) {
        console.log("[TMDB] Using cached metadata");
        return { success: true, metadata: cached };
      }

      console.log("[TMDB] No cache found, fetching from API");
      const metadata = await getTVShowMetadata(title, year);
      console.log("[TMDB] Metadata received:", metadata);

      setCachedTmdbData(title, year, metadata, "tvshow");

      return { success: true, metadata };
    } catch (err) {
      console.error("[TMDB] Error in tmdb:getTVShowMetadata handler:", err);
      return {
        success: false,
        metadata: {
          creator: null,
          overview: null,
          numberOfSeasons: 0,
          numberOfEpisodes: 0,
        },
      };
    }
  });

  // Season details handler
  ipcMain.handle(
    "tmdb:getSeasonDetails",
    async (event, title, year, seasonNumber) => {
      try {
        console.log(
          "[TMDB] Fetching season details for:",
          title,
          year,
          seasonNumber
        );

        const cached = getCachedTmdbData(title, year, "tvshow", seasonNumber);
        if (cached) {
          console.log("[TMDB] Using cached season details");
          return { success: true, details: cached };
        }

        // First get the TV show ID
        const showMetadata = await getTVShowMetadata(title, year);
        if (!showMetadata) {
          return { success: false, details: null };
        }

        // Then get season details (need to extract ID from search)
        const { searchTVShow } = require("../utils/tmdbService");
        const show = await searchTVShow(title, year);

        if (!show || !show.id) {
          return { success: false, details: null };
        }

        const details = await getSeasonDetails(show.id, seasonNumber);
        console.log("[TMDB] Season details received");

        setCachedTmdbData(title, year, details, "tvshow", seasonNumber);

        return { success: true, details };
      } catch (err) {
        console.error("[TMDB] Error in tmdb:getSeasonDetails handler:", err);
        return { success: false, details: null };
      }
    }
  );

  // Episode details handler
  ipcMain.handle(
    "tmdb:getEpisodeDetails",
    async (event, title, year, seasonNumber, episodeNumber) => {
      try {
        console.log(
          "[TMDB] Fetching episode details for:",
          title,
          year,
          seasonNumber,
          episodeNumber
        );

        const cached = getCachedTmdbData(
          title,
          year,
          "tvshow",
          seasonNumber,
          episodeNumber
        );
        if (cached) {
          console.log("[TMDB] Using cached episode details");
          return { success: true, details: cached };
        }

        // First get the TV show ID
        const { searchTVShow } = require("../utils/tmdbService");
        const show = await searchTVShow(title, year);

        if (!show || !show.id) {
          return { success: false, details: null };
        }

        const details = await getEpisodeDetails(
          show.id,
          seasonNumber,
          episodeNumber
        );
        console.log("[TMDB] Episode details received");

        setCachedTmdbData(
          title,
          year,
          details,
          "tvshow",
          seasonNumber,
          episodeNumber
        );

        return { success: true, details };
      } catch (err) {
        console.error("[TMDB] Error in tmdb:getEpisodeDetails handler:", err);
        return { success: false, details: null };
      }
    }
  );
}

module.exports = { registerTmdbHandlers };
