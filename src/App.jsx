import { useEffect, useState, useMemo, useCallback } from "react";
import { useMediaLibrary } from "./hooks/useMediaLibrary";
import { electronAPI } from "./services/electronAPI";
import { MovieGrid } from "./components/MovieGrid";
import { TitleBar } from "./components/TitleBar";
import { SplashScreen } from "./components/SplashScreen";
import { ContinueWatchingSection } from "./components/ContinueWatchingSection";
import { Settings } from "./components/Settings";
import { PlayerSettings } from "./components/PlayerSettings";
import { UpdateModal } from "./components/UpdateModal";
import "./styles/components/App.css";

const SPLASH_MIN_DURATION = 2500;
const SPLASH_FADE_OUT_DELAY = 500;
const SEARCH_DEBOUNCE_DELAY = 300;
const UPDATE_CHECK_DELAY = 5000;

const FolderIcon = ({ width = 20, height = 20, strokeWidth = 2 }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const AlphabeticalIcon = ({ width = 16, height = 16 }) => (
  <svg
    width={width}
    height={height}
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
);

const CalendarIcon = ({ width = 16, height = 16 }) => (
  <svg
    width={width}
    height={height}
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
);

const SearchIcon = ({ width = 64, height = 64, strokeWidth = 1.5 }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const getMediaTypeLabel = (filter) => {
  const labels = {
    movies: "filme",
    tvshows: "série",
    all: "item",
  };
  return labels[filter] || "item";
};

const FILTER_TABS = [
  { value: "all", label: "Tudo" },
  { value: "movies", label: "Filmes" },
  { value: "tvshows", label: "Séries" },
];

const SORT_OPTIONS = [
  { value: "alphabetical", label: "A-Z", icon: AlphabeticalIcon },
  { value: "releaseDate", label: "Data", icon: CalendarIcon },
];

function App() {
  const {
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
    setLibraryFolder,
    changeFolder,
  } = useMediaLibrary();

  const [showSplash, setShowSplash] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlayerSettings, setShowPlayerSettings] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [updateInfo, setUpdateInfo] = useState({
    updateAvailable: false,
    currentVersion: "1.0.0",
    latestVersion: null,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, SEARCH_DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredBySearch = useMemo(() => {
    if (!debouncedSearch.trim()) return filteredMedia;

    const normalizeString = (str) =>
      str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    const searchNormalized = normalizeString(debouncedSearch);
    return filteredMedia.filter((item) =>
      normalizeString(item.title).includes(searchNormalized),
    );
  }, [filteredMedia, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, SPLASH_MIN_DURATION);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && minTimeElapsed) {
      const fadeOutTimer = setTimeout(() => {
        setShowSplash(false);
      }, SPLASH_FADE_OUT_DELAY);
      return () => clearTimeout(fadeOutTimer);
    }
  }, [loading, minTimeElapsed]);

  useEffect(() => {
    const cleanup = electronAPI.onMenuChangeFolder(() => {
      changeFolder();
    });

    return cleanup;
  }, [changeFolder]);

  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const result = await electronAPI.checkForUpdates();
        setUpdateInfo(result);
        if (result.updateAvailable) {
          setShowUpdateModal(true);
        }
      } catch (error) {
        console.error("Erro ao verificar atualizações:", error);
      }
    };

    const timer = setTimeout(checkUpdates, UPDATE_CHECK_DELAY);

    const cleanupUpdateAvailable = electronAPI.onUpdateAvailable?.((info) => {
      setUpdateInfo((prev) => ({
        ...prev,
        updateAvailable: true,
        latestVersion: info.version,
      }));
      setShowUpdateModal(true);
    });

    return () => {
      clearTimeout(timer);
      cleanupUpdateAvailable?.();
    };
  }, []);

  const handleUpdateClick = useCallback(() => {
    setShowUpdateModal(true);
  }, []);

  const handleDownloadUpdate = useCallback(async () => {
    electronAPI.downloadUpdate();
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;

      if (files.length > 0) {
        const file = files[0];
        const droppedPath = electronAPI.getFilePathFromDrop(file);

        if (droppedPath) {
          const folderPath = await electronAPI.getDroppedPath(droppedPath);
          if (folderPath) {
            setLibraryFolder(folderPath);
          }
        }
      }
    },
    [setLibraryFolder],
  );

  const handleSettingsOpen = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleSettingsClose = useCallback(() => {
    setShowSettings(false);
  }, []);

  const handlePlayerSettingsOpen = useCallback(() => {
    setShowPlayerSettings(true);
  }, []);

  const handlePlayerSettingsClose = useCallback(() => {
    setShowPlayerSettings(false);
  }, []);

  const handleChangeFolder = useCallback(() => {
    changeFolder();
    setShowSettings(false);
  }, [changeFolder]);

  const handleUpdateModalClose = useCallback(() => {
    setShowUpdateModal(false);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  if (!isConfigured) {
    return (
      <div className="app app-welcome">
        <TitleBar />
        <div
          className={`welcome-container ${isDragging ? "dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
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
              Organize e assista sua coleção de filmes e séries com uma
              interface elegante e moderna
            </p>

            <button className="welcome-button" onClick={selectFolder}>
              <FolderIcon />
              Selecionar Pasta da Biblioteca
            </button>

            <p className="welcome-footer-note">
              Clique no botão ou arraste a pasta aqui
            </p>
          </div>

          {isDragging && (
            <div className="drag-overlay">
              <div className="drag-overlay-content">
                <FolderIcon width={64} height={64} />
                <h2>Solte a pasta aqui</h2>
                <p>A pasta será configurada como sua biblioteca</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <TitleBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSettingsClick={handleSettingsOpen}
        onPlayerSettingsClick={handlePlayerSettingsOpen}
        onUpdateClick={handleUpdateClick}
        hasUpdate={updateInfo.updateAvailable}
      />
      <Settings
        isOpen={showSettings}
        onClose={handleSettingsClose}
        onChangeFolder={handleChangeFolder}
      />
      <PlayerSettings
        isOpen={showPlayerSettings}
        onClose={handlePlayerSettingsClose}
      />
      <UpdateModal
        isOpen={showUpdateModal}
        onClose={handleUpdateModalClose}
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
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                className={`filter-tab ${
                  mediaFilter === tab.value ? "active" : ""
                }`}
                onClick={() => setMediaFilter(tab.value)}
              >
                {tab.label}
              </button>
            ))}
            <div className="sort-divider"></div>
            {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                className={`filter-tab ${sortOrder === value ? "active" : ""}`}
                onClick={() => setSortOrder(value)}
              >
                <Icon />
                {label}
              </button>
            ))}
          </div>
          <ContinueWatchingSection mediaItems={filteredBySearch} />
          <MovieGrid mediaItems={filteredBySearch} />
        </div>
      )}
      {!loading && !error && filteredBySearch.length === 0 && (
        <div className="app-empty">
          <SearchIcon />
          <h2>Nenhum {getMediaTypeLabel(mediaFilter)} encontrado</h2>
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
