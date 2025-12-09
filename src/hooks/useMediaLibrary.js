import { useState, useEffect } from "react";
import { electronAPI } from "../services/electronAPI";

export function useMediaLibrary() {
  const [folderPath, setFolderPath] = useState(null);
  const [mediaItems, setMediaItems] = useState([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(null);
  const [mediaFilter, setMediaFilter] = useState("all"); // 'all' | 'movies' | 'tvshows'
  const [sortOrder, setSortOrder] = useState("alphabetical"); // 'alphabetical' | 'releaseDate'

  useEffect(() => {
    // Listener para progresso
    const cleanup = electronAPI.onMediaProgress((data) => {
      setLoadingProgress(data);
    });

    const savedFolder = localStorage.getItem("lastLibraryPath");
    if (savedFolder) {
      loadMedia(savedFolder);
    }

    return cleanup;
  }, []);

  const loadMedia = async (path) => {
    setLoading(true);
    setError(null);
    setLoadingProgress(null);
    setFolderPath(path);
    setIsConfigured(true);

    const result = await electronAPI.getMedia(path);

    if (result.success) {
      setMediaItems(result.data);
    } else {
      setError(result.error);
      localStorage.removeItem("lastLibraryPath");
      setIsConfigured(false);
    }

    setLoading(false);
    setLoadingProgress(null);
  };

  const selectFolder = async () => {
    const path = await electronAPI.openFolder();
    if (path) {
      localStorage.setItem("lastLibraryPath", path);
      loadMedia(path);
    }
  };

  const setLibraryFolder = (path) => {
    if (path) {
      localStorage.setItem("lastLibraryPath", path);
      loadMedia(path);
    }
  };

  const changeFolder = async () => {
    const path = await electronAPI.openFolder();
    if (path) {
      localStorage.setItem("lastLibraryPath", path);
      loadMedia(path);
    }
  };

  // Filter media items based on current filter
  const filteredMedia = mediaItems.filter((item) => {
    if (mediaFilter === "all") return true;
    if (mediaFilter === "movies") return item.type === "movie";
    if (mediaFilter === "tvshows") return item.type === "tvshow";
    return true;
  });

  // Sort media items based on sort order
  const sortedMedia = [...filteredMedia].sort((a, b) => {
    if (sortOrder === "alphabetical") {
      const titleA = a.title.toLowerCase();
      const titleB = b.title.toLowerCase();
      return titleA.localeCompare(titleB, "pt-BR");
    } else if (sortOrder === "releaseDate") {
      // Sort by year (most recent first)
      const yearA = a.year || 0;
      const yearB = b.year || 0;
      return yearB - yearA;
    }
    return 0;
  });

  return {
    folderPath,
    mediaItems,
    filteredMedia: sortedMedia,
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
  };
}
