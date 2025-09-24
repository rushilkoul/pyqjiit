import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import UploadForm from './components/UploadForm';
import PapersList from './components/PapersList';
import Navbar from './components/Navbar';
import DeveloperMessage from './components/DeveloperMessage';

export default function App() {
  const [user, setUser] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data?.session?.user));

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
  }

  const handleUploadButtonClick = () => {
    if (user) {
      setIsUploadModalOpen(true);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  return (
    <div className="main">
      <Navbar user={user} onSignOut={handleSignOut} />
      <main className="main-content">
      <button
          onClick={handleUploadButtonClick}
          className="upload-button"
        >
          {user ? 'Upload Question Paper' : 'Sign in to Upload Question Papers'}
        </button>
        <PapersList />
        <Login isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        <UploadForm isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} user={user} />
      </main>
      
      {!isUploadModalOpen && (
        <button
          onClick={handleUploadButtonClick}
          className="mobile-upload-button"
        >
          {user ? 'Upload Question Paper' : 'Sign in to Upload'}
        </button>
      )}
      
      <DeveloperMessage />
      
      <footer className="footer">
        <p>made with 💜 by rushil</p>
      </footer>
    </div>
  );
}
