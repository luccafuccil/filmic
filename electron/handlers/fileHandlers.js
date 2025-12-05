const { dialog, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const iconv = require("iconv-lite");
const jschardet = require("jschardet");
const { parseMovieFolderName } = require("../utils/movieParser");
const { getVideoMetadata } = require("../utils/thumbnailGenerator");
const {
  getCachedMetadata,
  setCachedMetadata,
} = require("../utils/metadataCache");

async function handleOpenFile() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "Vídeos", extensions: ["mp4", "mov", "avi", "mkv"] },
      { name: "Todos os arquivos", extensions: ["*"] },
    ],
  });

  return canceled ? null : filePaths[0];
}

async function handleOpenFolder() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  return canceled ? null : filePaths[0];
}

async function handleReadFile(event, filePath) {
  try {
    const data = await fs.promises.readFile(filePath, "utf-8");
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleWriteFile(event, filePath, content) {
  try {
    await fs.promises.writeFile(filePath, content, "utf-8");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleFileExists(event, filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function handleReadDirectory(event, dirPath) {
  try {
    const result = await readDirectoryRecursive(dirPath);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function readDirectoryRecursive(dirPath) {
  const items = [];
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const item = {
      name: entry.name,
      path: fullPath,
      isDirectory: entry.isDirectory(),
    };

    if (entry.isDirectory()) {
      item.children = await readDirectoryRecursive(fullPath);
    } else {
      const stats = await fs.promises.stat(fullPath);
      item.size = stats.size;
      item.extension = path.extname(entry.name);
    }

    items.push(item);
  }

  return items;
}

async function handleGetMovies(event, dirPath) {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const movies = [];
    const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"];

    let processedCount = 0;
    const totalCount = entries.filter((e) => e.isDirectory()).length;

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(dirPath, entry.name);
        const movieInfo = parseMovieFolderName(entry.name);

        const files = await fs.promises.readdir(fullPath, {
          withFileTypes: true,
        });
        const videoFiles = files
          .filter((file) => !file.isDirectory())
          .map((file) => ({
            name: file.name,
            path: path.join(fullPath, file.name),
            extension: path.extname(file.name),
          }));

        const videoFilesOnly = videoFiles.filter((file) =>
          videoExtensions.includes(file.extension.toLowerCase())
        );

        let resolution = null;
        let duration = null;

        if (videoFilesOnly.length > 0) {
          try {
            const filesWithSize = await Promise.all(
              videoFilesOnly.map(async (file) => {
                const stats = await fs.promises.stat(file.path);
                return {
                  ...file,
                  size: stats.size,
                };
              })
            );

            filesWithSize.sort((a, b) => b.size - a.size);
            const largestVideo = filesWithSize[0];

            let metadata = getCachedMetadata(largestVideo.path);

            if (!metadata) {
              const videoMetadata = await getVideoMetadata(largestVideo.path);

              if (videoMetadata && videoMetadata.streams) {
                const videoStream = videoMetadata.streams.find(
                  (s) => s.codec_type === "video"
                );

                if (videoStream) {
                  resolution = `${videoStream.width}x${videoStream.height}`;
                }

                if (videoMetadata.format && videoMetadata.format.duration) {
                  duration = Math.round(videoMetadata.format.duration / 60);
                }
              }

              metadata = { resolution, duration };
              setCachedMetadata(largestVideo.path, metadata);
            } else {
              resolution = metadata.resolution;
              duration = metadata.duration;
            }
          } catch (error) {
            console.error(
              `Erro ao extrair metadados para ${entry.name}:`,
              error
            );
            // Em caso de erro, resolution e duration permanecem null
          }
        }

        processedCount++;
        event.sender.send("movies:progress", {
          current: processedCount,
          total: totalCount,
        });

        movies.push({
          ...movieInfo,
          path: fullPath,
          files: videoFiles,
          resolution,
          duration,
        });
      }
    }

    return { success: true, data: movies };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleGetVideoFile(event, movie) {
  try {
    const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"];

    const videoFiles = movie.files.filter((file) =>
      videoExtensions.includes(file.extension.toLowerCase())
    );

    if (videoFiles.length === 0) {
      return { success: false, error: "Nenhum arquivo de vídeo encontrado" };
    }

    const filesWithSize = await Promise.all(
      videoFiles.map(async (file) => {
        const stats = await fs.promises.stat(file.path);
        return {
          ...file,
          size: stats.size,
        };
      })
    );

    filesWithSize.sort((a, b) => b.size - a.size);
    const largestFile = filesWithSize[0];

    const fileUri = `file:///${largestFile.path.replace(/\\/g, "/")}`;

    return {
      success: true,
      videoPath: largestFile.path,
      videoUri: fileUri,
      fileName: largestFile.name,
      size: largestFile.size,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleGetSubtitles(event, videoPath) {
  try {
    const basePath = videoPath.replace(/\.[^.]+$/, "");
    const srtPath = basePath + ".srt";

    try {
      await fs.promises.access(srtPath);

      const buffer = await fs.promises.readFile(srtPath);

      const encodingsToTry = [
        "windows-1252",
        "ISO-8859-1", // Latin1
        "UTF-8", // Padrão moderno
        "cp1252", // Windows Latin1
      ];

      let bestContent = null;
      let bestEncoding = null;
      let bestScore = -1;

      for (const encoding of encodingsToTry) {
        try {
          const decoded = iconv.decode(buffer, encoding);

          const portugueseChars = (
            decoded.match(/[áéíóúàâêôãõçÁÉÍÓÚÀÂÊÔÃÕÇ]/g) || []
          ).length;
          const invalidChars = (decoded.match(/[�\u0000-\u001f]/g) || [])
            .length;
          const weirdChars = (
            decoded.match(/[\u0400-\u04FF\u0500-\u052F]/g) || []
          ).length;

          const score = portugueseChars - invalidChars * 10 - weirdChars * 10;

          if (score > bestScore) {
            bestScore = score;
            bestContent = decoded;
            bestEncoding = encoding;
          }
        } catch (e) {}
      }

      if (!bestContent) {
        bestContent = iconv.decode(buffer, "windows-1252");
        bestEncoding = "windows-1252";
      }

      return { success: true, content: bestContent, path: srtPath };
    } catch {
      return { success: false, error: "Nenhuma legenda encontrada" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleOpenInExternalPlayer(event, videoPath) {
  try {
    await shell.openPath(videoPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  handleOpenFile,
  handleOpenFolder,
  handleReadFile,
  handleWriteFile,
  handleFileExists,
  handleReadDirectory,
  handleGetMovies,
  handleGetVideoFile,
  handleGetSubtitles,
  handleOpenInExternalPlayer,
};
