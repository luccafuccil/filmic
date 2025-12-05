import { MovieCard } from "./MovieCard";
import "../styles/components/MovieGrid.css";

export function MovieGrid({ movies }) {
  if (movies.length === 0) {
    return (
      <p className="movie-grid-empty">
        Nenhum filme encontrado. Adicione pastas no formato: (ano) - nome
        [qualidade]
      </p>
    );
  }

  return (
    <div className="movie-grid">
      {movies.map((movie, index) => (
        <MovieCard key={index} movie={movie} />
      ))}
    </div>
  );
}
