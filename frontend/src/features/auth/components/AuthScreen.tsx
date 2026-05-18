'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
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

interface FormValues {
  email: string;
  password: string;
  displayName: string;
  token: string;
}

export function AuthScreen({ mode, apiClient }: AuthScreenProps): React.ReactElement {
  const client = useMemo<AuthApi | null>(() => apiClient ?? createBrowserAuthClient(), [apiClient]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    defaultValues: {
      email: '',
      password: '',
      displayName: '',
      token: ''
    }
  });

  async function onSubmit(data: FormValues): Promise<void> {
    if (client === null) {
      setError('Authentication API is not configured.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'login') {
        await client.login({ email: data.email, password: data.password } satisfies LoginPayload);
        window.location.href = '/';
      } else if (mode === 'register') {
        await client.register({
          email: data.email,
          password: data.password,
          displayName: data.displayName || undefined
        } satisfies RegisterPayload);
        window.location.href = '/';
      } else if (mode === 'forgot') {
        const response = await client.forgotPassword(data.email);
        setMessage(
          response.resetToken === undefined
            ? 'If the account exists, reset instructions have been sent.'
            : `Reset token: ${response.resetToken}`
        );
      } else {
        await client.resetPassword({ token: data.token, password: data.password });
        setMessage('Password reset. You can sign in with the new password.');
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic glow auras */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <section
        className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-2xl rounded-2xl p-8 max-w-md w-full relative z-10"
        aria-labelledby="auth-title"
      >
        <div className="flex items-center gap-4 mb-8">
          <span className="bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-extrabold text-xl w-11 h-11 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            FV
          </span>
          <div>
            <h1 id="auth-title" className="text-2xl font-bold text-white tracking-tight">
              {titleForMode(mode)}
            </h1>
            <p className="text-xs text-slate-400 font-medium">Flo Vis workspace authentication</p>
          </div>
        </div>

        {message !== null && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-3 rounded-lg text-sm mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{message}</span>
          </div>
        )}

        {error !== null && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-lg text-sm mb-6 flex items-start gap-2">
            <svg className="w-5 h-5 shrink-0 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-5" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
          {mode !== 'reset' && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                Email
              </label>
              <input
                autoComplete="email"
                type="email"
                placeholder="you@example.com"
                className={`w-full bg-slate-950/60 border rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition duration-200 ${
                  errors.email
                    ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
                {...register('email', {
                  required: 'Email address is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address'
                  }
                })}
              />
              {errors.email && (
                <span className="text-red-400 text-xs mt-1.5 font-medium block">
                  {errors.email.message}
                </span>
              )}
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                Display name
              </label>
              <input
                autoComplete="name"
                type="text"
                placeholder="John Doe"
                className={`w-full bg-slate-950/60 border rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition duration-200 ${
                  errors.displayName
                    ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
                {...register('displayName', {
                  required: 'Display name is required'
                })}
              />
              {errors.displayName && (
                <span className="text-red-400 text-xs mt-1.5 font-medium block">
                  {errors.displayName.message}
                </span>
              )}
            </div>
          )}

          {mode === 'reset' && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                Reset token
              </label>
              <input
                autoComplete="one-time-code"
                type="text"
                placeholder="Enter reset token"
                className={`w-full bg-slate-950/60 border rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition duration-200 ${
                  errors.token
                    ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
                {...register('token', {
                  required: 'Reset token is required'
                })}
              />
              {errors.token && (
                <span className="text-red-400 text-xs mt-1.5 font-medium block">
                  {errors.token.message}
                </span>
              )}
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                Password
              </label>
              <input
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                type="password"
                placeholder="••••••••••••"
                className={`w-full bg-slate-950/60 border rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition duration-200 ${
                  errors.password
                    ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 12,
                    message: 'Password must be at least 12 characters'
                  }
                })}
              />
              {errors.password && (
                <span className="text-red-400 text-xs mt-1.5 font-medium block">
                  {errors.password.message}
                </span>
              )}
            </div>
          )}

          <button
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-2.5 rounded-lg shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none mt-6 flex items-center justify-center gap-2"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              actionForMode(mode)
            )}
          </button>
        </form>

        <nav
          className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs text-slate-400 border-t border-slate-800/80 pt-6 mt-6 font-medium"
          aria-label="Authentication links"
        >
          {mode !== 'login' && (
            <a href="/login" className="hover:text-indigo-400 transition-colors">
              Sign in
            </a>
          )}
          {mode !== 'register' && (
            <a href="/login?mode=register" className="hover:text-indigo-400 transition-colors">
              Create account
            </a>
          )}
          {mode !== 'forgot' && (
            <a href="/login?mode=forgot" className="hover:text-indigo-400 transition-colors">
              Forgot password
            </a>
          )}
          {mode !== 'reset' && (
            <a href="/reset-password" className="hover:text-indigo-400 transition-colors">
              Reset password
            </a>
          )}
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
