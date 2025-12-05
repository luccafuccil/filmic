import { useEffect } from "react";

export function useKeyboardShortcuts({
  onPlayPause,
  onSeekForward,
  onSeekBackward,
  onVolumeUp,
  onVolumeDown,
  onToggleFullscreen,
  onToggleMute,
  onToggleSubtitles,
  onClose,
  enabled = true,
}) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      const handledKeys = [
        " ",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "f",
        "F",
        "m",
        "M",
        "c",
        "C",
        "Escape",
      ];
      if (handledKeys.includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case " ":
          onPlayPause?.();
          break;
        case "ArrowRight":
          onSeekForward?.(10);
          break;
        case "ArrowLeft":
          onSeekBackward?.(10);
          break;
        case "ArrowUp":
          onVolumeUp?.(0.1);
          break;
        case "ArrowDown":
          onVolumeDown?.(0.1);
          break;
        case "f":
        case "F":
          onToggleFullscreen?.();
          break;
        case "m":
        case "M":
          onToggleMute?.();
          break;
        case "c":
        case "C":
          onToggleSubtitles?.();
          break;
        case "Escape":
          onClose?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    onPlayPause,
    onSeekForward,
    onSeekBackward,
    onVolumeUp,
    onVolumeDown,
    onToggleFullscreen,
    onToggleMute,
    onToggleSubtitles,
    onClose,
    enabled,
  ]);
}
