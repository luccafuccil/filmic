// Utility functions to parse and format TV show torrent file names
// Inspired by torrentNameParser.js with TV show specific patterns

const PATTERNS_TO_REMOVE = [
  /\b(720p|1080p|2160p|4k|UHD|HD|SD|CAM|TS|TC|HDCAM|HDTS)\b/gi,

  /\b(x264|x265|h264|h265|HEVC|AVC|XviD|DivX|VP9|AV1)\b/gi,

  /\b(AAC5\.?1|AAC7\.?1|AAC)\b/gi,
  /\b(AC3|DTS|FLAC|MP3)\b/gi,
  /\b(Atmos|TrueHD)\b/gi,
  /\b(DD5\.?1|DD7\.?1|DDP5\.?1|DDP7\.?1|EAC3)\b/gi,
  /\b(DTS-HD\.?MA\.?5\.?1|DTS-HD\.?MA\.?7\.?1|DTS-HD)\b/gi,
  /\bMA\.?5\.?1\b/gi,
  /\bMA\.?7\.?1\b/gi,

  /\b(BluRay|BRRip|BDRip|DVDRip|WEB-?DL|WEBRip|HDTV|PDTV|DVDSCR|SCREENER|REMUX)\b/gi,

  /\b(YIFY|YTS|RARBG|SPARKS|ETRG|EXTENDED|REMASTERED|UNRATED)\b/gi,

  /\b(10bit|8bit|HDR|SDR|PROPER|REPACK|INTERNAL|LIMITED)\b/gi,

  /\b(DUAL|MULTI|DUBBED|SUBBED|LEGENDADO|PT-BR|ENG|ITA|ESP)\b/gi,

  /\b(COMPLETE|EXTENDED|THEATRICAL|IMAX|3D|SBS|HSBS|OU)\b/gi,

  /\bH\.?264\b/gi,
  /\bH\.?265\b/gi,
];

const YEAR_PATTERN = /[\(\[\{]?(19\d{2}|20[0-2]\d)[\)\]\}]?/;

// Episode patterns: S01E01, S1E1, 1x01, S01E01E02 (multi-episode)
const EPISODE_PATTERN = /[Ss](\d{1,2})[Ee](\d{1,2})(?:[Ee](\d{1,2}))?/;
const EPISODE_PATTERN_ALT = /(\d{1,2})[xX](\d{1,2})/;

// Pattern to extract season from folder name: Suits.S02, Suits S02, etc.
const FOLDER_SEASON_PATTERN = /[\.\\_\-\s]S(\d{1,2})$/i;

