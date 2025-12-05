import { useState, useEffect } from "react";
import { electronAPI } from "../services/electronAPI";

export function useThumbnail(movie) {
  const [thumbnailPath, setThumbnailPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!movie) return;

    async function loadThumbnail() {
      try {
        setLoading(true);
        const result = await electronAPI.generateThumbnail(movie);

        if (result.success) {
          const fileUrl = `file:///${result.thumbnailPath.replace(/\\/g, "/")}`;
          setThumbnailPath(fileUrl);
          setError(false);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadThumbnail();
  }, [movie]);

  return { thumbnailPath, loading, error };
}
