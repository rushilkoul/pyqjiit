import { useState, useEffect } from 'react';

const CURRENT_VERSION = 'v0.4a';
const STORAGE_KEY = `dev-message-dismissed-${CURRENT_VERSION}`;

const MESSAGE_CONFIG = {
  version: CURRENT_VERSION,
  message: "Welcome freshers! feel free to take a look around. This website exists because of the community's efforts, don't forget to eventually upload your own papers and help others out!",
  // type: "feature"
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
      case 'alert': return '⚠️';
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
