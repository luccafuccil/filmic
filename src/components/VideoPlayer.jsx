import { useState, useRef, useEffect } from "react";
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
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressBarRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [subtitles, setSubtitles] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [hasAudio, setHasAudio] = useState(true);
  const [showAudioWarning, setShowAudioWarning] = useState(false);

  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);

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
    const loadProgress = async () => {
      const progress = await electronAPI.getWatchProgress(movieId);
      if (progress && videoRef.current) {
        videoRef.current.currentTime = progress.time;
      }
    };
    loadProgress();
  }, [movieId]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const time = currentTimeRef.current;
      const dur = durationRef.current;

      if (videoRef.current && dur > 0) {
        const percentage = (time / dur) * 100;

        if (percentage >= 95) {
          await electronAPI.removeWatchProgress(movieId);
        } else {
          const progress = {
            time: time,
            duration: dur,
            percentage: percentage,
          };
          await electronAPI.saveWatchProgress(movieId, progress);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [movieId]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    async function loadSubtitles() {
      if (!videoPath) return;

      try {
        const result = await electronAPI.getSubtitles(videoPath);
        if (result.success) {
          const parsedSubtitles = parseSRT(result.content);
          setSubtitles(parsedSubtitles);
        }
      } catch (err) {}
    }

    loadSubtitles();
  }, [videoPath]);

  useEffect(() => {
    if (subtitles.length > 0 && showSubtitles) {
      const current = subtitles.find(
        (sub) => currentTime >= sub.start && currentTime <= sub.end
      );
      setCurrentSubtitle(current ? current.text : "");
    } else {
      setCurrentSubtitle("");
    }
  }, [currentTime, subtitles, showSubtitles]);

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

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeekForward = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.currentTime + seconds,
        duration
      );
    }
  };

  const handleSeekBackward = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        videoRef.current.currentTime - seconds,
        0
      );
    }
  };

  const handleVolumeUp = (amount) => {
    if (videoRef.current) {
      const newVolume = Math.min(volume + amount, 1);
      setVolume(newVolume);
      videoRef.current.volume = newVolume;
      if (isMuted) setIsMuted(false);
    }
  };

  const handleVolumeDown = (amount) => {
    if (videoRef.current) {
      const newVolume = Math.max(volume - amount, 0);
      setVolume(newVolume);
      videoRef.current.volume = newVolume;
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
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
    setShowSubtitles(!showSubtitles);
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

  const handleTimeUpdate = () => {
    if (videoRef.current && !isSeeking) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);

      setTimeout(() => {
        if (videoRef.current) {
          const hasAudioTracks =
            videoRef.current.audioTracks?.length > 0 ||
            videoRef.current.webkitAudioDecodedByteCount > 0 ||
            videoRef.current.mozHasAudio;
          setHasAudio(hasAudioTracks);
          if (!hasAudioTracks) {
            setShowAudioWarning(true);
          }
        }
      }, 1000);
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const handleProgressClick = (e) => {
    if (progressBarRef.current && videoRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * duration;
    }
  };

  const handleProgressMouseDown = () => {
    setIsSeeking(true);
  };

  const handleProgressMouseMove = (e) => {
    if (isSeeking && progressBarRef.current && videoRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(pos * duration, duration)
      );
    }
  };

  const handleProgressMouseUp = () => {
    setIsSeeking(false);
  };

  useEffect(() => {
    if (isSeeking) {
      window.addEventListener("mousemove", handleProgressMouseMove);
      window.addEventListener("mouseup", handleProgressMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleProgressMouseMove);
        window.removeEventListener("mouseup", handleProgressMouseUp);
      };
    }
  }, [isSeeking]);

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
      <video
        ref={videoRef}
        src={videoUri}
        className="video-player-video"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onClick={handlePlayPause}
      />

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

      <button
        className={`video-player-fullscreen-btn ${
          showControls ? "visible" : ""
        }`}
        onClick={handleToggleFullscreen}
      >
        {isFullscreen ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        )}
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

      <div className={`video-player-controls ${showControls ? "visible" : ""}`}>
        <div
          ref={progressBarRef}
          className="video-player-progress-bar"
          onClick={handleProgressClick}
          onMouseDown={handleProgressMouseDown}
        >
          <div
            className="video-player-progress-filled"
            style={{ width: `${progressPercentage}%` }}
          />
          <div
            className="video-player-progress-handle"
            style={{ left: `${progressPercentage}%` }}
          />
        </div>

        <div className="video-player-controls-bottom">
          <button className="video-player-btn" onClick={handlePlayPause}>
            {isPlaying ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button className="video-player-btn" onClick={handleToggleMute}>
            {isMuted || volume === 0 ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>

          <div className="video-player-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {subtitles.length > 0 && (
            <button
              className="video-player-btn"
              onClick={handleToggleSubtitles}
              title="Alternar legendas (C)"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="7" width="20" height="10" rx="2" ry="2" />
                <line x1="6" y1="11" x2="10" y2="11" />
                <line x1="14" y1="11" x2="18" y2="11" />
                <line x1="6" y1="15" x2="10" y2="15" />
                <line x1="14" y1="15" x2="18" y2="15" />
                {!showSubtitles && (
                  <line x1="22" y1="2" x2="2" y2="22" strokeWidth="2" />
                )}
              </svg>
            </button>
          )}

          <div style={{ flex: 1 }} />

          <div className="video-player-title">{movieTitle}</div>
        </div>
      </div>

      {currentSubtitle && (
        <div
          className="video-player-subtitles"
          dangerouslySetInnerHTML={{ __html: currentSubtitle }}
        />
      )}

      {!isPlaying && (
        <div className="video-player-center-icon" onClick={handlePlayPause}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      )}
    </div>
  );
}
