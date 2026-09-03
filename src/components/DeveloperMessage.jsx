import { useState, useEffect } from 'react';
import { VscSparkle, VscRocket, VscBug, VscMegaphone, VscTerminal } from 'react-icons/vsc';

const CURRENT_VERSION = 'v0.5a';
const STORAGE_KEY = `dev-message-dismissed-${CURRENT_VERSION}`;

const MESSAGE_CONFIG = {
  version: CURRENT_VERSION,
  message: "New update :D sign in instantly with your JIIT Google account, easily search for papers, and enjoy faster image uploads.",
  type: "alert"
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
      case 'fix': return <VscBug size={16} />;
      case 'feature': return <VscSparkle size={16} />;
      case 'update': return <VscRocket size={16} />;
      case 'alert': return <VscMegaphone size={16} />;
      default: return <VscTerminal size={16} />;
    }
  };

  return (
    <div className="dev-message">
      <div className="dev-message-content">
        <span className="dev-message-icon-nf">{getIcon(MESSAGE_CONFIG.type)}</span>
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
