import { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { supabase } from '../supabaseClient';
import Modal from './Modal';

// let us take a moment of silence for the enrollemnt magic link login method.
// that code existed for 11 months straight, responsible for onboarding 92 users. 
// (while failing for a lot of them which actually decreased public perception of pyqjiit but lmao)

// rest easy, soldier. you did your job.

export default function Login({ isOpen, onClose }) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            hd: 'mail.jiit.ac.in',
            prompt: 'select_account',
          },
          redirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
    } catch (err) {
      console.error('Error signing in with Google:', err);
      setError(err.message || 'Failed to sign in with Google. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="login-modal-content">
        <h1>Welcome to PYQJIIT!</h1>
        <p className="login-description">
          Sign in with your JIIT Google account (<code>@mail.jiit.ac.in</code>) to upload question papers.
        </p>
        <p style={{ fontSize: '0.85rem', opacity: 0.75, lineHeight: 1.4, margin: '-0.25rem 0 0.5rem 0' }}>
          <strong>Why?</strong> This prevents spam and ensures only verified JIIT students can contribute papers.
        </p>

        <button 
          type="button"
          onClick={handleGoogleLogin} 
          disabled={googleLoading}
          className="google-signin-btn"
        >
          <FcGoogle size={22} />
          <span>{googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
        </button>

        {error && <p className="error-message" style={{ marginTop: '0.75rem' }}>{error}</p>}
      </div>
    </Modal>
  );
}
