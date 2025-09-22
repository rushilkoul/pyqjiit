import React from 'react';
import { FaGithub, FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from '../themecontext';

function Navbar({ user, onSignOut }) {
  const githubLink = "https://github.com/rushilkoul/pyqjiit";
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="navbar">
        <h1>PYQJIIT</h1>
        <div className="navbar-actions">
          {user && (
            <div className="session-manager">
              <span>Signed in as: {user.email}</span>
              <button onClick={onSignOut} className="signout-button">
                Sign Out
              </button>
            </div>
          )}
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === 'dark' ? <FaSun size={20} /> : <FaMoon size={20} />}
          </button>
          <a href={githubLink} target="_blank" rel="noopener noreferrer" className="github-logo">
            <FaGithub size={24} />
          </a>
        </div>
    </nav>
  );
}

export default Navbar;
