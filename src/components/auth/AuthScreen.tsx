'use client';

import { useState } from 'react';
import { ApiError, signIn, signUp } from '@/lib/api';
import type { AuthUser } from '@/lib/types';

type Mode = 'signin' | 'signup';

export function AuthScreen({ onSignedIn }: { onSignedIn: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);

    if (username.trim() === '' || password === '') {
      setError('Fill in both fields.');
      return;
    }
    if (mode === 'signup' && password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const { user } = mode === 'signin'
        ? await signIn(username, password)
        : await signUp(username, password);
      onSignedIn(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  const switchTo = (next: Mode) => {
    setMode(next);
    setError(null);
    setPassword('');
    setConfirm('');
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">Calver</h1>
        <p className="auth-sub">
          {mode === 'signin' ? 'Sign in to your boards.' : 'Create an account to start a board.'}
        </p>

        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="auth-field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {mode === 'signup' && (
            <label className="auth-field">
              <span>Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button className="btn auth-submit" type="submit" disabled={busy}>
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'signin' ? (
            <>
              No account yet?{' '}
              <button type="button" onClick={() => switchTo('signup')}>Sign up</button>
            </>
          ) : (
            <>
              Already have one?{' '}
              <button type="button" onClick={() => switchTo('signin')}>Sign in</button>
            </>
          )}
        </div>

        {mode === 'signup' && (
          <p className="auth-note">
            A username and password are all that is stored. Passwords are hashed with scrypt and
            never kept in plain text.
          </p>
        )}
      </div>
    </div>
  );
}
