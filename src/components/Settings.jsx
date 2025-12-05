import { useEffect } from "react";
import "../styles/components/Settings.css";

export function Settings({ isOpen, onClose, onChangeFolder }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-card" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">Configurações</h2>
          <button
            className="settings-close-button"
            onClick={onClose}
            aria-label="Fechar"
          >
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
        <div className="settings-content">
          <div className="settings-section">
            <h3 className="settings-section-title">Biblioteca</h3>
            <p className="settings-section-description">
              Altere a pasta onde seus filmes estão armazenados.
            </p>
            <button className="settings-button" onClick={onChangeFolder}>
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
              Trocar pasta de filmes
            </button>
          </div>

          <div className="settings-divider"></div>

          <div className="settings-section support-section">
            <h3 className="settings-section-title">Apoie o Projeto</h3>
            <p className="settings-section-description">
              Se você gostou do Filmic, considere fazer um suporte voluntário.
              Cada contribuição ajuda a manter o projeto vivo! ❤️
            </p>
            <div className="pix-container">
              <img
                src="assets/pix.png"
                alt="QR Code Pix"
                className="pix-image"
              />
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <p className="settings-credits">
            Desenvolvido com muito amor pelo cinema por{" "}
            <a
              href="https://github.com/luccafuccil"
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
            >
              Lucca
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
