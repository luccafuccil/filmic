import { useMovieLibrary } from "./hooks/useMovieLibrary";
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
    movies,
    isConfigured,
    loading,
    loadingProgress,
    error,
    selectFolder,
    changeFolder,
  } = useMovieLibrary();

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

  const filteredMovies = useMemo(() => {
    if (!debouncedSearch.trim()) return movies;

    const searchNormalized = normalizeString(debouncedSearch);
    return movies.filter((movie) =>
      normalizeString(movie.title).includes(searchNormalized)
    );
  }, [movies, debouncedSearch]);

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
              Para começar, selecione a pasta onde seus filmes estão
              armazenados.
              <br />
              Você poderá alterar isso depois nas configurações.
            </p>

            <div className="welcome-info-card">
              <div className="welcome-info-content">
                <h3 className="welcome-info-title">Formato das Pastas</h3>
                <p className="welcome-info-text">
                  Organize seus filmes com uma pasta para cada filme seguindo o
                  formato:
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
                <p className="welcome-info-note">
                  Exemplo: "Halloween (1980)" ou "A Hora da Estrela (1985)"
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
              ? `Carregando filmes... (${loadingProgress.current}/${loadingProgress.total})`
              : "Carregando filmes..."}
          </p>
        </div>
      )}
      {!loading && !error && filteredMovies.length > 0 && (
        <div className="app-content">
          <ContinueWatchingSection movies={filteredMovies} />
          <MovieGrid movies={filteredMovies} />
        </div>
      )}
      {!loading && !error && filteredMovies.length === 0 && (
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
          <h2>Nenhum filme encontrado</h2>
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
