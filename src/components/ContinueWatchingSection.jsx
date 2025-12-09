import { useState, useEffect } from "react";
import { electronAPI } from "../services/electronAPI";
import { ContinueWatchingCard } from "./ContinueWatchingCard";
import "../styles/components/ContinueWatchingSection.css";

export function ContinueWatchingSection({ mediaItems }) {
  const [continueWatchingItems, setContinueWatchingItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadContinueWatching = async () => {
    try {
      const progressList = await electronAPI.getContinueWatching();
      console.log("[ContinueWatching] Progress list:", progressList);
      console.log("[ContinueWatching] Media items count:", mediaItems.length);

      // Match progress data with full media objects
      const itemsWithProgress = progressList
        .map((progress) => {
          // For movies, match by originalName
          if (progress.movieId && !progress.movieId.includes("||")) {
            console.log(
              "[ContinueWatching] Looking for movie:",
              progress.movieId
            );
            const movie = mediaItems.find((m) => {
              if (m.type !== "movie") return false;
              // Match by originalName or formatted "Title (Year)"
              const formattedName = m.year ? `${m.title} (${m.year})` : m.title;
              return (
                m.originalName === progress.movieId ||
                formattedName === progress.movieId
              );
            });
            console.log("[ContinueWatching] Found movie:", movie?.title);
            return movie ? { mediaItem: movie, progress, type: "movie" } : null;
          }

          // For TV shows, parse episode ID format: "ShowName (Year)||S01E01"
          const episodeMatch = progress.movieId.match(/^(.+)\|\|S(\d+)E(\d+)$/);
          if (episodeMatch) {
            const [, showIdentifier, season, episode] = episodeMatch;
            const show = mediaItems.find((m) => {
              if (m.type !== "tvshow") return false;
              const yearStr = m.year || "no-year";
              return `${m.title} (${yearStr})` === showIdentifier;
            });

            if (show) {
              const seasonNum = parseInt(season, 10);
              const episodeNum = parseInt(episode, 10);
              const episodeData = show.seasons
                ?.find((s) => s.seasonNumber === seasonNum)
                ?.episodes?.find((e) => e.episodeNumber === episodeNum);

              if (episodeData) {
                return {
                  mediaItem: show,
                  progress,
                  type: "tvshow",
                  episode: {
                    ...episodeData,
                    seasonNumber: seasonNum,
                  },
                };
              }
            }
          }

          return null;
        })
        .filter(Boolean);

      setContinueWatchingItems(itemsWithProgress);
    } catch (error) {
      console.error("Error loading continue watching:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mediaItems && mediaItems.length > 0) {
      loadContinueWatching();
    } else {
      setLoading(false);
    }
  }, [mediaItems]);

  useEffect(() => {
    // Listen for watch progress updates
    const cleanup = electronAPI.onWatchProgressUpdated(() => {
      loadContinueWatching();
    });

    return cleanup;
  }, [mediaItems]);

  const handleRemove = (itemId) => {
    setContinueWatchingItems((prev) =>
      prev.filter((item) => {
        if (item.type === "movie") {
          return item.mediaItem.originalName !== itemId;
        }
        // For TV shows, itemId is the episode ID
        return item.progress.movieId !== itemId;
      })
    );
  };

  // Hide section when empty or loading
  if (loading || continueWatchingItems.length === 0) {
    return null;
  }

  return (
    <div className="continue-watching-section">
      <h2 className="continue-watching-title">Continuar Assistindo</h2>
      <div className="continue-watching-grid">
        {continueWatchingItems.map((item) => (
          <ContinueWatchingCard
            key={
              item.type === "movie"
                ? item.mediaItem.originalName
                : item.progress.movieId
            }
            mediaItem={item.mediaItem}
            progress={item.progress}
            mediaType={item.type}
            episode={item.episode}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </div>
  );
}
