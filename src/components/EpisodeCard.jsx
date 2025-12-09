import { useState, useEffect } from "react";
import { electronAPI } from "../services/electronAPI";
import { VideoPlayer } from "./VideoPlayer";
import { getQualityLabel } from "../utils/movieHelpers";
import { useEpisodeThumbnail } from "../hooks/useThumbnail";
import "../styles/components/EpisodeCard.css";

export function EpisodeCard({ episode, season, show }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [videoPath, setVideoPath] = useState(null);
  const [progress, setProgress] = useState(null);

  // Use episode-specific thumbnail hook with stable episodePath dependency
  const { thumbnailPath, loading, error } = useEpisodeThumbnail(episode.path);
  const qualityLabel = getQualityLabel(episode.resolution);

  // Load watch progress
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const prog = await electronAPI.getEpisodeProgress(
          show.title,
          show.year,
          season,
          episode.episodeNumber
        );
        setProgress(prog);
      } catch (err) {
        console.error("Error loading episode progress:", err);
      }
    };

    loadProgress();
  }, [show.title, show.year, season, episode.episodeNumber]);

  const handlePlay = async (e) => {
    e.stopPropagation();
    try {
      const result = await electronAPI.getEpisodeVideoFile(
        show,
        season,
        episode.episodeNumber
      );
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

  const episodeTitle =
    episode.episodeTitle || `Episódio ${episode.episodeNumber}`;
  const progressPercentage = progress ? progress.percentage : 0;

  return (
    <>
      {isPlaying && videoUri && (
        <VideoPlayer
          videoUri={videoUri}
          videoPath={videoPath}
          onClose={() => {
            setIsPlaying(false);
            setVideoUri(null);
            setVideoPath(null);
          }}
          movieId={`${show.title} (${show.year || "no-year"})||S${String(
            season
          ).padStart(2, "0")}E${String(episode.episodeNumber).padStart(
            2,
            "0"
          )}`}
          movieTitle={`${show.title} - S${String(season).padStart(
            2,
            "0"
          )}E${String(episode.episodeNumber).padStart(2, "0")}`}
          mediaType="tvshow"
          showInfo={{
            title: show.title,
            year: show.year,
            season: season,
            episode: episode.episodeNumber,
            allEpisodes: show.seasons,
          }}
        />
      )}

      <div className="episode-card" onClick={handlePlay}>
        <div className="episode-card-thumbnail-container">
          <div className={`episode-card-thumbnail ${loading ? "loading" : ""}`}>
            {loading && (
              <div className="episode-card-loading">Carregando...</div>
            )}
            {!loading && error && (
              <div className="episode-card-error">
                📺
                <br />
                Sem thumbnail
              </div>
            )}
            {!loading && !error && thumbnailPath && (
              <img
                src={thumbnailPath}
                alt={episodeTitle}
                className="episode-card-thumbnail-img"
              />
            )}
          </div>

          <div className="episode-card-play-overlay">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>

          {progress && progressPercentage > 1 && progressPercentage < 95 && (
            <div className="episode-card-progress-bar">
              <div
                className="episode-card-progress-filled"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}
        </div>

        <div className="episode-card-info">
          <div className="episode-card-header">
            <span className="episode-card-episode-number">
              E{String(episode.episodeNumber).padStart(2, "0")}
              {episode.episodeEnd &&
                `-E${String(episode.episodeEnd).padStart(2, "0")}`}
            </span>
            {qualityLabel && (
              <span className="episode-card-quality">{qualityLabel}</span>
            )}
          </div>

          <h3 className="episode-card-title">{episodeTitle}</h3>

          <div className="episode-card-meta">
            {episode.duration && (
              <span className="episode-card-duration">
                {episode.duration}min
              </span>
            )}
            {progress && progressPercentage >= 95 && (
              <>
                <span className="episode-card-separator"> • </span>
                <span className="episode-card-watched">✓ Assistido</span>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
