const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/win32-x64").path;
const ffprobePath = require("@ffprobe-installer/win32-x64").path;
const path = require("path");
const fs = require("fs");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

async function generateThumbnail(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        return reject(
          new Error(`Erro ao obter metadados do vídeo: ${err.message}`)
        );
      }

      const duration = metadata.format.duration;
      if (!duration) {
        return reject(
          new Error("Não foi possível determinar a duração do vídeo")
        );
      }

      const timestamp = duration * 0.15;

      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      ffmpeg(videoPath)
        .outputOptions(["-vframes 1", "-q:v 2"])
        .seekInput(timestamp)
        .output(outputPath)
        .on("end", () => {
          resolve(outputPath);
        })
        .on("error", (err) => {
          reject(new Error(`Erro ao gerar thumbnail: ${err.message}`));
        })
        .run();
    });
  });
}

async function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        return reject(new Error(`Erro ao obter metadados: ${err.message}`));
      }
      resolve(metadata);
    });
  });
}

module.exports = {
  generateThumbnail,
  getVideoMetadata,
};
