import { useState, useEffect } from "react";
import "../styles/components/UpdateModal.css";

export function UpdateModal({ isOpen, onClose, updateInfo, onUpdate }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isReadyToInstall, setIsReadyToInstall] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleProgress = (progress) => {
      setDownloadProgress(Math.round(progress.percent));
    };

    const handleDownloaded = () => {
      setIsDownloading(false);
      setIsReadyToInstall(true);
    };

    const cleanupProgress = window.fileAPI?.onUpdateProgress?.(handleProgress);
    const cleanupDownloaded =
      window.fileAPI?.onUpdateDownloaded?.(handleDownloaded);

    return () => {
      cleanupProgress?.();
      cleanupDownloaded?.();
    };
  }, [isOpen]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    await onUpdate();
  };

  const handleInstall = () => {
    if (window.fileAPI?.installUpdate) {
      window.fileAPI.installUpdate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="update-modal-overlay" onClick={onClose}>
      <div className="update-modal" onClick={(e) => e.stopPropagation()}>
        <div className="update-modal-header">
          <h2>Atualização do Filmic</h2>
          <button className="update-modal-close" onClick={onClose}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="update-modal-content">
          <div className="update-version-info">
            <div className="update-version-current">
              <span className="update-version-label">Versão atual</span>
              <span className="update-version-number">
                {updateInfo.currentVersion}
              </span>
            </div>
            {updateInfo.latestVersion && (
              <div className="update-version-arrow">→</div>
            )}
            {updateInfo.latestVersion && (
              <div className="update-version-latest">
                <span className="update-version-label">Nova versão</span>
                <span className="update-version-number update-version-highlight">
                  {updateInfo.latestVersion}
                </span>
              </div>
            )}
          </div>

          {!updateInfo.updateAvailable && (
            <div className="update-status-message">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p>Você está usando a versão mais recente!</p>
            </div>
          )}

          {updateInfo.updateAvailable &&
            !isDownloading &&
            !isReadyToInstall && (
              <div className="update-status-message">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <p>Uma nova versão está disponível para download.</p>
              </div>
            )}

          {isDownloading && (
            <div className="update-download-progress">
              <div className="update-progress-bar">
                <div
                  className="update-progress-fill"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="update-progress-text">
                Baixando atualização... {downloadProgress}%
              </p>
            </div>
          )}

          {isReadyToInstall && (
            <div className="update-status-message update-status-success">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p>Atualização baixada! Pronto para instalar.</p>
            </div>
          )}
        </div>

        <div className="update-modal-footer">
          {updateInfo.updateAvailable &&
            !isDownloading &&
            !isReadyToInstall && (
              <button
                className="update-button update-button-primary"
                onClick={handleDownload}
              >
                Baixar Atualização
              </button>
            )}

          {isReadyToInstall && (
            <button
              className="update-button update-button-primary"
              onClick={handleInstall}
            >
              Instalar e Reiniciar
            </button>
          )}

          <button
            className="update-button update-button-secondary"
            onClick={onClose}
          >
            {isReadyToInstall ? "Instalar Depois" : "Fechar"}
          </button>
        </div>
      </div>
    </div>
  );
}
