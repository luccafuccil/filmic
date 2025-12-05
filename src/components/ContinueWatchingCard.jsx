import { useState, useEffect } from "react";
import { electronAPI } from "../services/electronAPI";
import { VideoPlayer } from "./VideoPlayer";
import { getQualityLabel } from "../utils/movieHelpers";
import { useThumbnail } from "../hooks/useThumbnail";
import "../styles/components/ContinueWatchingCard.css";

export function ContinueWatchingCard({ movie, progress, onRemove }) {
  const { thumbnailPath, loading, error } = useThumbnail(movie);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [videoPath, setVideoPath] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handlePlay = async (e) => {
    if (e) e.stopPropagation();
    try {
      const result = await electronAPI.getVideoFile(movie);
      if (result.success) {
        setVideoUri(result.videoUri);
        setVideoPath(result.videoPath);
        setIsPlaying(true);
      } else {
        alert("Não foi possível carregar o vídeo: " + result.error);
      }
    } catch (err) {
      alert("Erro ao carregar vídeo");
    }
  };

  const handleRemove = async (e) => {
    e.stopPropagation();
    setIsRemoving(true);

    // Wait for fade-out animation
    setTimeout(async () => {
      await electronAPI.removeWatchProgress(movie.originalName);
      onRemove?.(movie.originalName);
    }, 300);
  };

  const qualityBadge = getQualityLabel(movie?.resolution);

  return (
    <>
      <div
        className={`continue-watching-card ${isRemoving ? "removing" : ""}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handlePlay}
      >
        {loading && (
          <div className="continue-watching-card-loading">
            <div className="loading-spinner"></div>
          </div>
        )}

        {!loading && error && (
          <div className="continue-watching-card-error">
            <span>⚠️</span>
          </div>
        )}

        {!loading && !error && thumbnailPath && (
          <>
            <img
              src={thumbnailPath}
              alt={movie.title}
              className="continue-watching-card-thumbnail"
            />
            <div className="continue-watching-card-overlay">
              {isHovered && (
                <button
                  className="continue-watching-card-play"
                  onClick={handlePlay}
                  aria-label="Play"
                >
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              )}

              <div className="continue-watching-card-info">
                <h3 className="continue-watching-card-title">{movie.title}</h3>
                <div className="continue-watching-card-meta">
                  {movie.year && (
                    <span className="continue-watching-card-year">
                      {movie.year}
                    </span>
                  )}
                  {qualityBadge && (
                    <span className="continue-watching-card-quality">
                      {qualityBadge}
                    </span>
                  )}
                  <span className="continue-watching-card-remaining">
                    {progress.remainingMinutes} min restantes
                  </span>
                </div>
              </div>

              {isHovered && (
                <button
                  className="continue-watching-card-remove"
                  onClick={handleRemove}
                  aria-label="Remover"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="continue-watching-card-progress">
              <div
                className="continue-watching-card-progress-fill"
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
          </>
        )}
      </div>

      {isPlaying && videoUri && (
        <VideoPlayer
          videoUri={videoUri}
          videoPath={videoPath}
          onClose={() => {
            setIsPlaying(false);
            setVideoUri(null);
            setVideoPath(null);
          }}
          movieId={movie.originalName}
          movieTitle={movie.title}
        />
      )}
    </>
  );
}
