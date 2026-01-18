const { dialog, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const iconv = require("iconv-lite");
const jschardet = require("jschardet");
const { exec } = require("child_process");
const { promisify } = require("util");
const ffmpegPath = require("ffmpeg-static");
const execPromise = promisify(exec);
const {
  parseMovieFolderName,
  parseMovieFileName,
} = require("../utils/movieParser");
const {
  parseTVShowFileName,
  parseTVShowFolderName,
  isTVShow,
  hasEpisodePattern,
  extractSeasonNumber,
  groupEpisodes,
  groupedToArray,
} = require("../utils/tvShowParser");
const { getVideoMetadata } = require("../utils/thumbnailGenerator");
const {
  getCachedMetadata,
  setCachedMetadata,
} = require("../utils/metadataCache");
const {
  hasCachedSubtitles,
  getCachedSubtitles,
  cacheSubtitles,
} = require("../utils/subtitleCache");

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

async function handleGetDroppedPath(event, filePath) {
  try {
    const stats = await fs.promises.stat(filePath);

    if (stats.isFile()) {
      return path.dirname(filePath);
    }

    return filePath;
  } catch (error) {
    console.error("Error getting dropped path:", error);
    return null;
  }
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

    // Separa arquivos de vídeo na raiz e pastas
    const rootVideoFiles = [];
    const folders = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        folders.push({ name: entry.name, path: fullPath });
      } else {
        const extension = path.extname(entry.name).toLowerCase();
        if (videoExtensions.includes(extension)) {
          rootVideoFiles.push({
            name: entry.name,
            path: fullPath,
            extension: extension,
          });
        }
      }
    }

    // Calcula total de itens para progresso
    const totalCount = rootVideoFiles.length + folders.length;
    let processedCount = 0;

    // Processa arquivos de vídeo na raiz
    for (const videoFile of rootVideoFiles) {
      const nameWithoutExt = path.basename(videoFile.name, videoFile.extension);
      const movieInfo = parseMovieFileName(nameWithoutExt);

      let resolution = null;
      let duration = null;

      try {
        const stats = await fs.promises.stat(videoFile.path);

        let metadata = getCachedMetadata(videoFile.path);

        if (!metadata) {
          const videoMetadata = await getVideoMetadata(videoFile.path);

          if (videoMetadata && videoMetadata.streams) {
            const videoStream = videoMetadata.streams.find(
              (s) => s.codec_type === "video",
            );

            if (videoStream) {
              resolution = `${videoStream.width}x${videoStream.height}`;
            }

            if (videoMetadata.format && videoMetadata.format.duration) {
              duration = Math.round(videoMetadata.format.duration / 60);
            }
          }

          metadata = { resolution, duration };
          setCachedMetadata(videoFile.path, metadata);
        } else {
          resolution = metadata.resolution;
          duration = metadata.duration;
        }
      } catch (error) {
        console.error(
          `Erro ao extrair metadados para ${videoFile.name}:`,
          error,
        );
      }

      processedCount++;
      event.sender.send("movies:progress", {
        current: processedCount,
        total: totalCount,
      });

      movies.push({
        ...movieInfo,
        path: videoFile.path,
        files: [videoFile],
        resolution,
        duration,
        isRootVideo: true,
      });
    }

    // Processa pastas
    for (const folder of folders) {
      const files = await fs.promises.readdir(folder.path, {
        withFileTypes: true,
      });
      const videoFiles = files
        .filter((file) => !file.isDirectory())
        .map((file) => ({
          name: file.name,
          path: path.join(folder.path, file.name),
          extension: path.extname(file.name),
        }));

      const videoFilesOnly = videoFiles.filter((file) =>
        videoExtensions.includes(file.extension.toLowerCase()),
      );

      // Se não houver vídeos, pula a pasta
      if (videoFilesOnly.length === 0) {
        processedCount++;
        event.sender.send("movies:progress", {
          current: processedCount,
          total: totalCount,
        });
        continue;
      }

      let resolution = null;
      let duration = null;

      // Prioriza o nome da pasta para identificação do filme
      let movieInfo = parseMovieFileName(folder.name);

      try {
        const filesWithSize = await Promise.all(
          videoFilesOnly.map(async (file) => {
            const stats = await fs.promises.stat(file.path);
            return {
              ...file,
              size: stats.size,
            };
          }),
        );

        filesWithSize.sort((a, b) => b.size - a.size);
        const largestVideo = filesWithSize[0];

        // Se o nome da pasta não foi identificado corretamente, tenta usar o nome do arquivo
        if (!movieInfo.parsed) {
          const nameWithoutExt = path.basename(
            largestVideo.name,
            largestVideo.extension,
          );
          const fileBasedInfo = parseMovieFileName(nameWithoutExt);

          // Só usa o nome do arquivo se ele foi identificado com sucesso
          if (fileBasedInfo.parsed) {
            movieInfo = fileBasedInfo;
          }
        }

        let metadata = getCachedMetadata(largestVideo.path);

        if (!metadata) {
          const videoMetadata = await getVideoMetadata(largestVideo.path);

          if (videoMetadata && videoMetadata.streams) {
            const videoStream = videoMetadata.streams.find(
              (s) => s.codec_type === "video",
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
        console.error(`Erro ao extrair metadados para ${folder.name}:`, error);
      }

      processedCount++;
      event.sender.send("movies:progress", {
        current: processedCount,
        total: totalCount,
      });

      movies.push({
        ...movieInfo,
        path: folder.path,
        files: videoFiles,
        resolution,
        duration,
        isRootVideo: false,
      });
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
      videoExtensions.includes(file.extension.toLowerCase()),
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
      }),
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
    console.log("[SUBTITLE] Attempting to load subtitles for:", videoPath);

    // Primeiro, tentar legendas externas (.srt)
    const basePath = videoPath.replace(/\.[^.]+$/, "");
    const srtPath = basePath + ".srt";
    console.log("[SUBTITLE] Looking for .srt at:", srtPath);

    try {
      await fs.promises.access(srtPath);
      console.log("[SUBTITLE] .srt file found!");

      const buffer = await fs.promises.readFile(srtPath);
      console.log("[SUBTITLE] File read, buffer size:", buffer.length);

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
        } catch (e) {
          console.log(
            "[SUBTITLE] Failed to decode with",
            encoding,
            ":",
            e.message,
          );
        }
      }

      if (!bestContent) {
        bestContent = iconv.decode(buffer, "windows-1252");
        bestEncoding = "windows-1252";
      }

      console.log("[SUBTITLE] Best encoding found:", bestEncoding);
      console.log("[SUBTITLE] Content length:", bestContent.length);
      return {
        success: true,
        content: bestContent,
        path: srtPath,
        type: "external",
      };
    } catch {
      console.log(
        "[SUBTITLE] .srt file not found, checking for internal subtitles",
      );
    }

    // Se não encontrou .srt externo, verificar legendas internas no MKV
    const ext = path.extname(videoPath).toLowerCase();
    if (ext === ".mkv" || ext === ".mp4") {
      try {
        // Verificar se existe cache
        const hasCache = await hasCachedSubtitles(videoPath);
        if (hasCache) {
          const cached = await getCachedSubtitles(videoPath);
          if (cached && cached.tracks && cached.extractedContent) {
            console.log("[SUBTITLE] Using cached subtitles");
            return {
              success: true,
              type: "internal",
              tracks: cached.tracks,
              videoPath,
              cached: true,
              extractedContent: cached.extractedContent,
            };
          }
        }

        console.log("[SUBTITLE] Checking for internal subtitle tracks...");

        // Listar tracks de legenda no arquivo (ffmpeg sempre retorna info no stderr)
        let probeOutput = "";
        try {
          await execPromise(`"${ffmpegPath}" -i "${videoPath}" -hide_banner`);
        } catch (error) {
          // FFmpeg retorna erro (exit code 1) quando não há output file, mas isso é esperado
          // A informação que queremos está no stderr, que é capturado no error.stderr
          probeOutput = error.stderr || error.stdout || "";
        }

        console.log(
          "[SUBTITLE] FFmpeg output received, length:",
          probeOutput.length,
        );

        // Procurar por tracks de subtitle
        const subtitleMatches = [
          ...probeOutput.matchAll(
            /Stream #0:(\d+)(?:\((\w+)\))?: Subtitle: (\w+)(.*)/gi,
          ),
        ];

        if (subtitleMatches.length > 0) {
          console.log(
            `[SUBTITLE] Found ${subtitleMatches.length} internal subtitle track(s)`,
          );

          const tracks = subtitleMatches.map((match, index) => {
            const streamIndex = match[1];
            const languageCode = match[2] || "und"; // Código do idioma como 'eng', 'spa', etc
            const codec = match[3];
            const metadata = match[4];

            // Mapear códigos de idioma para nomes completos
            const languageNames = {
              eng: "English",
              spa: "Spanish",
              por: "Portuguese",
              fre: "French",
              ger: "German",
              ita: "Italian",
              jpn: "Japanese",
              kor: "Korean",
              chi: "Chinese",
              rus: "Russian",
              ara: "Arabic",
              hin: "Hindi",
              und: "Unknown",
            };

            const languageName =
              languageNames[languageCode.toLowerCase()] || languageCode;

            console.log(`[SUBTITLE] Track ${index}:`, {
              streamIndex,
              languageCode,
              languageName,
              codec,
              metadata,
            });

            return {
              index: parseInt(streamIndex),
              language: languageCode,
              codec,
              title: languageName, // Usar nome completo do idioma como título
              streamIndex: `0:${streamIndex}`,
            };
          });

          return {
            success: true,
            type: "internal",
            tracks,
            videoPath,
            cached: false,
          };
        } else {
          console.log("[SUBTITLE] No internal subtitle tracks found in output");
        }
      } catch (error) {
        console.error(
          "[SUBTITLE] Error checking internal subtitles:",
          error.message,
        );
      }
    }

    return { success: false, error: "Nenhuma legenda encontrada" };
  } catch (error) {
    console.error("[SUBTITLE] Error:", error);
    return { success: false, error: error.message };
  }
}

