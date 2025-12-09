import { useState, useEffect } from "react";
import { electronAPI } from "../services/electronAPI";
import { SeasonView } from "./SeasonView";
import { getQualityLabel } from "../utils/movieHelpers";
import { useEpisodeThumbnail } from "../hooks/useThumbnail";
import "../styles/components/TVShowCard.css";

export function TVShowCard({ show }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [tmdbData, setTmdbData] = useState({ creator: null, overview: null });
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState(null);

  // Find current or next episode to display
  useEffect(() => {
    const findDisplayEpisode = async () => {
      if (!show.seasons || show.seasons.length === 0) return;

      try {
        // Find next episode based on watch progress
        const nextEp = await electronAPI.findNextEpisode(
          show.title,
          show.year,
          show.seasons
        );

        if (nextEp && nextEp.season && nextEp.episode) {
          const season = show.seasons.find(
            (s) => s.seasonNumber === nextEp.season
          );
          if (season) {
            const episode = season.episodes.find(
              (ep) => ep.episodeNumber === nextEp.episode
            );
            if (episode) {
              setCurrentEpisode({ ...episode, seasonNumber: nextEp.season });
              return;
            }
          }
        }

        // Default to first episode of first season
        const firstSeason = show.seasons[0];
        if (
          firstSeason &&
          firstSeason.episodes &&
          firstSeason.episodes.length > 0
        ) {
          setCurrentEpisode({
            ...firstSeason.episodes[0],
            seasonNumber: firstSeason.seasonNumber,
          });
        }
      } catch (err) {
        console.error("Error finding current episode:", err);
        // Fallback to first episode
        const firstSeason = show.seasons[0];
        if (
          firstSeason &&
          firstSeason.episodes &&
          firstSeason.episodes.length > 0
        ) {
          setCurrentEpisode({
            ...firstSeason.episodes[0],
            seasonNumber: firstSeason.seasonNumber,
          });
        }
      }
    };

    findDisplayEpisode();
  }, [show]);

  // Use episode-specific thumbnail hook with stable path dependency
  const { thumbnailPath, loading, error } = useEpisodeThumbnail(
    currentEpisode?.path
  );
  const qualityLabel = currentEpisode
    ? getQualityLabel(currentEpisode.resolution)
    : null;

  useEffect(() => {
    // Fetch TMDB data when component mounts
    const fetchTmdbData = async () => {
      if (!show.title) return;

      setTmdbLoading(true);
      try {
        const result = await electronAPI.getTVShowMetadata(
          show.title,
          show.year
        );
        if (result.success && result.metadata) {
          setTmdbData(result.metadata);
        }
      } catch (err) {
        console.error("Error fetching TMDB data:", err);
      } finally {
        setTmdbLoading(false);
      }
    };

    fetchTmdbData();
  }, [show.title, show.year]);

  const totalEpisodes = show.seasons
    ? show.seasons.reduce(
        (sum, season) => sum + (season.episodes?.length || 0),
        0
      )
    : 0;

  const seasonCount = show.seasons ? show.seasons.length : 0;

  return (
    <>
      <div
        className="tvshow-card"
        onClick={() => setIsExpanded(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`tvshow-card-background ${loading ? "loading" : ""}`}>
          {loading && <div className="tvshow-card-loading">Carregando...</div>}
          {!loading && error && (
            <div className="tvshow-card-error">
              📺
              <br />
              Sem thumbnail
            </div>
          )}
          {!loading && !error && thumbnailPath && (
            <img
              src={thumbnailPath}
              alt={show.title}
              className="tvshow-card-thumbnail"
            />
          )}
        </div>

        <div className="tvshow-card-overlay" />

        <div className="tvshow-card-content">
          <div className="tvshow-card-badges">
            {qualityLabel && (
              <span className="tvshow-card-badge-quality">{qualityLabel}</span>
            )}
            {currentEpisode && (
              <span className="tvshow-card-badge-episode">
                S{String(currentEpisode.seasonNumber).padStart(2, "0")}E
                {String(currentEpisode.episodeNumber).padStart(2, "0")}
              </span>
            )}
            <span className="tvshow-card-badge-type">SÉRIE</span>
          </div>
          <h2 className="tvshow-card-title">{show.title}</h2>
          {tmdbData.creator && (
            <div className="tvshow-card-creator">
              Created by {tmdbData.creator}
            </div>
          )}
          <div className="tvshow-card-info">
            {show.year && <span className="tvshow-card-year">{show.year}</span>}
            {show.year && (seasonCount > 0 || totalEpisodes > 0) && (
              <span className="tvshow-card-separator"> • </span>
            )}
            {seasonCount > 0 && (
              <span className="tvshow-card-seasons">
                {seasonCount} {seasonCount === 1 ? "temporada" : "temporadas"}
              </span>
            )}
            {totalEpisodes > 0 && (
              <>
                <span className="tvshow-card-separator"> • </span>
                <span className="tvshow-card-episodes">
                  {totalEpisodes}{" "}
                  {totalEpisodes === 1 ? "episódio" : "episódios"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <SeasonView
          show={show}
          tmdbData={tmdbData}
          onClose={() => setIsExpanded(false)}
        />
      )}
    </>
  );
}
