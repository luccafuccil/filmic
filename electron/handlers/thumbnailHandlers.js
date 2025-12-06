const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { generateThumbnail } = require("../utils/thumbnailGenerator");

const VIDEO_EXTENSIONS = [
  ".mp4",
  ".mkv",
  ".avi",
  ".mov",
  ".wmv",
  ".flv",
  ".webm",
  ".m4v",
];

function getThumbnailsDir() {
  const thumbnailsDir = path.join(app.getPath("userData"), "thumbnails");
  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
  }
  return thumbnailsDir;
}

function getVideoHash(videoPath) {
  return crypto.createHash("md5").update(videoPath).digest("hex");
}

function findLargestVideoFile(files) {
  const videoFiles = files.filter((file) => {
    const ext = path.extname(file.name).toLowerCase();
    return VIDEO_EXTENSIONS.includes(ext);
  });

  if (videoFiles.length === 0) {
    return null;
  }

  let largestFile = videoFiles[0];
  let largestSize = 0;

  for (const file of videoFiles) {
    try {
      const stats = fs.statSync(file.path);
      if (stats.size > largestSize) {
        largestSize = stats.size;
        largestFile = file;
      }
    } catch (error) {}
  }

  return largestFile;
}

async function handleGenerateThumbnail(event, movie) {
  try {
    console.log("=== Iniciando geração de thumbnail ===");
    console.log("Movie:", movie.title);

    if (!movie || !movie.files || movie.files.length === 0) {
      console.error("Nenhum arquivo de vídeo encontrado");
      return { success: false, error: "Nenhum arquivo de vídeo encontrado" };
    }

    const videoFile = findLargestVideoFile(movie.files);
    if (!videoFile) {
      console.error("Nenhum arquivo de vídeo válido encontrado");
      return {
        success: false,
        error: "Nenhum arquivo de vídeo válido encontrado",
      };
    }

    console.log("Video file:", videoFile.path);

    if (!fs.existsSync(videoFile.path)) {
      console.error("Arquivo de vídeo não existe:", videoFile.path);
      return { success: false, error: "Arquivo de vídeo não encontrado" };
    }

    const videoHash = getVideoHash(videoFile.path);
    const thumbnailsDir = getThumbnailsDir();
    const thumbnailPath = path.join(thumbnailsDir, `${videoHash}.jpg`);

    console.log("Thumbnail path:", thumbnailPath);
    console.log("Thumbnail já existe?", fs.existsSync(thumbnailPath));

    if (fs.existsSync(thumbnailPath)) {
      console.log("Usando thumbnail do cache");
      return {
        success: true,
        thumbnailPath,
        cached: true,
      };
    }

    console.log("Gerando novo thumbnail...");
    await generateThumbnail(videoFile.path, thumbnailPath);
    console.log("Thumbnail gerado com sucesso!");

    return {
      success: true,
      thumbnailPath,
      cached: false,
    };
  } catch (error) {
    console.error("Erro ao gerar thumbnail:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function handleCleanupThumbnails(event, movies) {
  try {
    const thumbnailsDir = getThumbnailsDir();
    const thumbnailFiles = fs.readdirSync(thumbnailsDir);

    const existingVideoHashes = new Set();
    for (const movie of movies) {
      if (movie.files && movie.files.length > 0) {
        const videoFile = findLargestVideoFile(movie.files);
        if (videoFile) {
          const hash = getVideoHash(videoFile.path);
          existingVideoHashes.add(hash);
        }
      }
    }

    let removedCount = 0;
    for (const thumbnailFile of thumbnailFiles) {
      const hash = path.parse(thumbnailFile).name;
      if (!existingVideoHashes.has(hash)) {
        const thumbnailPath = path.join(thumbnailsDir, thumbnailFile);
        fs.unlinkSync(thumbnailPath);
        removedCount++;
      }
    }

    return {
      success: true,
      removedCount,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  handleGenerateThumbnail,
  handleCleanupThumbnails,
};
