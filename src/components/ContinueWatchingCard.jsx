import { useState, useEffect } from "react";
import { electronAPI } from "../services/electronAPI";
import { VideoPlayer } from "./VideoPlayer";
import { getQualityLabel } from "../utils/movieHelpers";
import { useThumbnail } from "../hooks/useThumbnail";
import "../styles/components/ContinueWatchingCard.css";

export function ContinueWatchingCard({
  mediaItem,
  progress,
  mediaType,
  episode,
  onRemove,
}) {
  const thumbnailItem = mediaType === "tvshow" ? episode : mediaItem;
  const { thumbnailPath, loading, error } = useThumbnail(thumbnailItem);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [videoPath, setVideoPath] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handlePlay = async (e) => {
    if (e) e.stopPropagation();
    try {
      let result;
      if (mediaType === "tvshow" && episode) {
        result = await electronAPI.getEpisodeVideoFile(
          mediaItem.title,
          episode.seasonNumber,
          episode.episodeNumber
        );
      } else {
        result = await electronAPI.getVideoFile(mediaItem);
      }

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
      const itemId =
        mediaType === "movie" ? mediaItem.originalName : progress.movieId;
      await electronAPI.removeWatchProgress(itemId);
      onRemove?.(itemId);
    }, 300);
  };

  const qualityBadge = getQualityLabel(
    mediaType === "tvshow" ? episode?.resolution : mediaItem?.resolution
  );

  // Build display text
  const displayTitle =
    mediaType === "tvshow" && episode
      ? `${mediaItem.title} • S${String(episode.seasonNumber).padStart(
          2,
          "0"
        )}E${String(episode.episodeNumber).padStart(2, "0")}`
      : mediaItem.title;

  const displayYear = mediaItem.year;

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
              alt={displayTitle}
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
                <h3 className="continue-watching-card-title">{displayTitle}</h3>
                <div className="continue-watching-card-meta">
                  {displayYear && (
                    <span className="continue-watching-card-year">
                      {displayYear}
                    </span>
                  )}
                  {mediaType === "tvshow" && (
                    <span className="continue-watching-card-badge">SÉRIE</span>
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
          movieId={
            mediaType === "movie" ? mediaItem.originalName : progress.movieId
          }
          movieTitle={displayTitle}
          mediaType={mediaType}
          showInfo={
            mediaType === "tvshow"
              ? {
                  title: mediaItem.title,
                  year: mediaItem.year,
                  currentEpisode: episode,
                  allEpisodes:
                    mediaItem.seasons?.flatMap((s) => s.episodes) || [],
                }
              : null
          }
        />
      )}
    </>
  );
}
