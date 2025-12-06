// Utility functions to parse and format common torrent file names

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

  /\b(YIFY|YTS|RARBG|SPARKS|ETRG|EXTENDED|REMASTERED|UNRATED|Directors?\.?Cut)\b/gi,

  /\b(10bit|8bit|HDR|SDR|PROPER|REPACK|INTERNAL|LIMITED)\b/gi,

  /\b(DUAL|MULTI|DUBBED|SUBBED|LEGENDADO|PT-BR|ENG|ITA|ESP)\b/gi,

  /\b(COMPLETE|EXTENDED|THEATRICAL|IMAX|3D|SBS|HSBS|OU)\b/gi,

  /\bH\.?264\b/gi,
  /\bH\.?265\b/gi,
];

const YEAR_PATTERN = /[\(\[\{]?(19\d{2}|20[0-2]\d)[\)\]\}]?/;

function parseTorrentName(filename) {
  if (!filename || typeof filename !== "string") {
    return {
      title: "",
      year: null,
      originalName: filename || "",
      parsed: false,
    };
  }

  let cleaned = filename;

  cleaned = cleaned.replace(/\.(mp4|mkv|avi|mov|webm|m4v)$/i, "");

  const yearMatch = cleaned.match(YEAR_PATTERN);
  const year = yearMatch ? yearMatch[1] : null;

  if (yearMatch) {
    const yearIndex = cleaned.indexOf(yearMatch[0]);
    cleaned = cleaned.substring(0, yearIndex);
  }

  PATTERNS_TO_REMOVE.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, " ");
  });

  cleaned = cleaned.replace(/[\._\-\+]/g, " ");

  cleaned = cleaned.replace(/[\[\(\{][^\]\)\}]*[\]\)\}]/g, " ");

  cleaned = cleaned.replace(/\s+/g, " ").trim();

  const title = cleaned
    .split(" ")
    .map((word, index) => {
      if (word.length === 0) return "";

      if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)$/i.test(word)) {
        return word.toUpperCase();
      }

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
    originalName: filename,
    parsed: title.length > 0 && title !== filename,
  };
}

function formatTorrentName(filename) {
  const parsed = parseTorrentName(filename);

  if (parsed.year) {
    return `${parsed.title} (${parsed.year})`;
  }

  return parsed.title;
}

function parseBatch(filenames) {
  if (!Array.isArray(filenames)) {
    return [];
  }

  return filenames.map(parseTorrentName);
}

module.exports = {
  parseTorrentName,
  formatTorrentName,
  parseBatch,
};
