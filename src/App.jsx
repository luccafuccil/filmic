import { useMediaLibrary } from "./hooks/useMediaLibrary";
import { MovieGrid } from "./components/MovieGrid";
import { TitleBar } from "./components/TitleBar";
import { SplashScreen } from "./components/SplashScreen";
import { ContinueWatchingSection } from "./components/ContinueWatchingSection";
import { Settings } from "./components/Settings";
import { UpdateModal } from "./components/UpdateModal";
import { useEffect, useState, useMemo } from "react";
import { electronAPI } from "./services/electronAPI";
import "./styles/components/App.css";

function App() {
  const {
    mediaItems,
    filteredMedia,
    mediaFilter,
    setMediaFilter,
    sortOrder,
    setSortOrder,
    isConfigured,
    loading,
    loadingProgress,
    error,
    selectFolder,
    changeFolder,
  } = useMediaLibrary();

  const [showSplash, setShowSplash] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({
    updateAvailable: false,
    currentVersion: "1.0.0",
    latestVersion: null,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const normalizeString = (str) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  const filteredBySearch = useMemo(() => {
    if (!debouncedSearch.trim()) return filteredMedia;

    const searchNormalized = normalizeString(debouncedSearch);
    return filteredMedia.filter((item) =>
      normalizeString(item.title).includes(searchNormalized)
    );
  }, [filteredMedia, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && minTimeElapsed) {
      const fadeOutTimer = setTimeout(() => {
        setShowSplash(false);
      }, 500);
      return () => clearTimeout(fadeOutTimer);
    }
  }, [loading, minTimeElapsed]);

  useEffect(() => {
    const cleanup = electronAPI.onMenuChangeFolder(() => {
      changeFolder();
    });

    return cleanup;
  }, [changeFolder]);

  // Verificar updates ao iniciar
  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const result = await electronAPI.checkForUpdates();
        setUpdateInfo(result);
      } catch (error) {
        console.error("Error checking for updates:", error);
      }
    };

    // Verificar após 5 segundos
    const timer = setTimeout(checkUpdates, 5000);

    // Listener para quando uma atualização estiver disponível
    const cleanupUpdateAvailable = electronAPI.onUpdateAvailable?.((info) => {
      setUpdateInfo((prev) => ({
        ...prev,
        updateAvailable: true,
        latestVersion: info.version,
      }));
    });

    return () => {
      clearTimeout(timer);
      cleanupUpdateAvailable?.();
    };
  }, []);

  const handleUpdateClick = () => {
    setShowUpdateModal(true);
  };

  const handleDownloadUpdate = async () => {
    electronAPI.downloadUpdate();
  };

  if (showSplash) {
    return <SplashScreen />;
  }

  if (!isConfigured) {
    return (
      <div className="app app-welcome">
        <TitleBar />
        <div className="welcome-container">
          <div className="welcome-content">
            <div className="welcome-icon">
              <img
                src="assets/logo.png"
                alt="Filmic Logo"
                className="welcome-logo"
              />
            </div>
            <h1 className="welcome-title">Bem-vindo ao Filmic</h1>
            <p className="welcome-description">
              Para começar, selecione a pasta onde seus filmes e séries estão
              armazenados.
              <br />
              Você poderá alterar isso depois nas configurações.
            </p>

            <div className="welcome-info-card">
              <div className="welcome-info-content">
                <h3 className="welcome-info-title">Formato das Pastas</h3>
                <p className="welcome-info-text">
                  Organize seus filmes e séries com uma pasta para cada item:
                </p>
                <div className="welcome-info-example">
                  <svg
                    className="welcome-info-folder-icon"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
                  </svg>
                  <span className="welcome-info-example-text">
                    Nome do Filme (Ano)
                  </span>
                </div>
                <div className="welcome-info-example">
                  <svg
                    className="welcome-info-folder-icon"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
                  </svg>
                  <span className="welcome-info-example-text">
                    Nome da Série (Ano)/S01E01.mp4
                  </span>
                </div>
                <p className="welcome-info-note">
                  Exemplos: "Halloween (1980)" ou "Breaking Bad (2008)/Season
                  1/S01E01.mp4"
                </p>
              </div>
            </div>

            <button className="welcome-button" onClick={selectFolder}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Selecionar Pasta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <TitleBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSettingsClick={() => setShowSettings(true)}
        onUpdateClick={handleUpdateClick}
        hasUpdate={updateInfo.updateAvailable}
      />
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onChangeFolder={() => {
          changeFolder();
          setShowSettings(false);
        }}
      />
      <UpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        updateInfo={updateInfo}
        onUpdate={handleDownloadUpdate}
      />
      {loading && (
        <div className="app-loading">
          <p>
            {loadingProgress
              ? `Carregando biblioteca... (${loadingProgress.current}/${loadingProgress.total})`
              : "Carregando biblioteca..."}
          </p>
        </div>
      )}
      {!loading && !error && filteredBySearch.length > 0 && (
        <div className="app-content">
          <div className="media-filter-tabs">
            <button
              className={`filter-tab ${mediaFilter === "all" ? "active" : ""}`}
              onClick={() => setMediaFilter("all")}
            >
              Tudo
            </button>
            <button
              className={`filter-tab ${
                mediaFilter === "movies" ? "active" : ""
              }`}
              onClick={() => setMediaFilter("movies")}
            >
              Filmes
            </button>
            <button
              className={`filter-tab ${
                mediaFilter === "tvshows" ? "active" : ""
              }`}
              onClick={() => setMediaFilter("tvshows")}
            >
              Séries
            </button>
            <div className="sort-divider"></div>
            <button
              className={`filter-tab ${
                sortOrder === "alphabetical" ? "active" : ""
              }`}
              onClick={() => setSortOrder("alphabetical")}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ marginRight: "6px" }}
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="16" y2="12" />
                <line x1="4" y1="18" x2="12" y2="18" />
              </svg>
              A-Z
            </button>
            <button
              className={`filter-tab ${
                sortOrder === "releaseDate" ? "active" : ""
              }`}
              onClick={() => setSortOrder("releaseDate")}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ marginRight: "6px" }}
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Data
            </button>
          </div>
          <ContinueWatchingSection mediaItems={filteredBySearch} />
          <MovieGrid mediaItems={filteredBySearch} />
        </div>
      )}
      {!loading && !error && filteredBySearch.length === 0 && (
        <div className="app-empty">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <h2>
            Nenhum{" "}
            {mediaFilter === "movies"
              ? "filme"
              : mediaFilter === "tvshows"
              ? "série"
              : "item"}{" "}
            encontrado
          </h2>
          <p>Tente buscar por outro nome</p>
        </div>
      )}
      {!loading && error && (
        <div className="app-error">
          <p>Erro ao carregar filmes: {error}</p>
          <button onClick={selectFolder}>Tentar Novamente</button>
        </div>
      )}
    </div>
  );
}

export default App;
