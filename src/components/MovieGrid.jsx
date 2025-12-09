import { MovieCard } from "./MovieCard";
import { TVShowCard } from "./TVShowCard";
import "../styles/components/MovieGrid.css";

export function MovieGrid({ mediaItems }) {
  if (!mediaItems || mediaItems.length === 0) {
    return null;
  }

  return (
    <div className="movie-grid">
      {mediaItems.map((item, index) => {
        if (item.type === "tvshow") {
          return <TVShowCard key={`tv-${item.title}-${index}`} show={item} />;
        }
        return <MovieCard key={`movie-${item.title}-${index}`} movie={item} />;
      })}
    </div>
  );
}
