import { useState } from "react";
import "../styles/components/TitleBar.css";

export function TitleBar({ searchQuery, onSearchChange, onSettingsClick }) {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = () => {
    if (window.fileAPI && window.fileAPI.minimizeWindow) {
      window.fileAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (window.fileAPI && window.fileAPI.maximizeWindow) {
      window.fileAPI.maximizeWindow();
      setIsMaximized(!isMaximized);
    }
  };

  const handleClose = () => {
    if (window.fileAPI && window.fileAPI.closeWindow) {
      window.fileAPI.closeWindow();
    }
  };

  return (
    <div className="titlebar">
      <div className="titlebar-drag-region">
        <div className="titlebar-logo">
          <img src="../public/assets/logo-full.png" alt="Filmic Logo"></img>
        </div>
        <div className="titlebar-search">
          <svg
            className="titlebar-search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="titlebar-search-input"
            placeholder="Buscar filmes..."
            value={searchQuery || ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
          {searchQuery && (
            <button
              className="titlebar-search-clear"
              onClick={() => onSearchChange?.("")}
              aria-label="Limpar busca"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <button
          className="titlebar-button titlebar-settings-button"
          onClick={onSettingsClick}
          aria-label="Configurações"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>
      <div className="titlebar-controls">
        <button
          className="titlebar-button titlebar-minimize"
          onClick={handleMinimize}
          aria-label="Minimizar"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="0" y="5" width="12" height="2" fill="currentColor" />
          </svg>
        </button>
        <button
          className="titlebar-button titlebar-maximize"
          onClick={handleMaximize}
          aria-label="Maximizar"
        >
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect
                x="2"
                y="0"
                width="10"
                height="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="0"
                y="2"
                width="10"
                height="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect
                x="0"
                y="0"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          )}
        </button>
        <button
          className="titlebar-button titlebar-close"
          onClick={handleClose}
          aria-label="Fechar"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line
              x1="1"
              y1="1"
              x2="11"
              y2="11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="11"
              y1="1"
              x2="1"
              y2="11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