// Nova função para extrair uma track de legenda específica
async function handleExtractSubtitleTrack(event, videoPath, trackIndex) {
  try {
    console.log(
      `[SUBTITLE] Extracting subtitle track ${trackIndex} from:`,
      videoPath,
    );

    const tempDir = path.join(require("os").tmpdir(), "filmic-subtitles");
    await fs.promises.mkdir(tempDir, { recursive: true });

    const outputPath = path.join(tempDir, `subtitle_${Date.now()}.srt`);

    // Extrair a track de legenda usando ffmpeg
    const command = `"${ffmpegPath}" -i "${videoPath}" -map 0:${trackIndex} -c:s srt "${outputPath}" -y`;
    console.log("[SUBTITLE] Executing:", command);

    await execPromise(command);

    // Ler o arquivo extraído
    const buffer = await fs.promises.readFile(outputPath);
    let content = buffer.toString("utf-8");

    // Limpar arquivo temporário
    try {
      await fs.promises.unlink(outputPath);
    } catch (e) {
      console.log("[SUBTITLE] Could not delete temp file:", e.message);
    }

    console.log(
      "[SUBTITLE] Successfully extracted subtitle, length:",
      content.length,
    );

    return {
      success: true,
      content,
      path: outputPath,
      type: "extracted",
    };
  } catch (error) {
    console.error("[SUBTITLE] Error extracting subtitle track:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Função para salvar cache de legendas
async function handleCacheSubtitles(
  event,
  videoPath,
  tracks,
  extractedContent,
) {
  try {
    await cacheSubtitles(videoPath, tracks, extractedContent);
    return { success: true };
  } catch (error) {
    console.error("[SUBTITLE] Error caching subtitles:", error);
    return { success: false, error: error.message };
  }
}

async function handleOpenInExternalPlayer(event, videoPath, playerPath = null) {
  try {
    if (playerPath) {
      // Open with custom player
      const { spawn } = require("child_process");
      spawn(playerPath, [videoPath], { detached: true, stdio: "ignore" });
    } else {
      // Open with default player
      await shell.openPath(videoPath);
    }
    return { success: true };
  } catch (error) {
    console.error("[FileHandler] Error opening external player:", error);
    return { success: false, error: error.message };
  }
}

async function handleSelectPlayerExecutable() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "Executável", extensions: ["exe"] },
      { name: "Todos os arquivos", extensions: ["*"] },
    ],
    title: "Selecione o executável do player",
  });

  return canceled ? null : filePaths[0];
}

