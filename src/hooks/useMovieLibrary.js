import { useState, useEffect } from "react";
import { electronAPI } from "../services/electronAPI";

export function useMovieLibrary() {
  const [folderPath, setFolderPath] = useState(null);
  const [movies, setMovies] = useState([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(null);

  useEffect(() => {
    // Listener para progresso
    const cleanup = electronAPI.onMoviesProgress((data) => {
      setLoadingProgress(data);
    });

    const savedFolder = localStorage.getItem("filmicFolder");
    if (savedFolder) {
      loadMovies(savedFolder);
    }

    return cleanup;
  }, []);

  const loadMovies = async (path) => {
    setLoading(true);
    setError(null);
    setLoadingProgress(null);
    setFolderPath(path);
    setIsConfigured(true);

    const result = await electronAPI.getMovies(path);

    if (result.success) {
      setMovies(result.data);
    } else {
      setError(result.error);
      localStorage.removeItem("filmicFolder");
      setIsConfigured(false);
    }

    setLoading(false);
    setLoadingProgress(null);
  };

  const selectFolder = async () => {
    const path = await electronAPI.openFolder();
    if (path) {
      localStorage.setItem("filmicFolder", path);
      loadMovies(path);
    }
  };

  const changeFolder = async () => {
    const path = await electronAPI.openFolder();
    if (path) {
      localStorage.setItem("filmicFolder", path);
      loadMovies(path);
    }
  };

  return {
    folderPath,
    movies,
    isConfigured,
    loading,
    loadingProgress,
    error,
    selectFolder,
    changeFolder,
  };
}
