import { useState, useEffect } from "react";
import { electronAPI } from "../services/electronAPI";

export function useThumbnail(movie) {
  const [thumbnailPath, setThumbnailPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!movie) return;

    let cancelled = false;

    async function loadThumbnail() {
      try {
        setLoading(true);
        setError(false);
        const result = await electronAPI.generateThumbnail(movie);

        if (cancelled) return;

        if (result.success) {
          const fileUrl = `file:///${result.thumbnailPath.replace(/\\/g, "/")}`;
          setThumbnailPath(fileUrl);
          setError(false);
        } else {
          console.error("Thumbnail generation failed:", result.error);
          setError(true);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Error loading thumbnail:", err);
        setError(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadThumbnail();

    return () => {
      cancelled = true;
    };
  }, [movie]);

  return { thumbnailPath, loading, error };
}

// Hook specifically for episode thumbnails using episode path as identifier
export function useEpisodeThumbnail(episodePath) {
  const [thumbnailPath, setThumbnailPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!episodePath) {
      setLoading(false);
      setError(true);
      return;
    }

    let cancelled = false;

    async function loadThumbnail() {
      try {
        setLoading(true);
        setError(false);
        const result = await electronAPI.generateEpisodeThumbnail({
          path: episodePath,
        });

        if (cancelled) return;

        if (result.success) {
          const fileUrl = `file:///${result.thumbnailPath.replace(/\\/g, "/")}`;
          setThumbnailPath(fileUrl);
          setError(false);
        } else {
          console.error("Episode thumbnail generation failed:", result.error);
          setError(true);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Error loading episode thumbnail:", err);
        setError(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadThumbnail();

    return () => {
      cancelled = true;
    };
  }, [episodePath]);

  return { thumbnailPath, loading, error };
}