// Unified media handler - scans for both movies and TV shows
async function handleGetMedia(event, dirPath) {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const movies = [];
    const tvShowEpisodes = [];
    const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"];

    // Separate root video files and folders
    const rootVideoFiles = [];
    const folders = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        folders.push({ name: entry.name, path: fullPath });
      } else {
        const extension = path.extname(entry.name).toLowerCase();
        if (videoExtensions.includes(extension)) {
          rootVideoFiles.push({
            name: entry.name,
            path: fullPath,
            extension: extension,
          });
        }
      }
    }

    // Calculate total for progress
    const totalCount = rootVideoFiles.length + folders.length;
    let processedCount = 0;

    // Process root video files
    for (const videoFile of rootVideoFiles) {
      const nameWithoutExt = path.basename(videoFile.name, videoFile.extension);

      // Auto-detect if it's a TV show or movie
      const isTVShowFile = hasEpisodePattern(nameWithoutExt);

      let mediaInfo;
      if (isTVShowFile) {
        mediaInfo = parseTVShowFileName(nameWithoutExt);
      } else {
        mediaInfo = parseMovieFileName(nameWithoutExt);
      }

      let resolution = null;
      let duration = null;

      try {
        const stats = await fs.promises.stat(videoFile.path);
        let metadata = getCachedMetadata(videoFile.path);

        if (!metadata) {
          const videoMetadata = await getVideoMetadata(videoFile.path);

          if (videoMetadata && videoMetadata.streams) {
            const videoStream = videoMetadata.streams.find(
              (s) => s.codec_type === "video",
            );

            if (videoStream) {
              resolution = `${videoStream.width}x${videoStream.height}`;
            }

            if (videoMetadata.format && videoMetadata.format.duration) {
              duration = Math.round(videoMetadata.format.duration / 60);
            }
          }

          metadata = { resolution, duration };
          setCachedMetadata(videoFile.path, metadata);
        } else {
          resolution = metadata.resolution;
          duration = metadata.duration;
        }
      } catch (error) {
        console.error(
          `Error extracting metadata for ${videoFile.name}:`,
          error,
        );
      }

      processedCount++;
      event.sender.send("media:progress", {
        current: processedCount,
        total: totalCount,
      });

      if (isTVShowFile) {
        tvShowEpisodes.push({
          ...mediaInfo,
          path: videoFile.path,
          files: [videoFile],
          resolution,
          duration,
          isRootVideo: true,
          type: "tvshow",
        });
      } else {
        movies.push({
          ...mediaInfo,
          path: videoFile.path,
          files: [videoFile],
          resolution,
          duration,
          isRootVideo: true,
          type: "movie",
        });
      }
    }

    // Process folders
    for (const folder of folders) {
      const files = await fs.promises.readdir(folder.path, {
        withFileTypes: true,
      });

      const videoFiles = files
        .filter((file) => !file.isDirectory())
        .map((file) => ({
          name: file.name,
          path: path.join(folder.path, file.name),
          extension: path.extname(file.name),
        }));

      const videoFilesOnly = videoFiles.filter((file) =>
        videoExtensions.includes(file.extension.toLowerCase()),
      );

      // Skip if no videos
      if (videoFilesOnly.length === 0) {
        processedCount++;
        event.sender.send("media:progress", {
          current: processedCount,
          total: totalCount,
        });
        continue;
      }

      // Check if folder contains TV show episodes
      const hasTVShowEpisodes = videoFilesOnly.some((file) =>
        hasEpisodePattern(file.name),
      );

      if (hasTVShowEpisodes) {
        // Process as TV show folder
        // Check for season subfolders
        const subfolders = files.filter((f) => f.isDirectory());
        const seasonFolders = subfolders.filter((f) =>
          /season|^s\d{1,2}$/i.test(f.name),
        );

        if (seasonFolders.length > 0) {
          // Nested structure: Show/Season 01/episodes
          for (const seasonFolder of seasonFolders) {
            const seasonPath = path.join(folder.path, seasonFolder.name);
            const seasonNumber = extractSeasonNumber(seasonFolder.name);

            const seasonFiles = await fs.promises.readdir(seasonPath, {
              withFileTypes: true,
            });

            const seasonVideoFiles = seasonFiles
              .filter((file) => !file.isDirectory())
              .map((file) => ({
                name: file.name,
                path: path.join(seasonPath, file.name),
                extension: path.extname(file.name),
              }))
              .filter((file) =>
                videoExtensions.includes(file.extension.toLowerCase()),
              );

            for (const videoFile of seasonVideoFiles) {
              const nameWithoutExt = path.basename(
                videoFile.name,
                videoFile.extension,
              );
              const episodeInfo = parseTVShowFileName(
                nameWithoutExt,
                seasonFolder.name,
              );

              // Use folder name for show title if not parsed from filename
              if (!episodeInfo.parsed || !episodeInfo.title) {
                const folderInfo = parseTVShowFolderName(folder.name);
                episodeInfo.title = folderInfo.title;
                episodeInfo.year = folderInfo.year;
              }

              // Override season number if extracted from folder
              if (seasonNumber !== null) {
                episodeInfo.season = seasonNumber;
              }

              let resolution = null;
              let duration = null;

              try {
                let metadata = getCachedMetadata(videoFile.path);

                if (!metadata) {
                  const videoMetadata = await getVideoMetadata(videoFile.path);

                  if (videoMetadata && videoMetadata.streams) {
                    const videoStream = videoMetadata.streams.find(
                      (s) => s.codec_type === "video",
                    );

                    if (videoStream) {
                      resolution = `${videoStream.width}x${videoStream.height}`;
                    }

                    if (videoMetadata.format && videoMetadata.format.duration) {
                      duration = Math.round(videoMetadata.format.duration / 60);
                    }
                  }

                  metadata = { resolution, duration };
                  setCachedMetadata(videoFile.path, metadata);
                } else {
                  resolution = metadata.resolution;
                  duration = metadata.duration;
                }
              } catch (error) {
                console.error(
                  `Error extracting metadata for ${videoFile.name}:`,
                  error,
                );
              }

              tvShowEpisodes.push({
                ...episodeInfo,
                path: videoFile.path,
                files: [videoFile],
                resolution,
                duration,
                isRootVideo: false,
                type: "tvshow",
              });
            }
          }
        } else {
          // Flat structure: Show/episodes
          for (const videoFile of videoFilesOnly) {
            const nameWithoutExt = path.basename(
              videoFile.name,
              videoFile.extension,
            );
            const episodeInfo = parseTVShowFileName(
              nameWithoutExt,
              folder.name,
            );

            // Use folder name for show title if not parsed from filename
            if (!episodeInfo.parsed || !episodeInfo.title) {
              const folderInfo = parseTVShowFolderName(folder.name);
              episodeInfo.title = folderInfo.title;
              episodeInfo.year = folderInfo.year;
            }

            let resolution = null;
            let duration = null;

            try {
              let metadata = getCachedMetadata(videoFile.path);

              if (!metadata) {
                const videoMetadata = await getVideoMetadata(videoFile.path);

                if (videoMetadata && videoMetadata.streams) {
                  const videoStream = videoMetadata.streams.find(
                    (s) => s.codec_type === "video",
                  );

                  if (videoStream) {
                    resolution = `${videoStream.width}x${videoStream.height}`;
                  }

                  if (videoMetadata.format && videoMetadata.format.duration) {
                    duration = Math.round(videoMetadata.format.duration / 60);
                  }
                }

                metadata = { resolution, duration };
                setCachedMetadata(videoFile.path, metadata);
              } else {
                resolution = metadata.resolution;
                duration = metadata.duration;
              }
            } catch (error) {
              console.error(
                `Error extracting metadata for ${videoFile.name}:`,
                error,
              );
            }

            tvShowEpisodes.push({
              ...episodeInfo,
              path: videoFile.path,
              files: [videoFile],
              resolution,
              duration,
              isRootVideo: false,
              type: "tvshow",
            });
          }
        }
      } else {
        // Process as movie folder
        let resolution = null;
        let duration = null;

        let movieInfo = parseMovieFileName(folder.name);

        try {
          const filesWithSize = await Promise.all(
            videoFilesOnly.map(async (file) => {
              const stats = await fs.promises.stat(file.path);
              return {
                ...file,
                size: stats.size,
              };
            }),
          );

          filesWithSize.sort((a, b) => b.size - a.size);
          const largestVideo = filesWithSize[0];

          if (!movieInfo.parsed) {
            const nameWithoutExt = path.basename(
              largestVideo.name,
              largestVideo.extension,
            );
            const fileBasedInfo = parseMovieFileName(nameWithoutExt);

            if (fileBasedInfo.parsed) {
              movieInfo = fileBasedInfo;
            }
          }

          let metadata = getCachedMetadata(largestVideo.path);

          if (!metadata) {
            const videoMetadata = await getVideoMetadata(largestVideo.path);

            if (videoMetadata && videoMetadata.streams) {
              const videoStream = videoMetadata.streams.find(
                (s) => s.codec_type === "video",
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
          console.error(`Error extracting metadata for ${folder.name}:`, error);
        }

        movies.push({
          ...movieInfo,
          path: folder.path,
          files: videoFiles,
          resolution,
          duration,
          isRootVideo: false,
          type: "movie",
        });
      }

      processedCount++;
      event.sender.send("media:progress", {
        current: processedCount,
        total: totalCount,
      });
    }

    // Group TV show episodes by show and season
    const groupedShows = groupEpisodes(tvShowEpisodes);
    const tvShows = groupedToArray(groupedShows);

    // Combine movies and TV shows
    const allMedia = [...movies, ...tvShows];

    return { success: true, data: allMedia, movies, tvShows };
  } catch (error) {
    console.error("[FileHandler] Error in handleGetMedia:", error);
    return { success: false, error: error.message };
  }
}

// Get video file for episode
async function handleGetEpisodeVideoFile(event, show, season, episode) {
  try {
    const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"];

    // Find the season
    const seasonData = show.seasons.find((s) => s.seasonNumber === season);
    if (!seasonData) {
      return { success: false, error: "Season not found" };
    }

    // Find the episode
    const episodeData = seasonData.episodes.find(
      (ep) => ep.episodeNumber === episode,
    );
    if (!episodeData) {
      return { success: false, error: "Episode not found" };
    }

    // Return the video path
    const fileUri = `file:///${episodeData.path.replace(/\\/g, "/")}`;

    return {
      success: true,
      videoPath: episodeData.path,
      videoUri: fileUri,
      fileName: path.basename(episodeData.path),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  handleOpenFile,
  handleOpenFolder,
  handleGetDroppedPath,
  handleReadFile,
  handleWriteFile,
  handleFileExists,
  handleReadDirectory,
  handleGetMovies,
  handleGetMedia,
  handleGetVideoFile,
  handleGetEpisodeVideoFile,
  handleGetSubtitles,
  handleExtractSubtitleTrack,
  handleCacheSubtitles,
  handleOpenInExternalPlayer,
  handleSelectPlayerExecutable,
};
