const { parseTVShowName } = require("./tvShowNameParser");

// Expected folder structures:
// 1. Nested: Show Name (Year)/Season 01/Show.Name.S01E01.mkv
// 2. Flat: Show Name (Year)/Show.Name.S01E01.mkv
// 3. Root video: Show.Name.S01E01.2021.1080p.mkv

// Parse TV show folder/file name
function parseTVShow(name, isTorrentFile = false) {
  // Use torrent parser for episode filenames
  if (isTorrentFile || hasTVShowTags(name)) {
    return parseTVShowName(name);
  }

  // Simple regex for clean folder names: "Show Name (Year)"
  const regex = /^(.+?)\s*\((\d{4})\)$/;
  const match = name.match(regex);

  if (match) {
    return {
      title: match[1].trim(),
      year: match[2],
      season: null,
      episode: null,
      episodeEnd: null,
      episodeTitle: null,
      originalName: name,
      parsed: true,
    };
  }

  return {
    title: name,
    year: null,
    season: null,
    episode: null,
    episodeEnd: null,
    episodeTitle: null,
    originalName: name,
    parsed: false,
  };
}

// Check if filename contains TV show patterns
function hasTVShowTags(name) {
  const tvShowIndicators = [
    /[Ss]\d{1,2}[Ee]\d{1,2}/, // S01E01 or s01e01
    /\d{1,2}[xX]\d{1,2}/, // 1x01
    /\b(720p|1080p|2160p|4k)\b/i,
    /\b(x264|x265|h264|h265|HEVC)\b/i,
    /\b(BluRay|BRRip|WEBRip|WEB-?DL|HDTV)\b/i,
    /\b(YIFY|YTS|RARBG|ETRG)\b/i,
  ];

  return tvShowIndicators.some((pattern) => pattern.test(name));
}

// Check if a name contains episode pattern
function hasEpisodePattern(name) {
  const episodePatterns = [
    /[Ss]\d{1,2}[Ee]\d{1,2}/, // S01E01
    /\d{1,2}[xX]\d{1,2}/, // 1x01
  ];

  return episodePatterns.some((pattern) => pattern.test(name));
}

// Parse TV show folder name (without episode info)
function parseTVShowFolderName(folderName) {
  return parseTVShow(folderName, false);
}

// Parse TV show episode file name
function parseTVShowFileName(fileName) {
  return parseTVShow(fileName, true);
}

// Check if a folder/file is likely a TV show vs a movie
function isTVShow(name) {
  return hasEpisodePattern(name);
}

// Extract season number from folder name
function extractSeasonNumber(folderName) {
  const patterns = [/Season[\s\._-]*(\d{1,2})/i, /S(\d{1,2})$/i, /^(\d{1,2})$/];

  for (const pattern of patterns) {
    const match = folderName.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

// Group episodes by show and season
function groupEpisodes(episodes) {
  const grouped = {};

  episodes.forEach((episode) => {
    if (!episode.parsed || !episode.title || episode.season === null) {
      return;
    }

    // Create show key: "Title||Year" or "Title||no-year"
    const showKey = `${episode.title}||${episode.year || "no-year"}`;

    if (!grouped[showKey]) {
      grouped[showKey] = {
        title: episode.title,
        year: episode.year,
        originalName: episode.originalName,
        type: "tvshow",
        seasons: {},
      };
    }

    // Create season key
    const seasonKey = `S${String(episode.season).padStart(2, "0")}`;

    if (!grouped[showKey].seasons[seasonKey]) {
      grouped[showKey].seasons[seasonKey] = {
        seasonNumber: episode.season,
        episodes: [],
      };
    }

    // Add episode to season
    grouped[showKey].seasons[seasonKey].episodes.push({
      episodeNumber: episode.episode,
      episodeEnd: episode.episodeEnd,
      episodeTitle: episode.episodeTitle,
      originalName: episode.originalName,
      path: episode.path,
      files: episode.files,
      resolution: episode.resolution,
      duration: episode.duration,
    });
  });

  // Sort episodes within each season
  Object.values(grouped).forEach((show) => {
    Object.values(show.seasons).forEach((season) => {
      season.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    });
  });

  return grouped;
}

// Convert grouped episodes to array format
function groupedToArray(grouped) {
  return Object.values(grouped).map((show) => ({
    ...show,
    seasons: Object.values(show.seasons).sort(
      (a, b) => a.seasonNumber - b.seasonNumber
    ),
  }));
}

module.exports = {
  parseTVShowFolderName,
  parseTVShowFileName,
  parseTVShow,
  isTVShow,
  hasEpisodePattern,
  extractSeasonNumber,
  groupEpisodes,
  groupedToArray,
};
