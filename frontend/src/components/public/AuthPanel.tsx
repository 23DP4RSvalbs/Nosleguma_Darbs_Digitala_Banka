import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { PERSON_NAME_PATTERN, STRONG_PASSWORD_PATTERN, sanitizePersonName } from '../../lib/validation';

interface LoginFormState {
  email: string;
  password: string;
}

interface RegisterFormState {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

interface AuthPanelProps {
  authMode: 'login' | 'register';
  authLoading: boolean;
  authError: string | null;
  loginData: LoginFormState;
  registerData: RegisterFormState;
  onAuthModeChange: (mode: 'login' | 'register') => void;
  onBackToLanding: () => void;
  onClearError: () => void;
  onLoginDataChange: Dispatch<SetStateAction<LoginFormState>>;
  onRegisterDataChange: Dispatch<SetStateAction<RegisterFormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
}

export function AuthPanel({
  authMode,
  authLoading,
  authError,
  loginData,
  registerData,
  onAuthModeChange,
  onBackToLanding,
  onClearError,
  onLoginDataChange,
  onRegisterDataChange,
  onSubmit,
}: AuthPanelProps) {
  return (
    <div className="min-h-screen bg-bank-base font-body text-bank-ink">
      {authError && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[110] w-[min(560px,calc(100vw-1.5rem))] -translate-x-1/2">
          <div className="pointer-events-auto rounded-lg border border-red-200 border-l-4 border-l-red-500 bg-white px-3 py-2.5 text-sm text-red-700 shadow-[0_12px_32px_rgba(17,34,64,0.14)]">
            <div className="flex items-start gap-3">
              <p className="flex-1 leading-relaxed">{authError}</p>
              <button
                onClick={onClearError}
                className="rounded-md px-1.5 py-0.5 text-xs font-semibold text-bank-muted transition hover:bg-black/5 hover:text-bank-ink"
                aria-label="Aizvērt kļūdu"
              >
                Aizvērt
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[460px] px-6 py-10 md:py-14">
        <button
          onClick={onBackToLanding}
          className="mb-5 rounded-md border border-bank-border bg-bank-panel px-4 py-2 text-sm font-semibold transition-colors hover:bg-bank-panel-soft"
        >
          Atpakaļ uz sākumlapu
        </button>

        <section>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Pieslēdzies Astera bankai</h1>
          <p className="mt-2 text-sm text-bank-muted">Ielogojies vai izveido kontu, lai piekļūtu internetbankai.</p>

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => {
                onAuthModeChange('login');
                onClearError();
              }}
              className={`inline-flex h-10 min-w-[118px] items-center justify-center rounded-md border px-4 text-sm font-semibold transition-colors ${
                authMode === 'login'
                  ? 'border-bank-cosmic bg-bank-cosmic text-white'
                  : 'border-bank-border bg-bank-panel text-bank-ink hover:bg-bank-panel-soft'
              }`}
            >
              Ielogoties
            </button>
            <button
              onClick={() => {
                onAuthModeChange('register');
                onClearError();
              }}
              className={`inline-flex h-10 min-w-[118px] items-center justify-center rounded-md border px-4 text-sm font-semibold transition-colors ${
                authMode === 'register'
                  ? 'border-bank-cosmic bg-bank-cosmic text-white'
                  : 'border-bank-border bg-bank-panel text-bank-ink hover:bg-bank-panel-soft'
              }`}
            >
              Reģistrēties
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {authMode === 'register' ? (
              <>
                <label className="block text-sm font-medium">
                  Vārds un uzvārds
                  <input
                    value={registerData.name}
                    onChange={(event) => onRegisterDataChange((prev) => ({ ...prev, name: sanitizePersonName(event.target.value) }))}
                    required
                    minLength={3}
                    maxLength={20}
                    pattern={PERSON_NAME_PATTERN.source}
                    title="Ievadi divus vārdus, izmantojot tikai burtus un atstarpi. Maksimums 20 simboli."
                    placeholder="Piemēram, Jānis Bērziņš"
                    className="mt-1 w-full rounded-md border border-bank-border bg-bank-panel px-3 py-2 text-bank-ink placeholder:text-bank-muted/85"
                  />
                </label>
                <label className="block text-sm font-medium">
                  E-pasts
                  <input
                    type="email"
                    value={registerData.email}
                    onChange={(event) => onRegisterDataChange((prev) => ({ ...prev, email: event.target.value }))}
                    required
                    maxLength={255}
                    placeholder="piemers@epasts.lv"
                    className="mt-1 w-full rounded-md border border-bank-border bg-bank-panel px-3 py-2 text-bank-ink placeholder:text-bank-muted/85"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Parole
                  <input
                    type="password"
                    value={registerData.password}
                    onChange={(event) => onRegisterDataChange((prev) => ({ ...prev, password: event.target.value.slice(0, 128) }))}
                    required
                    minLength={8}
                    maxLength={128}
                    pattern={STRONG_PASSWORD_PATTERN.source}
                    title="Parolei jābūt vismaz 8 simbolus garai, ar vienu lielo burtu, vienu mazo burtu un vienu ciparu."
                    className="mt-1 w-full rounded-md border border-bank-border bg-bank-panel px-3 py-2 text-bank-ink placeholder:text-bank-muted/85"
                  />
                  <span className="mt-1 block text-xs text-bank-muted">Vismaz 8 simboli, viens lielais burts, viens mazais burts un viens cipars.</span>
                </label>

                <label className="block text-sm font-medium">
                  Paroles apstiprinājums
                  <input
                    type="password"
                    value={registerData.password_confirmation}
                    onChange={(event) =>
                      onRegisterDataChange((prev) => ({ ...prev, password_confirmation: event.target.value.slice(0, 128) }))
                    }
                    required
                    minLength={8}
                    maxLength={128}
                    className="mt-1 w-full rounded-md border border-bank-border bg-bank-panel px-3 py-2 text-bank-ink placeholder:text-bank-muted/85"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block text-sm font-medium">
                  E-pasts
                  <input
                    type="email"
                    value={loginData.email}
                    onChange={(event) => onLoginDataChange((prev) => ({ ...prev, email: event.target.value }))}
                    required
                    maxLength={255}
                    placeholder="piemers@epasts.lv"
                    className="mt-1 w-full rounded-md border border-bank-border bg-bank-panel px-3 py-2 text-bank-ink placeholder:text-bank-muted/85"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Parole
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(event) => onLoginDataChange((prev) => ({ ...prev, password: event.target.value }))}
                    required
                    minLength={8}
                    maxLength={128}
                    className="mt-1 w-full rounded-md border border-bank-border bg-bank-panel px-3 py-2 text-bank-ink placeholder:text-bank-muted/85"
                  />
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-md border border-bank-cosmic bg-bank-cosmic px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-bank-cosmic-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {authLoading ? 'Notiek apstrāde...' : authMode === 'login' ? 'Ielogoties sistēmā' : 'Izveidot kontu'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
