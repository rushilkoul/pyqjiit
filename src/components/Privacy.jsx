import React from 'react';
import Navbar from './Navbar';

export default function Privacy({ user, onSignOut, onBack }) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="main">
      <Navbar user={user} onSignOut={onSignOut} onNavigateHome={handleBack} />
      <main className="main-content" style={{ maxWidth: '800px', width: '100%', margin: '0 auto', alignItems: 'flex-start' }}>
        <button 
          onClick={handleBack} 
          className="back-nav-btn"
        >
          ← Back to papers
        </button>

        <div className="privacy-container" style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '2rem',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          lineHeight: '1.6'
        }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-color)' }}>Privacy Policy</h1>
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Last updated: September 2026</p>

          <section>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-color)' }}>1. Overview</h2>
            <p style={{ opacity: 0.85, fontSize: '0.95rem' }}>
              <strong>PYQJIIT</strong> is an open community project created by Rushil Koul for students of <strong>Jaypee Institute of Information Technology</strong> to view and share past/current-year question papers. 
              I respect your privacy and only process the minimal information necessary to authenticate uploads and keep the library spam-free.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-color)' }}>2. Information Collected</h2>
            <ul style={{ paddingLeft: '1.5rem', opacity: 0.85, fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <strong>When signing in:</strong> Only your JIIT email address (<code style={{ background: 'var(--paper-details-bg)', padding: '2px 6px', borderRadius: '4px' }}>@mail.jiit.ac.in</code>) is received via Google OAuth to verify that you are a student and authorize uploads. Nothing else from your Google account is accessed.
              </li>
              <li>
                <strong>When uploading papers:</strong> Examination paper files (PDFs/images) and details (subject, semester, batch) that you voluntarily choose to submit are stored in the public repository.
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-color)' }}>3. How Information Is Used</h2>
            <ul style={{ paddingLeft: '1.5rem', opacity: 0.85, fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li>To host, organize, and maintain the PYQJIIT question paper repository.</li>
              <li>To prevent spam and verify genuine student uploads.</li>
              {/* gotta add this later lmao */}
              {/* <li>To allow you to manage and delete papers you have uploaded.</li> */}
              <li>I <strong>never</strong> sell, monetize, or share student data with any advertisers or third parties.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-color)' }}>4. Contact</h2>
            <ul style={{ paddingLeft: '1.5rem', opacity: 0.85, fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li>
                Feel free to reach out or contribute on GitHub at <a href="https://github.com/rushilkoul/pyqjiit" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)' }}>github.com/rushilkoul/pyqjiit</a>.
              </li>
              <li>
                If you have any concerns regarding a paper or anything pertaining to PYQJIIT, reach me directly at <a href="mailto:pyqjiit@mail.rushilk.dev" style={{ color: 'var(--accent-color)' }}>pyqjiit@mail.rushilk.dev</a>.
              </li>
            </ul>
          </section>
        </div>

        <button 
          onClick={handleBack} 
          className="back-nav-btn"
          style={{ marginTop: '1.5rem' }}
        >
          ← Back to papers
        </button>
      </main>

      <footer className="footer">
        <p>made with 💜 by rushil</p>
      </footer>
    </div>
  );
}
