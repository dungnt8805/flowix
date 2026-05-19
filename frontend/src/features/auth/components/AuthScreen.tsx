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
    <main className="min-h-screen bg-[var(--color-bg-app)] px-6 py-8 text-[var(--color-text-primary)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-6 lg:flex-row">
        <section className="flex min-w-0 flex-1 flex-col justify-between rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] lg:p-12">
          <div className="space-y-10">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[var(--color-accent-soft)] text-xl font-semibold text-[var(--color-accent)]">
                F
              </div>
              <div>
                <h1 className="text-[32px] font-semibold leading-none">Flo Vis</h1>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Diagram. Collaborate. Ship faster.</p>
              </div>
            </div>

            <div className="max-w-md space-y-4">
              <p className="text-2xl font-semibold leading-8 text-[var(--color-text-primary)]">
                {heroTitleForMode(mode)}
              </p>
              <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                {heroCopyForMode(mode)}
              </p>
            </div>

            <div className="grid gap-3 text-sm text-[var(--color-text-secondary)]">
              <FeaturePoint label="Real-time diagram editing" />
              <FeaturePoint label="Version history and restore" />
              <FeaturePoint label="Share and collaborate" />
              <FeaturePoint label="Export to multiple formats" />
            </div>
          </div>

          <div className="mt-10 text-xs text-[var(--color-text-tertiary)]">2026 Flo Vis. All rights reserved.</div>
        </section>

        <section
          className="w-full rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8 lg:max-w-[30rem]"
          aria-labelledby="auth-title"
        >
          <div className="mb-8">
            <div className="mb-3 inline-flex rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
              {eyebrowForMode(mode)}
            </div>
            <h2 id="auth-title" className="text-[28px] font-semibold leading-8 text-[var(--color-text-primary)]">
              {titleForMode(mode)}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{subtitleForMode(mode)}</p>
          </div>

          {message !== null ? (
            <div className="mb-6 rounded-[8px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          {error !== null ? (
            <div className="mb-6 rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
            {mode !== 'reset' ? (
              <Field label="Email" error={errors.email?.message}>
                <input
                  autoComplete="email"
                  type="email"
                  placeholder="you@example.com"
                  className={inputClassName(errors.email !== undefined)}
                  {...register('email', {
                    required: 'Email address is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email address'
                    }
                  })}
                />
              </Field>
            ) : null}

            {mode === 'register' ? (
              <Field label="Display name" error={errors.displayName?.message}>
                <input
                  autoComplete="name"
                  type="text"
                  placeholder="John Doe"
                  className={inputClassName(errors.displayName !== undefined)}
                  {...register('displayName', {
                    required: 'Display name is required'
                  })}
                />
              </Field>
            ) : null}

            {mode === 'reset' ? (
              <Field label="Reset token" error={errors.token?.message}>
                <input
                  autoComplete="one-time-code"
                  type="text"
                  placeholder="Enter reset token"
                  className={inputClassName(errors.token !== undefined)}
                  {...register('token', {
                    required: 'Reset token is required'
                  })}
                />
              </Field>
            ) : null}

            {mode !== 'forgot' ? (
              <Field label="Password" error={errors.password?.message}>
                <input
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  type="password"
                  placeholder="••••••••••••"
                  className={inputClassName(errors.password !== undefined)}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 12,
                      message: 'Password must be at least 12 characters'
                    }
                  })}
                />
              </Field>
            ) : null}

            {mode === 'login' ? (
              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-[var(--color-accent)]" />
                  <span>Remember me</span>
                </label>
                <a href="/login?mode=forgot" className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
                  Forgot password?
                </a>
              </div>
            ) : null}

            <button
              className="flex h-11 w-full items-center justify-center rounded-[8px] bg-[var(--color-accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Processing...' : actionForMode(mode)}
            </button>
          </form>

          <nav className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--color-border-subtle)] pt-6 text-sm text-[var(--color-text-secondary)]" aria-label="Authentication links">
            {mode !== 'login' ? (
              <a href="/login" className="font-medium hover:text-[var(--color-accent-hover)]">
                Sign in
              </a>
            ) : null}
            {mode !== 'register' ? (
              <a href="/login?mode=register" className="font-medium hover:text-[var(--color-accent-hover)]">
                Create account
              </a>
            ) : null}
            {mode !== 'forgot' ? (
              <a href="/login?mode=forgot" className="font-medium hover:text-[var(--color-accent-hover)]">
                Forgot password
              </a>
            ) : null}
            {mode !== 'reset' ? (
              <a href="/reset-password" className="font-medium hover:text-[var(--color-accent-hover)]">
                Reset password
              </a>
            ) : null}
          </nav>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  error,
  children
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium uppercase text-[var(--color-text-secondary)]">{label}</label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function FeaturePoint({ label }: { label: string }): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[11px] font-semibold text-[var(--color-accent)]">
        +
      </span>
      <span>{label}</span>
    </div>
  );
}

function inputClassName(hasError: boolean): string {
  return [
    'h-11 w-full rounded-[8px] border bg-[var(--color-bg-panel-alt)] px-3.5 text-sm text-[var(--color-text-primary)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] transition placeholder:text-[var(--color-text-muted)]',
    hasError
      ? 'border-rose-300 focus:border-rose-400 focus:outline-none'
      : 'border-[var(--color-border-default)] focus:border-[var(--color-accent)] focus:outline-none'
  ].join(' ');
}

function createBrowserAuthClient(): AuthApi | null {
  const client = createBrowserFloVisApiClient();
  return client instanceof FloVisApiClient ? client : null;
}

function titleForMode(mode: AuthMode): string {
  if (mode === 'register') {
    return 'Create account';
  }
  if (mode === 'forgot') {
    return 'Forgot password';
  }
  if (mode === 'reset') {
    return 'Reset your password';
  }
  return 'Sign in';
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

function subtitleForMode(mode: AuthMode): string {
  if (mode === 'register') {
    return 'Join your workspace and start diagramming.';
  }
  if (mode === 'forgot') {
    return 'Enter your email and we will send a reset path.';
  }
  if (mode === 'reset') {
    return 'Choose a new password for your account.';
  }
  return 'Sign in to continue to your workspace.';
}

function eyebrowForMode(mode: AuthMode): string {
  if (mode === 'register') {
    return 'Account setup';
  }
  if (mode === 'forgot') {
    return 'Recovery';
  }
  if (mode === 'reset') {
    return 'Security';
  }
  return 'Workspace access';
}

function heroTitleForMode(mode: AuthMode): string {
  if (mode === 'register') {
    return 'Set up your team workspace in the same editor environment.';
  }
  if (mode === 'forgot') {
    return 'Recover access without leaving the product workflow behind.';
  }
  if (mode === 'reset') {
    return 'Reset credentials and get back to the diagram workbench.';
  }
  return 'A cleaner editor flow for diagram authors and reviewers.';
}

function heroCopyForMode(mode: AuthMode): string {
  if (mode === 'register') {
    return 'The light theme keeps authentication inside the same product language as editing, sharing, and review.';
  }
  if (mode === 'forgot') {
    return 'No extra marketing shell, no detached auth theme. Just the same product system from entry to editor.';
  }
  if (mode === 'reset') {
    return 'Security and account recovery follow the same spacing, color, and control system as the main workspace.';
  }
  return 'Sign in through a compact light-theme surface aligned with the main Flo Vis editor, shared view, and governance screens.';
}
