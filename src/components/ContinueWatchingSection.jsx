import { useState, useEffect } from "react";
import { electronAPI } from "../services/electronAPI";
import { ContinueWatchingCard } from "./ContinueWatchingCard";
import "../styles/components/ContinueWatchingSection.css";

export function ContinueWatchingSection({ movies }) {
  const [continueWatchingMovies, setContinueWatchingMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadContinueWatching = async () => {
    try {
      const progressList = await electronAPI.getContinueWatching();

      // Match progress data with full movie objects
      const moviesWithProgress = progressList
        .map((progress) => {
          const movie = movies.find((m) => m.originalName === progress.movieId);
          return movie ? { movie, progress } : null;
        })
        .filter(Boolean);

      setContinueWatchingMovies(moviesWithProgress);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (movies.length > 0) {
      loadContinueWatching();
    } else {
      setLoading(false);
    }
  }, [movies]);

  useEffect(() => {
    // Listen for watch progress updates
    const cleanup = electronAPI.onWatchProgressUpdated(() => {
      loadContinueWatching();
    });

    return cleanup;
  }, [movies]);

  const handleRemove = (movieId) => {
    setContinueWatchingMovies((prev) =>
      prev.filter((item) => item.movie.originalName !== movieId)
    );
  };

  // Hide section when empty or loading
  if (loading || continueWatchingMovies.length === 0) {
    return null;
  }

  return (
    <div className="continue-watching-section">
      <h2 className="continue-watching-title">Continuar Assistindo</h2>
      <div className="continue-watching-grid">
        {continueWatchingMovies.map(({ movie, progress }) => (
          <ContinueWatchingCard
            key={movie.originalName}
            movie={movie}
            progress={progress}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </div>
  );
}
