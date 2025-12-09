import { useState } from "react";
import { EpisodeCard } from "./EpisodeCard";
import "../styles/components/SeasonView.css";

export function SeasonView({ show, tmdbData, onClose }) {
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0);

  if (!show.seasons || show.seasons.length === 0) {
    return null;
  }

  const selectedSeason = show.seasons[selectedSeasonIndex];

  return (
    <div className="season-view">
      <div className="season-view-background" />

      <button onClick={onClose} className="season-view-back-button">
        Voltar
      </button>

      <div className="season-view-content">
        <div className="season-view-header">
          <h1 className="season-view-title">{show.title}</h1>
          {show.year && <span className="season-view-year">({show.year})</span>}
          {tmdbData.overview && (
            <p className="season-view-overview">{tmdbData.overview}</p>
          )}
        </div>

        <div className="season-view-tabs">
          {show.seasons.map((season, index) => (
            <button
              key={season.seasonNumber}
              className={`season-view-tab ${
                index === selectedSeasonIndex ? "active" : ""
              }`}
              onClick={() => setSelectedSeasonIndex(index)}
            >
              Temporada {season.seasonNumber}
            </button>
          ))}
        </div>

        <div className="season-view-episodes">
          {selectedSeason.episodes && selectedSeason.episodes.length > 0 ? (
            selectedSeason.episodes.map((episode) => (
              <EpisodeCard
                key={`${selectedSeason.seasonNumber}-${episode.episodeNumber}`}
                episode={episode}
                season={selectedSeason.seasonNumber}
                show={show}
              />
            ))
          ) : (
            <div className="season-view-no-episodes">
              Nenhum episódio encontrado nesta temporada
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
