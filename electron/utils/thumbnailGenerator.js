const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");

// Função para resolver o caminho correto do ffmpeg quando empacotado
function getFfmpegPath() {
  const ffmpegStatic = require("ffmpeg-static");
  // Em produção (empacotado), o ffmpeg-static retorna um caminho que pode estar no ASAR
  // Precisamos substituir 'app.asar' por 'app.asar.unpacked' se necessário
  const finalPath = ffmpegStatic.replace("app.asar", "app.asar.unpacked");
  console.log("FFmpeg path:", finalPath);
  console.log("FFmpeg exists:", fs.existsSync(finalPath));
  return finalPath;
}

function getFfprobePath() {
  const ffprobeStatic = require("ffprobe-static");
  // Mesma lógica para o ffprobe
  const finalPath = ffprobeStatic.path.replace("app.asar", "app.asar.unpacked");
  console.log("FFprobe path:", finalPath);
  console.log("FFprobe exists:", fs.existsSync(finalPath));
  return finalPath;
}

ffmpeg.setFfmpegPath(getFfmpegPath());
ffmpeg.setFfprobePath(getFfprobePath());

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
