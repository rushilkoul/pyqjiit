import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import UploadForm from './components/UploadForm';
import PapersList from './components/PapersList';
import Navbar from './components/Navbar';
import DeveloperMessage from './components/DeveloperMessage';
import Onboarding from './components/Onboarding';

const DEV_MODE = import.meta.env.DEV;
const ONBOARDING_KEY = 'onboarding-completed-v1';
const PREFERENCES_KEY = 'user-preferences-v1';

export default function App() {
  const [user, setUser] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);

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
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(PREFERENCES_KEY);
    setShowOnboarding(true);
    setUserPreferences(null);
  };

  const handleUploadButtonClick = () => {
    if (user || DEV_MODE) {
      setIsUploadModalOpen(true);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const canUpload = user || DEV_MODE;

  return (
    <div className="main">
      <Navbar user={user} onSignOut={handleSignOut} />
      <main className="main-content">
      <button
          onClick={handleUploadButtonClick}
          className="upload-button"
        >
          {canUpload ? 'Upload Question Paper' : 'Sign in to Upload'}
        </button>
        <PapersList preferences={userPreferences} onResetPreferences={handleResetPreferences} />
        <Login isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        <UploadForm isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} user={user} />
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
      <Onboarding isOpen={showOnboarding} onComplete={handleOnboardingComplete} />
      
      <footer className="footer">
        <p>made with 💜 by rushil</p>
      </footer>
    </div>
  );
}