function parseTVShowName(filename, parentFolderName = null) {
  if (!filename || typeof filename !== "string") {
    return {
      title: "",
      year: null,
      season: null,
      episode: null,
      episodeEnd: null,
      episodeTitle: null,
      originalName: filename || "",
      parsed: false,
    };
  }

  let cleaned = filename;

  // Remove file extension
  cleaned = cleaned.replace(/\.(mp4|mkv|avi|mov|webm|m4v)$/i, "");

  // Extract episode information first
  let season = null;
  let episode = null;
  let episodeEnd = null;
  let episodeMatch = cleaned.match(EPISODE_PATTERN);

  if (!episodeMatch) {
    episodeMatch = cleaned.match(EPISODE_PATTERN_ALT);
    if (episodeMatch) {
      season = parseInt(episodeMatch[1], 10);
      episode = parseInt(episodeMatch[2], 10);
    }
  } else {
    season = parseInt(episodeMatch[1], 10);
    episode = parseInt(episodeMatch[2], 10);
    // Check for multi-episode (S01E01E02)
    if (episodeMatch[3]) {
      episodeEnd = parseInt(episodeMatch[3], 10);
    }
  }

  // If no season found in filename but parentFolderName provided, try to extract from parent
  if (season === null && parentFolderName) {
    const folderSeasonMatch = parentFolderName.match(FOLDER_SEASON_PATTERN);
    if (folderSeasonMatch) {
      season = parseInt(folderSeasonMatch[1], 10);
      // Also check if filename has just episode number (e.g., SuitsE01)
      const episodeOnlyPattern = /[Ee](\d{1,2})(?:[Ee](\d{1,2}))?/;
      const episodeOnlyMatch = cleaned.match(episodeOnlyPattern);
      if (episodeOnlyMatch && !episodeMatch) {
        episode = parseInt(episodeOnlyMatch[1], 10);
        if (episodeOnlyMatch[2]) {
          episodeEnd = parseInt(episodeOnlyMatch[2], 10);
        }
        episodeMatch = episodeOnlyMatch; // Set episodeMatch so we can extract title
      }
    }
  }

  // Extract show title (everything before season/episode indicator)
  let titlePart = cleaned;
  if (episodeMatch) {
    const episodeIndex = cleaned.indexOf(episodeMatch[0]);
    titlePart = cleaned.substring(0, episodeIndex);

    // Try to extract episode title (after episode number, before quality tags)
    let afterEpisode = cleaned.substring(episodeIndex + episodeMatch[0].length);
    // Remove leading separator
    afterEpisode = afterEpisode.replace(/^[\.\-_\s]+/, "");

    // Extract until we hit quality tags (expanded pattern to catch all common resolutions)
    const qualityMatch = afterEpisode.match(
      /\b(360p|480p|576p|720p|1080p|2160p|4k|UHD|BluRay|BRRip|WEB-?DL|WEBRip|HDTV|x264|x265|h264|h265|HEVC)/i
    );
    if (qualityMatch) {
      const episodeTitle = afterEpisode.substring(0, qualityMatch.index).trim();
      if (episodeTitle.length > 0) {
        // Clean and format episode title
        const cleanedEpisodeTitle = episodeTitle
          .replace(/[\._\-]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (cleanedEpisodeTitle.length > 0) {
          episodeMatch.episodeTitle = cleanedEpisodeTitle
            .split(" ")
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join(" ");
        }
      }
    }
  }

  // Extract year from title
  const yearMatch = titlePart.match(YEAR_PATTERN);
  const year = yearMatch ? yearMatch[1] : null;

  if (yearMatch) {
    const yearIndex = titlePart.indexOf(yearMatch[0]);
    titlePart = titlePart.substring(0, yearIndex);
  }

  // Remove quality and release tags
  PATTERNS_TO_REMOVE.forEach((pattern) => {
    titlePart = titlePart.replace(pattern, " ");
  });

  // Replace separators with spaces
  titlePart = titlePart.replace(/[\._\-\+]/g, " ");

  // Remove brackets and their contents
  titlePart = titlePart.replace(/[\[\(\{][^\]\)\}]*[\]\)\}]/g, " ");

  // Clean up whitespace
  titlePart = titlePart.replace(/\s+/g, " ").trim();

  // Title case the show name
  const title = titlePart
    .split(" ")
    .map((word, index) => {
      if (word.length === 0) return "";

      // Keep roman numerals uppercase
      if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)$/i.test(word)) {
        return word.toUpperCase();
      }

      // Lowercase articles and conjunctions (except first word)
      if (
        index > 0 &&
        [
          "a",
          "an",
          "the",
          "and",
          "or",
          "but",
          "in",
          "on",
          "at",
          "to",
          "for",
          "of",
        ].includes(word.toLowerCase())
      ) {
        return word.toLowerCase();
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

  return {
    title: title || filename,
    year: year,
    season: season,
    episode: episode,
    episodeEnd: episodeEnd,
    episodeTitle: episodeMatch?.episodeTitle || null,
    originalName: filename,
    parsed: title.length > 0 && season !== null && episode !== null,
  };
}

function formatTVShowName(filename) {
  const parsed = parseTVShowName(filename);

  if (!parsed.parsed) {
    return parsed.title;
  }

  let formatted = parsed.title;
  if (parsed.year) {
    formatted += ` (${parsed.year})`;
  }

  if (parsed.season !== null && parsed.episode !== null) {
    const seasonStr = String(parsed.season).padStart(2, "0");
    const episodeStr = String(parsed.episode).padStart(2, "0");

    if (parsed.episodeEnd !== null) {
      const episodeEndStr = String(parsed.episodeEnd).padStart(2, "0");
      formatted += ` S${seasonStr}E${episodeStr}E${episodeEndStr}`;
    } else {
      formatted += ` S${seasonStr}E${episodeStr}`;
    }

    if (parsed.episodeTitle) {
      formatted += ` - ${parsed.episodeTitle}`;
    }
  }

  return formatted;
}

function parseBatch(filenames) {
  if (!Array.isArray(filenames)) {
    return [];
  }

  return filenames.map(parseTVShowName);
}

module.exports = {
  parseTVShowName,
  formatTVShowName,
  parseBatch,
};
