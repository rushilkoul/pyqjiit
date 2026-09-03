import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import UploadForm from './components/UploadForm';
import PapersList from './components/PapersList';
import Navbar from './components/Navbar';
import DeveloperMessage from './components/DeveloperMessage';
import Onboarding from './components/Onboarding';
import Privacy from './components/Privacy';

const ONBOARDING_KEY = 'onboarding-completed-v1';
const PREFERENCES_KEY = 'user-preferences-v1';

export default function App() {
  const [user, setUser] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);
  const [currentPage, setCurrentPage] = useState(
    typeof window !== 'undefined' && window.location.pathname === '/privacy' ? 'privacy' : 'home'
  );

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(window.location.pathname === '/privacy' ? 'privacy' : 'home');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const isOnboardingCompleted = localStorage.getItem(ONBOARDING_KEY) === 'true';
    if (!isOnboardingCompleted) {
      setShowOnboarding(true);
    } else {
      const saved = localStorage.getItem(PREFERENCES_KEY);
      if (saved) {
        setUserPreferences(JSON.parse(saved));
      }
    }

    let mounted = true;
    
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUser(data?.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
  }

  const handleOnboardingComplete = (preferences) => {
    setUserPreferences(preferences);
    setShowOnboarding(false);
  };

  const handleResetPreferences = () => {
    setShowOnboarding(true);
  };

  const handleUploadButtonClick = () => {
    if (user) {
      setIsUploadModalOpen(true);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const navigateTo = (page, path) => {
    window.history.pushState({}, '', path);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const canUpload = !!user;

  if (currentPage === 'privacy') {
    return (
      <Privacy 
        user={user} 
        onSignOut={handleSignOut} 
        onBack={() => navigateTo('home', '/')} 
      />
    );
  }

  return (
    <div className="main">
      <Navbar 
        user={user} 
        onSignOut={handleSignOut} 
        onNavigateHome={() => navigateTo('home', '/')} 
      />
      <main className="main-content">
        <PapersList 
          preferences={userPreferences} 
          onResetPreferences={handleResetPreferences} 
          canUpload={canUpload}
          onUploadClick={handleUploadButtonClick}
        />
        <Login isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        <UploadForm 
          isOpen={isUploadModalOpen} 
          onClose={() => setIsUploadModalOpen(false)} 
          user={user} 
          preferences={userPreferences} 
        />
      </main>
      
      {!isUploadModalOpen && (
        <button
          onClick={handleUploadButtonClick}
          className="mobile-upload-button"
        >
          {canUpload ? 'Upload Question Paper' : 'Sign in to Upload'}
        </button>
      )}
      
      <DeveloperMessage />
      
      <Onboarding 
        isOpen={showOnboarding} 
        onComplete={handleOnboardingComplete} 
        onClose={userPreferences ? () => setShowOnboarding(false) : undefined}
        initialPreferences={userPreferences}
      />
      
      <footer className="footer">
        <p>
          made with 💜 by rushil •{' '}
          <a 
            href="/privacy" 
            onClick={(e) => { e.preventDefault(); navigateTo('privacy', '/privacy'); }}
            style={{ color: 'inherit', opacity: 0.75, textDecoration: 'underline' }}
          >
            Privacy Policy
          </a>
        </p>
      </footer>
    </div>
  );
}
