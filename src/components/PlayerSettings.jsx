import { useEffect, useState } from "react";
import "../styles/components/PlayerSettings.css";
import { electronAPI } from "../services/electronAPI";

export function PlayerSettings({ isOpen, onClose }) {
  const [playerPreference, setPlayerPreference] = useState("built-in");
  const [customPlayerPath, setCustomPlayerPath] = useState("");
  const [customPlayerName, setCustomPlayerName] = useState("");

  useEffect(() => {
    // Load saved player preferences
    const savedPreference =
      localStorage.getItem("playerPreference") || "built-in";
    const savedPath = localStorage.getItem("customPlayerPath") || "";
    const savedName = localStorage.getItem("customPlayerName") || "";

    setPlayerPreference(savedPreference);
    setCustomPlayerPath(savedPath);
    setCustomPlayerName(savedName);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const handlePlayerPreferenceChange = (preference) => {
    setPlayerPreference(preference);
    localStorage.setItem("playerPreference", preference);
  };

  const handleSelectPlayer = async () => {
    try {
      const playerPath = await electronAPI.selectPlayerExecutable();
      if (playerPath) {
        const playerName = playerPath.split("\\").pop().replace(".exe", "");
        setCustomPlayerPath(playerPath);
        setCustomPlayerName(playerName);
        localStorage.setItem("customPlayerPath", playerPath);
        localStorage.setItem("customPlayerName", playerName);
        setPlayerPreference("external");
        localStorage.setItem("playerPreference", "external");
      }
    } catch (error) {
      console.error("Error selecting player:", error);
      alert("Erro ao selecionar player");
    }
  };

  const handleRemovePlayer = () => {
    setCustomPlayerPath("");
    setCustomPlayerName("");
    localStorage.removeItem("customPlayerPath");
    localStorage.removeItem("customPlayerName");
    setPlayerPreference("built-in");
    localStorage.setItem("playerPreference", "built-in");
  };

  if (!isOpen) return null;

  return (
    <div className="player-settings-overlay" onClick={onClose}>
      <div
        className="player-settings-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="player-settings-header">
          <h2 className="player-settings-title">Player de Vídeo</h2>
          <button
            className="player-settings-close-button"
            onClick={onClose}
            aria-label="Fechar"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="player-settings-content">
          <p className="player-settings-description">
            Escolha como reproduzir seus filmes e séries.
          </p>

          <div className="player-options">
            <label className="player-option">
              <input
                type="radio"
                name="player"
                value="built-in"
                checked={playerPreference === "built-in"}
                onChange={() => handlePlayerPreferenceChange("built-in")}
              />
              <div className="player-option-content">
                <span className="player-option-title">Player Integrado</span>
                <span className="player-option-description">
                  Use o player interno do aplicativo
                </span>
              </div>
            </label>

            <label className="player-option">
              <input
                type="radio"
                name="player"
                value="external"
                checked={playerPreference === "external"}
                onChange={() => handlePlayerPreferenceChange("external")}
                disabled={!customPlayerPath}
              />
              <div className="player-option-content">
                <span className="player-option-title">Player Externo</span>
                <span className="player-option-description">
                  {customPlayerPath
                    ? `Usar ${customPlayerName}`
                    : "Nenhum player selecionado"}
                </span>
              </div>
            </label>
          </div>

          <div className="player-buttons">
            <button
              className="player-settings-button"
              onClick={handleSelectPlayer}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {customPlayerPath
                ? "Trocar player externo"
                : "Selecionar player externo"}
            </button>

            {customPlayerPath && (
              <button
                className="player-settings-button player-settings-button-danger"
                onClick={handleRemovePlayer}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Remover player externo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
