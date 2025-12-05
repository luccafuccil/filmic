export const getQualityLabel = (resolution) => {
  if (!resolution) return null;

  const height = parseInt(resolution.split("x")[1]);

  if (height >= 2160) return "4K";
  if (height >= 1080) return "FHD";
  if (height >= 720) return "HD";

  return null;
};

export const formatTime = (seconds) => {
  if (isNaN(seconds)) return "00:00:00";

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (num) => String(num).padStart(2, "0");

  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
};
