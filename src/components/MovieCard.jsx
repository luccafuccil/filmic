import { useState, useEffect } from "react";
import { electronAPI } from "../services/electronAPI";
import { VideoPlayer } from "./VideoPlayer";
import { getQualityLabel } from "../utils/movieHelpers";
import { useThumbnail } from "../hooks/useThumbnail";
import "../styles/components/MovieCard.css";

export function MovieCard({ movie }) {
  const { thumbnailPath, loading, error } = useThumbnail(movie);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [videoPath, setVideoPath] = useState(null);
  const [tmdbData, setTmdbData] = useState({ director: null, overview: null });
  const [tmdbLoading, setTmdbLoading] = useState(false);

  const qualityLabel = getQualityLabel(movie.resolution);

  useEffect(() => {
    // Fetch TMDB data when component mounts
    const fetchTmdbData = async () => {
      if (!movie.title) return;

      setTmdbLoading(true);
      try {
        const result = await electronAPI.getMovieMetadata(
          movie.title,
          movie.year
        );
        if (result.success && result.metadata) {
          setTmdbData(result.metadata);
        }
      } catch (err) {
        console.error("Error fetching TMDB data:", err);
        // Silently fail - will just show without director/overview
      } finally {
        setTmdbLoading(false);
      }
    };

    fetchTmdbData();
  }, [movie.title, movie.year]);

  const handlePlay = async (e) => {
    e.stopPropagation();
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
          movieId={movie.originalName || movie.title}
          movieTitle={movie.title}
        />
      )}

      <div
        className="movie-card"
        onClick={() => setIsExpanded(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`movie-card-background ${loading ? "loading" : ""}`}>
          {loading && <div className="movie-card-loading">Carregando...</div>}
          {!loading && error && (
            <div className="movie-card-error">
              🎥
              <br />
              Sem thumbnail
            </div>
          )}
          {!loading && !error && thumbnailPath && (
            <img
              src={thumbnailPath}
              alt={movie.title}
              className="movie-card-thumbnail"
            />
          )}
        </div>

        <div className="movie-card-overlay" />

        <div className="movie-card-content">
          <div className="movie-card-badges">
            {qualityLabel && (
              <span className="movie-card-badge-quality">{qualityLabel}</span>
            )}
          </div>
          <h2 className="movie-card-title">{movie.title}</h2>
          {tmdbData.director && (
            <div className="movie-card-director">
              Directed by {tmdbData.director}
            </div>
          )}
          <div className="movie-card-info">
            {movie.year && (
              <span className="movie-card-year">{movie.year}</span>
            )}
            {movie.year && movie.duration && (
              <span className="movie-card-separator"> • </span>
            )}
            {movie.duration && (
              <span className="movie-card-duration">{movie.duration}min</span>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="movie-card-expanded">
          {!loading && !error && thumbnailPath && (
            <div className="movie-card-expanded-background">
              <img
                src={thumbnailPath}
                alt={movie.title}
                className="movie-card-expanded-thumbnail"
              />
              <div className="movie-card-expanded-overlay" />
            </div>
          )}

          <button
            onClick={() => setIsExpanded(false)}
            className="movie-card-back-button"
          >
            Voltar
          </button>

          <div className="movie-card-expanded-content">
            <button onClick={handlePlay} className="movie-card-play-button">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>

            <div
              onClick={(e) => e.stopPropagation()}
              className="movie-card-expanded-info"
            >
              <div className="movie-card-expanded-badges">
                {qualityLabel && (
                  <span className="movie-card-expanded-badge-quality">
                    {qualityLabel}
                  </span>
                )}
              </div>

              <h1 className="movie-card-expanded-title">{movie.title}</h1>

              {tmdbData.director && (
                <div className="movie-card-expanded-director">
                  Directed by {tmdbData.director}
                </div>
              )}

              <div className="movie-card-expanded-info-row">
                {movie.year && (
                  <span className="movie-card-expanded-year">{movie.year}</span>
                )}
                {movie.year && movie.duration && (
                  <span className="movie-card-expanded-separator"> • </span>
                )}
                {movie.duration && (
                  <span className="movie-card-expanded-duration">
                    {movie.duration}min
                  </span>
                )}
              </div>

              {tmdbData.overview && (
                <div className="movie-card-expanded-overview">
                  {tmdbData.overview}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
