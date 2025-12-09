import { useState, useRef, useEffect } from "react";
import videojs from "video.js";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { electronAPI } from "../services/electronAPI";
import { formatTime } from "../utils/movieHelpers";
import "../styles/components/VideoPlayer.css";

export function VideoPlayer({
  videoUri,
  onClose,
  movieId,
  movieTitle,
  videoPath,
  mediaType,
  showInfo,
}) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [subtitles, setSubtitles] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [hasAudio, setHasAudio] = useState(true);
  const [showAudioWarning, setShowAudioWarning] = useState(false);
  const [hasHardcodedSubs, setHasHardcodedSubs] = useState(false);
  const [useHardcodedSubs, setUseHardcodedSubs] = useState(false);
  const [internalSubtitles, setInternalSubtitles] = useState([]);
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(false);
  const [activeTrackIndex, setActiveTrackIndex] = useState(-1);
  const [showUpNext, setShowUpNext] = useState(false);
  const [upNextCountdown, setUpNextCountdown] = useState(10);
  const [nextEpisode, setNextEpisode] = useState(null);

  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const upNextTimeoutRef = useRef(null);
  const upNextIntervalRef = useRef(null);

  useEffect(() => {
    // Adicionar traduções em português para o video.js
    try {
      if (videojs && videojs.addLanguage) {
        videojs.addLanguage("pt-BR", {
          Subtitles: "Legendas",
          "subtitles off": "legendas desativadas",
          Captions: "Legendas",
          "captions off": "legendas desativadas",
          Play: "Reproduzir",
          Pause: "Pausar",
          Mute: "Silenciar",
          Unmute: "Ativar som",
          Fullscreen: "Tela cheia",
          "Non-Fullscreen": "Sair da tela cheia",
          "Picture-in-Picture": "Picture-in-Picture",
          "Exit Picture-in-Picture": "Sair do Picture-in-Picture",
          "Playback Rate": "Velocidade",
          Speed: "Velocidade",
          "Current Time": "Tempo atual",
          Duration: "Duração",
          "Remaining Time": "Tempo restante",
          "Volume Level": "Nível de volume",
        });
      }
    } catch (err) {
      console.warn("Failed to add video.js translations:", err);
    }

    if (!playerRef.current) {
      const videoElement = document.createElement("video-js");

      videoElement.classList.add("vjs-big-play-centered");
      videoElement.classList.add("vjs-filmic");
      videoRef.current.appendChild(videoElement);

      const player = (playerRef.current = videojs(
        videoElement,
        {
          controls: true,
          autoplay: true,
          preload: "auto",
          language: "pt-BR",
          width: window.innerWidth,
          height: window.innerHeight,
          playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
          sources: [
            {
              src: videoUri,
              type: "video/mp4",
            },
          ],
          controlBar: {
            children: [
              "playToggle",
              "volumePanel",
              "currentTimeDisplay",
              "timeDivider",
              "durationDisplay",
              "progressControl",
              "playbackRateMenuButton",
              "subtitlesButton",
              "fullscreenToggle",
            ],
          },
          textTrackSettings: true,
          html5: {
            nativeTextTracks: false,
          },
        },
        () => {
          console.log("[VideoPlayer] Player is ready");

          player.on("play", () => setIsPlaying(true));
          player.on("pause", () => setIsPlaying(false));
          player.on("timeupdate", () => {
            setCurrentTime(player.currentTime());
          });
          player.on("loadedmetadata", () => {
            setDuration(player.duration());
            console.log("[VideoPlayer] Metadata loaded");

            setTimeout(() => {
              const tech = player.tech();
              if (tech && tech.el_) {
                const hasAudioTracks =
                  tech.el_.audioTracks?.length > 0 ||
                  tech.el_.webkitAudioDecodedByteCount > 0 ||
                  tech.el_.mozHasAudio;
                setHasAudio(hasAudioTracks);
                if (!hasAudioTracks) {
                  setShowAudioWarning(true);
                }
              }
            }, 1000);
          });

          player.on("loadeddata", () => {
            console.log("[VideoPlayer] Data loaded, checking text tracks");
            const textTracks = player.textTracks();
            console.log("[VideoPlayer] Text tracks found:", textTracks.length);

            if (textTracks && textTracks.length > 0) {
              const tracks = [];
              for (let i = 0; i < textTracks.length; i++) {
                const track = textTracks[i];
                console.log(`[VideoPlayer] Track ${i}:`, {
                  kind: track.kind,
                  label: track.label,
                  language: track.language,
                  mode: track.mode,
                });

                if (track.kind === "subtitles" || track.kind === "captions") {
                  tracks.push({
                    kind: track.kind,
                    label: track.label || `Legenda ${i + 1}`,
                    language: track.language,
                    id: track.id || `track-${i}`,
                    index: i,
                  });
                }
              }

              if (tracks.length > 0) {
                console.log(
                  "[VideoPlayer] Internal subtitle tracks found:",
                  tracks
                );
                setHasHardcodedSubs(true);
              }
            }
          });

          player.textTracks().addEventListener("addtrack", (e) => {
            console.log("[VideoPlayer] Track added:", e.track);
            const textTracks = player.textTracks();
            const tracks = [];
            for (let i = 0; i < textTracks.length; i++) {
              const track = textTracks[i];
              if (track.kind === "subtitles" || track.kind === "captions") {
                tracks.push({
                  kind: track.kind,
                  label: track.label || `Legenda ${i + 1}`,
                  language: track.language,
                  id: track.id || `track-${i}`,
                  index: i,
                });
              }
            }
            if (tracks.length > 0) {
              setHasHardcodedSubs(true);
            }
          });

          electronAPI.getWatchProgress(movieId).then((progress) => {
            if (progress) {
              player.currentTime(progress.time);
            }
          });
        }
      ));
    } else {
      const player = playerRef.current;
      player.src([
        {
          src: videoUri,
          type: "video/mp4",
        },
      ]);
    }
  }, [videoUri, movieId]);

  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const time = currentTimeRef.current;
      const dur = durationRef.current;

      if (playerRef.current && dur > 0) {
        const percentage = (time / dur) * 100;

        if (percentage >= 95) {
          // For TV shows, trigger Up Next overlay
          if (mediaType === "tvshow" && showInfo && !showUpNext) {
            const nextEp = await electronAPI.findNextEpisode(
              showInfo.title,
              showInfo.year,
              showInfo.allEpisodes
            );

            if (nextEp) {
              setNextEpisode(nextEp);
              setShowUpNext(true);
              setUpNextCountdown(10);

              // Start countdown
              upNextIntervalRef.current = setInterval(() => {
                setUpNextCountdown((prev) => {
                  if (prev <= 1) {
                    playNextEpisode(nextEp);
                    return 0;
                  }
                  return prev - 1;
                });
              }, 1000);
            }
          }

          // Remove progress for movies or completed episodes
          if (mediaType === "movie") {
            await electronAPI.removeWatchProgress(movieId);
          } else if (mediaType === "tvshow") {
            await electronAPI.removeWatchProgress(movieId);
          }
        } else {
          const progress = {
            time: time,
            duration: dur,
            percentage: percentage,
          };

          if (mediaType === "movie") {
            await electronAPI.saveWatchProgress(movieId, progress);
          } else if (mediaType === "tvshow" && showInfo) {
            await electronAPI.saveEpisodeProgress(
              showInfo.title,
              showInfo.year,
              showInfo.season,
              showInfo.episode,
              progress
            );
          }
        }
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      if (upNextIntervalRef.current) {
        clearInterval(upNextIntervalRef.current);
      }
    };
  }, [movieId, mediaType, showInfo, showUpNext]);

  useEffect(() => {
    async function loadSubtitles() {
      if (!videoPath || !playerRef.current) return;

      try {
        setIsLoadingSubtitles(true);
        console.log("[VideoPlayer] Loading subtitles for:", videoPath);
        const result = await electronAPI.getSubtitles(videoPath);
        console.log("[VideoPlayer] Subtitle result:", result);

        if (result.success) {
          const player = playerRef.current;

          if (result.type === "internal") {
            console.log(
              "[VideoPlayer] Found internal subtitles:",
              result.tracks
            );
            setInternalSubtitles(result.tracks);

            let extractedContent = [];

            if (result.cached && result.extractedContent) {
              console.log("[VideoPlayer] Using cached subtitle content");
              extractedContent = result.extractedContent;
            } else {
              console.log("[VideoPlayer] Extracting subtitle tracks...");
              for (let i = 0; i < result.tracks.length; i++) {
                const track = result.tracks[i];
                console.log(`[VideoPlayer] Extracting track ${i}:`, track);

                try {
                  const extractResult = await electronAPI.extractSubtitleTrack(
                    result.videoPath,
                    track.index
                  );

                  if (extractResult.success) {
                    console.log(
                      `[VideoPlayer] Successfully extracted track ${i}`
                    );
                    extractedContent.push({
                      trackIndex: track.index,
                      content: extractResult.content,
                    });
                  } else {
                    console.error(
                      `[VideoPlayer] Failed to extract track ${i}:`,
                      extractResult.error
                    );
                  }
                } catch (err) {
                  console.error(
                    `[VideoPlayer] Error extracting track ${i}:`,
                    err
                  );
                }
              }

              if (extractedContent.length > 0) {
                await electronAPI.cacheSubtitles(
                  result.videoPath,
                  result.tracks,
                  extractedContent
                );
              }
            }

            for (let i = 0; i < extractedContent.length; i++) {
              const extracted = extractedContent[i];
              const track = result.tracks.find(
                (t) => t.index === extracted.trackIndex
              );

              if (track && extracted.content) {
                const vttContent = convertSRTtoVTT(extracted.content);
                const blob = new Blob([vttContent], { type: "text/vtt" });
                const url = URL.createObjectURL(blob);

                console.log(`[VideoPlayer] Adding track ${i}:`, {
                  label: track.title,
                  language: track.language,
                  default: i === 0,
                });

                const addedTrack = player.addRemoteTextTrack(
                  {
                    kind: "subtitles",
                    src: url,
                    srclang: track.language || "und",
                    label: track.title || `Legenda ${i + 1}`,
                    default: i === 0,
                  },
                  false
                );

                console.log(
                  `[VideoPlayer] Track ${i} added, element:`,
                  addedTrack
                );

                if (i === 0) {
                  setActiveTrackIndex(0);
                }
              }
            }

            setTimeout(() => {
              const allTracks = player.textTracks();
              console.log(
                `[VideoPlayer] Total tracks after loading: ${allTracks.length}`
              );
              for (let i = 0; i < allTracks.length; i++) {
                console.log(`[VideoPlayer] Track ${i}:`, {
                  label: allTracks[i].label,
                  language: allTracks[i].language,
                  mode: allTracks[i].mode,
                });
              }
            }, 500);
          } else if (result.type === "external") {
            const parsedSubtitles = parseSRT(result.content);
            console.log(
              "[VideoPlayer] Parsed external subtitles count:",
              parsedSubtitles.length
            );
            setSubtitles(parsedSubtitles);

            if (player && result.path) {
              const vttContent = convertSRTtoVTT(result.content);
              const blob = new Blob([vttContent], { type: "text/vtt" });
              const url = URL.createObjectURL(blob);

              player.addRemoteTextTrack(
                {
                  kind: "subtitles",
                  src: url,
                  srclang: "pt",
                  label: "Português (Externo)",
                  default: true,
                },
                false
              );

              setActiveTrackIndex(0);
            }
          }
        } else {
          console.log("[VideoPlayer] No subtitles found:", result.error);
        }
      } catch (err) {
        console.error("[VideoPlayer] Error loading subtitles:", err);
      } finally {
        setIsLoadingSubtitles(false);
      }
    }

    loadSubtitles();
  }, [videoPath]);

  useEffect(() => {
    const shouldShowCustom =
      subtitles.length > 0 && showSubtitles && activeTrackIndex === -1;

    if (shouldShowCustom) {
      const current = subtitles.find(
        (sub) => currentTime >= sub.start && currentTime <= sub.end
      );
      setCurrentSubtitle(current ? current.text : "");
    } else {
      setCurrentSubtitle("");
    }
  }, [currentTime, subtitles, showSubtitles, activeTrackIndex]);

  const convertSRTtoVTT = (srtText) => {
    let vtt = "WEBVTT\n\n";
    const blocks = srtText.trim().split(/\n\s*\n/);

    blocks.forEach((block) => {
      const lines = block.split("\n");
      if (lines.length >= 3) {
        const timeLine = lines[1];
        const textLines = lines.slice(2);

        const vttTimeLine = timeLine.replace(/,/g, ".");
        const text = textLines.join("\n");

        vtt += `${vttTimeLine}\n${text}\n\n`;
      }
    });

    return vtt;
  };

  const parseSRT = (srtText) => {
    const subtitles = [];
    const blocks = srtText.trim().split(/\n\s*\n/);

    blocks.forEach((block) => {
      const lines = block.split("\n");
      if (lines.length >= 3) {
        const timeLine = lines[1];
        const textLines = lines.slice(2);

        const timeMatch = timeLine.match(
          /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
        );

        if (timeMatch) {
          const start =
            parseInt(timeMatch[1]) * 3600 +
            parseInt(timeMatch[2]) * 60 +
            parseInt(timeMatch[3]) +
            parseInt(timeMatch[4]) / 1000;

          const end =
            parseInt(timeMatch[5]) * 3600 +
            parseInt(timeMatch[6]) * 60 +
            parseInt(timeMatch[7]) +
            parseInt(timeMatch[8]) / 1000;

          let text = textLines.join("<br>");
          text = text.replace(/<i>/g, "<i>").replace(/<\/i>/g, "</i>");
          text = text.replace(/<b>/g, "<b>").replace(/<\/b>/g, "</b>");
          text = text.replace(/<u>/g, "<u>").replace(/<\/u>/g, "</u>");
          text = text.replace(/\{\\i1\}(.*?)\{\\i0\}/g, "<i>$1</i>");

          subtitles.push({
            start,
            end,
            text: text,
          });
        }
      }
    });

    return subtitles;
  };

  const playNextEpisode = async (episode) => {
    try {
      // Clean up current player
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }

      // Get next episode video file
      const result = await electronAPI.getEpisodeVideoFile(
        showInfo.title,
        episode.seasonNumber,
        episode.episodeNumber
      );

      if (result.success) {
        // Update showInfo with new current episode
        const updatedShowInfo = {
          ...showInfo,
          currentEpisode: episode,
        };

        // Close current player and reopen with new episode
        onClose();

        // Trigger play of next episode through parent component
        // This requires the parent to handle this event
        window.dispatchEvent(
          new CustomEvent("playNextEpisode", {
            detail: {
              videoUri: result.videoUri,
              videoPath: result.videoPath,
              episode,
              showInfo: updatedShowInfo,
            },
          })
        );
      }
    } catch (error) {
      console.error("Error playing next episode:", error);
    }
  };

  const handleCancelUpNext = () => {
    setShowUpNext(false);
    if (upNextIntervalRef.current) {
      clearInterval(upNextIntervalRef.current);
    }
  };

  const handlePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
    }
  };

  const handleSeekForward = (seconds) => {
    if (playerRef.current) {
      const newTime = Math.min(
        playerRef.current.currentTime() + seconds,
        duration
      );
      playerRef.current.currentTime(newTime);
    }
  };

  const handleSeekBackward = (seconds) => {
    if (playerRef.current) {
      const newTime = Math.max(playerRef.current.currentTime() - seconds, 0);
      playerRef.current.currentTime(newTime);
    }
  };

  const handleVolumeUp = (amount) => {
    if (playerRef.current) {
      const newVolume = Math.min(playerRef.current.volume() + amount, 1);
      playerRef.current.volume(newVolume);
      if (playerRef.current.muted()) {
        playerRef.current.muted(false);
      }
    }
  };

  const handleVolumeDown = (amount) => {
    if (playerRef.current) {
      const newVolume = Math.max(playerRef.current.volume() - amount, 0);
      playerRef.current.volume(newVolume);
    }
  };

  const handleToggleMute = () => {
    if (playerRef.current) {
      playerRef.current.muted(!playerRef.current.muted());
    }
  };

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Error toggling fullscreen:", err);
    }
  };

  const handleToggleSubtitles = () => {
    if (playerRef.current) {
      const player = playerRef.current;
      const tracks = player.textTracks();

      if (tracks.length > 0) {
        let anyShowing = false;
        let firstShowingIndex = -1;
        for (let i = 0; i < tracks.length; i++) {
          if (tracks[i].mode === "showing") {
            anyShowing = true;
            if (firstShowingIndex === -1) firstShowingIndex = i;
          }
        }

        if (anyShowing) {
          for (let i = 0; i < tracks.length; i++) {
            tracks[i].mode = "hidden";
          }
          setShowSubtitles(false);
          setActiveTrackIndex(-1);
          setCurrentSubtitle("");
        } else {
          tracks[0].mode = "showing";
          setShowSubtitles(true);
          setActiveTrackIndex(0);
        }
      } else {
        const newState = !showSubtitles;
        setShowSubtitles(newState);
        if (!newState) {
          setCurrentSubtitle("");
        }
      }
    }
  };

  const handleOpenExternal = async () => {
    if (videoPath) {
      await electronAPI.openInExternalPlayer(videoPath);
      onClose();
    }
  };

  useKeyboardShortcuts({
    onPlayPause: handlePlayPause,
    onSeekForward: handleSeekForward,
    onSeekBackward: handleSeekBackward,
    onVolumeUp: handleVolumeUp,
    onVolumeDown: handleVolumeDown,
    onToggleFullscreen: handleToggleFullscreen,
    onToggleMute: handleToggleMute,
    onToggleSubtitles: handleToggleSubtitles,
    onClose: onClose,
    enabled: true,
  });

  useEffect(() => {
    const handleGlobalMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying && !isFullscreen) {
          setShowControls(false);
        }
      }, 3000);
    };

    const container = containerRef.current;

    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("pointermove", handleGlobalMouseMove);
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("pointermove", handleGlobalMouseMove);
    if (container) {
      container.addEventListener("mousemove", handleGlobalMouseMove);
      container.addEventListener("pointermove", handleGlobalMouseMove);
    }

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("pointermove", handleGlobalMouseMove);
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("pointermove", handleGlobalMouseMove);
      if (container) {
        container.removeEventListener("mousemove", handleGlobalMouseMove);
        container.removeEventListener("pointermove", handleGlobalMouseMove);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, isFullscreen]);

  useEffect(() => {
    if (isFullscreen) {
      setShowControls(!isPlaying);
    }
  }, [isFullscreen, isPlaying]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`video-player-container ${showControls ? "show-cursor" : ""}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseMove}
    >
      <div data-vjs-player>
        <div ref={videoRef} />
      </div>

      {isLoadingSubtitles && (
        <div className="video-player-loading-overlay">
          <div className="video-player-loading-spinner"></div>
          <div className="video-player-loading-text">Carregando...</div>
        </div>
      )}

      <button
        className={`video-player-back-btn ${showControls ? "visible" : ""}`}
        onClick={onClose}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      {showAudioWarning && !hasAudio && (
        <div className="video-player-audio-warning">
          <div className="video-player-audio-warning-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#ff9800">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
            <h3>Codec de Áudio Incompatível</h3>
            <p>O navegador não suporta o codec de áudio deste vídeo.</p>
            <div className="video-player-audio-warning-buttons">
              <button
                onClick={handleOpenExternal}
                className="video-player-warning-btn primary"
              >
                Abrir em Player Externo
              </button>
              <button
                onClick={() => setShowAudioWarning(false)}
                className="video-player-warning-btn secondary"
              >
                Continuar sem Áudio
              </button>
            </div>
          </div>
        </div>
      )}

      {currentSubtitle && showSubtitles && (
        <div
          className="video-player-subtitles"
          dangerouslySetInnerHTML={{ __html: currentSubtitle }}
        />
      )}

      {showUpNext && nextEpisode && (
        <div className="video-player-up-next-overlay">
          <div className="video-player-up-next-content">
            <div className="video-player-up-next-header">
              <h3>Próximo Episódio</h3>
              <button
                className="video-player-up-next-close"
                onClick={handleCancelUpNext}
              >
                ✕
              </button>
            </div>
            <div className="video-player-up-next-info">
              <div className="video-player-up-next-episode">
                <span className="video-player-up-next-badge">
                  S{String(nextEpisode.seasonNumber).padStart(2, "0")}E
                  {String(nextEpisode.episodeNumber).padStart(2, "0")}
                </span>
                {nextEpisode.episodeTitle && (
                  <span className="video-player-up-next-title">
                    {nextEpisode.episodeTitle}
                  </span>
                )}
              </div>
              <div className="video-player-up-next-countdown">
                Reproduzindo em {upNextCountdown}s
              </div>
            </div>
            <div className="video-player-up-next-buttons">
              <button
                className="video-player-up-next-btn primary"
                onClick={() => playNextEpisode(nextEpisode)}
              >
                Reproduzir Agora
              </button>
              <button
                className="video-player-up-next-btn secondary"
                onClick={handleCancelUpNext}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
