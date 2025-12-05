// Expected folder name format: title (year)
// Example: Vortex (2021)
function parseMovieFolderName(folderName) {
  const regex = /^(.+?)\s*\((\d{4})\)$/;
  const match = folderName.match(regex);

  if (match) {
    return {
      title: match[1].trim(),
      year: match[2],
      originalName: folderName,
      parsed: true,
    };
  }

  return {
    title: folderName,
    year: null,
    originalName: folderName,
    parsed: false,
  };
}

module.exports = { parseMovieFolderName };
