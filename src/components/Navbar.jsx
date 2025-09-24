import React, { useState, useEffect, useRef } from 'react';
import { FaGithub, FaSun, FaMoon, FaUser, FaChevronDown } from 'react-icons/fa';
import { useTheme } from '../themecontext';

function Navbar({ user, onSignOut }) {
  const githubLink = "https://github.com/rushilkoul/pyqjiit";
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const handleSignOut = () => {
    setUserMenuOpen(false);
    onSignOut();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  return (
    <nav className="navbar">
        <h1><span>PYQ</span>JIIT</h1>
        <div className="navbar-actions">
          {user && (
            <div className="user-menu" ref={userMenuRef}>
              <button 
                onClick={toggleUserMenu} 
                className="user-menu-trigger"
                aria-expanded={userMenuOpen}
              >
                <FaUser size={16} />
                <FaChevronDown size={12} />
              </button>
              {userMenuOpen && (
                <div className="user-dropdown">
                  <div className="user-info">
                    <span className="user-email">{user.email}</span>
                  </div>
                  <button onClick={handleSignOut} className="dropdown-signout">
                    Sign Out
                  </button>
                </div>
              )}
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
