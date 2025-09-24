import { useState } from 'react';
import { supabase } from '../supabaseClient';
import Modal from './Modal';

export default function Login({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState('');

  const validateEnrollmentNumber = (number) => {
    const is10Digit = /^\d{10}$/.test(number);
    const is12Digit = /^\d{12}$/.test(number);
    return is10Digit || is12Digit;
  };

  const getSectorInfo = (number) => {
    if (/^\d{10}$/.test(number)) {
      return { sector: 'Sector 62', isValid: true };
    } else if (/^\d{12}$/.test(number)) {
      return { sector: 'Sector 128', isValid: true };
    } else {
      return { sector: 'Invalid', isValid: false };
    }
  };

  const handleEnrollmentChange = (e) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, '').slice(0, 12);
    setEnrollmentNumber(digitsOnly);
    
    if (error) setError('');
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    
    if (!validateEnrollmentNumber(enrollmentNumber)) {
      setError('Enrollment number must be 10 digits (Sector 62) or 12 digits (Sector 128)');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const email = `${enrollmentNumber}@mail.jiit.ac.in`;
    
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({ email });

      if (authError) {
        if (authError.message.includes('rate limit')) {
          setError('Too many attempts. Please wait a moment and try again.');
        } else {
          setError(`Failed to send magic link: ${authError.message}`);
        }
      } else {
        setMagicLinkSent(true);
      }
    } catch (error) {
      setError('Failed to send magic link. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
        <h1>Welcome to PYQJIIT!</h1>
        <pre>Enter your <b>JIIT enrollment number.</b> A login link will be sent to your gmail.</pre>
        <pre><b>Why?</b><br/>This is just a precautionary measure to inhibit bad actors from spam uploading random stuff.</pre>

        {magicLinkSent ? (
          <p style={{opacity: 0.7}}>
            A magic login link has been sent to your JIIT email:<br /><b>{enrollmentNumber}@mail.jiit.ac.in</b><br />Please check your inbox to sign in!
          </p>
        ) : (
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Enrollment Number (10 or 12 digits)"
              value={enrollmentNumber}
              onChange={handleEnrollmentChange}
              disabled={loading}
              maxLength={12}
            />
            {enrollmentNumber && (
              <p style={{ 
                fontSize: '0.9rem', 
                marginTop: '0.25rem',
                color: getSectorInfo(enrollmentNumber).isValid ? 'var(--success-color)' : 'var(--text-color)',
                opacity: 0.8
              }}>
                {getSectorInfo(enrollmentNumber).sector}
              </p>
            )}
            {error && <p className="error-message">{error}</p>}
            <button
              type="submit"
              disabled={loading || !validateEnrollmentNumber(enrollmentNumber)}
            >
              {loading ? 'Loading...' : 'Send Magic Link'}
            </button>
          </form>
        )}
    </Modal>
  );
}
