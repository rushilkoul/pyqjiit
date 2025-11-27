import { useState, useEffect } from 'react';

const CURRENT_VERSION = 'v0.3';
const STORAGE_KEY = `dev-message-dismissed-${CURRENT_VERSION}`;

const MESSAGE_CONFIG = {
  version: CURRENT_VERSION,
  message: "PYQJIIT now has a new domain! Unfortunately logged in users will need to sign in again. Apologies for the inconvenience. If you experience any issues, reach out on GitHub.",
  type: "update"
};

export default function DeveloperMessage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    if (!isDismissed) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!isVisible) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'fix': return '🐛';
      case 'feature': return '✨';
      case 'update': return '📢';
      default: return '💬';
    }
  };

  return (
    <div className="dev-message">
      <div className="dev-message-content">
        <span className="dev-message-icon">{getIcon(MESSAGE_CONFIG.type)}</span>
        <div className="dev-message-text">
          <small className="dev-message-version">{MESSAGE_CONFIG.version}</small>
          <p className="dev-message-body">{MESSAGE_CONFIG.message}</p>
        </div>
        <button 
          onClick={handleDismiss} 
          className="dev-message-close"
          aria-label="Dismiss message"
        >
          ×
        </button>
      </div>
    </div>
  );
}