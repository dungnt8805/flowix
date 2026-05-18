'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  AuthApi,
  createBrowserFloVisApiClient,
  FloVisApiClient,
  LoginPayload,
  RegisterPayload
} from '@/lib/api/floVisApiClient';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

interface AuthScreenProps {
  mode: AuthMode;
  apiClient?: AuthApi | null;
}

export function AuthScreen({ mode, apiClient }: AuthScreenProps): React.ReactElement {
  const client = useMemo<AuthApi | null>(() => apiClient ?? createBrowserAuthClient(), [apiClient]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (client === null) {
      setError('Authentication API is not configured.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'login') {
        await client.login({ email, password } satisfies LoginPayload);
        window.location.href = '/';
      } else if (mode === 'register') {
        await client.register({ email, password, displayName } satisfies RegisterPayload);
        window.location.href = '/';
      } else if (mode === 'forgot') {
        const response = await client.forgotPassword(email);
        setMessage(
          response.resetToken === undefined
            ? 'If the account exists, reset instructions have been sent.'
            : `Reset token: ${response.resetToken}`
        );
      } else {
        await client.resetPassword({ token, password });
        setMessage('Password reset. You can sign in with the new password.');
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-brand">
          <span className="brand-mark">FV</span>
          <div>
            <h1 id="auth-title">{titleForMode(mode)}</h1>
            <p>Flo Vis workspace authentication</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          {mode !== 'reset' ? (
            <label>
              Email
              <input
                autoComplete="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
          ) : null}

          {mode === 'register' ? (
            <label>
              Display name
              <input
                autoComplete="name"
                name="displayName"
                onChange={(event) => setDisplayName(event.target.value)}
                type="text"
                value={displayName}
              />
            </label>
          ) : null}

          {mode === 'reset' ? (
            <label>
              Reset token
              <input
                autoComplete="one-time-code"
                name="token"
                onChange={(event) => setToken(event.target.value)}
                required
                type="text"
                value={token}
              />
            </label>
          ) : null}

          {mode !== 'forgot' ? (
            <label>
              Password
              <input
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={12}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
          ) : null}

          <button className="auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Working...' : actionForMode(mode)}
          </button>
        </form>

        {message === null ? null : <p className="auth-message">{message}</p>}
        {error === null ? null : <p className="auth-error">{error}</p>}

        <nav className="auth-links" aria-label="Authentication links">
          <a href="/login">Sign in</a>
          <a href="/login?mode=register">Create account</a>
          <a href="/login?mode=forgot">Forgot password</a>
          <a href="/reset-password">Reset password</a>
        </nav>
      </section>
    </main>
  );
}

function createBrowserAuthClient(): AuthApi | null {
  const client = createBrowserFloVisApiClient();
  return client instanceof FloVisApiClient ? client : null;
}

function titleForMode(mode: AuthMode): string {
  if (mode === 'register') {
    return 'Create Account';
  }
  if (mode === 'forgot') {
    return 'Forgot Password';
  }
  if (mode === 'reset') {
    return 'Reset Password';
  }
  return 'Sign In';
}

function actionForMode(mode: AuthMode): string {
  if (mode === 'register') {
    return 'Create account';
  }
  if (mode === 'forgot') {
    return 'Send reset instructions';
  }
  if (mode === 'reset') {
    return 'Reset password';
  }
  return 'Sign in';
}
