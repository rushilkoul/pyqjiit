import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.endsWith('@jiit.ac.in')) {
      setMessage('Please use a valid JIIT email.');
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) setMessage(error.message);
    else setMessage('check your email for the login link!');
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        placeholder="JIIT email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit">Send Magic Link</button>
      <p>{message}</p>
    </form>
  );
}
