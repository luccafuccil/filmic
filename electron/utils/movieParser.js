const { parseTorrentName } = require("./torrentNameParser");

// Expected folder/file name format: title (year)
// Example: Vortex (2021)
function parseMovieName(name, isTorrentFile = false) {
  // If it's a torrent-like filename (contains common torrent tags), use specialized parser
  if (isTorrentFile || hasTorrentTags(name)) {
    return parseTorrentName(name);
  }

  // Otherwise use simple regex for clean names
  const regex = /^(.+?)\s*\((\d{4})\)$/;
  const match = name.match(regex);

  if (match) {
    return {
      title: match[1].trim(),
      year: match[2],
      originalName: name,
      parsed: true,
    };
  }

  return {
    title: name,
    year: null,
    originalName: name,
    parsed: false,
  };
}

// Check if filename contains common torrent tags
function hasTorrentTags(name) {
  const torrentIndicators = [
    /\b(720p|1080p|2160p|4k)\b/i,
    /\b(x264|x265|h264|h265|HEVC)\b/i,
    /\b(BluRay|BRRip|WEBRip|WEB-?DL)\b/i,
    /\b(YIFY|YTS|RARBG|ETRG)\b/i,
  ];

  return torrentIndicators.some((pattern) => pattern.test(name));
}

// Backward compatibility
function parseMovieFolderName(folderName) {
  return parseMovieName(folderName, false);
}

// Parse video filename (with torrent tag detection)
function parseMovieFileName(fileName) {
  return parseMovieName(fileName, true);
}

module.exports = {
  parseMovieFolderName,
  parseMovieName,
  parseMovieFileName,
};
