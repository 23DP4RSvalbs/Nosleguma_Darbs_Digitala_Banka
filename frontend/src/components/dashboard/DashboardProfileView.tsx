import { useEffect, useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import asteraLogo from '../../assets/astera-logo.png';
import {
  STRONG_PASSWORD_PATTERN,
  sanitizePersonName,
  sanitizePhone,
  sanitizePlainText,
  sanitizePostalCode,
} from '../../lib/validation';

interface ProfileFormState {
  name: string;
  email: string;
  preferred_currency: string;
  locale: 'lv' | 'en' | 'sv';
  timezone: string;
  date_format: 'dd.mm.yyyy' | 'yyyy-mm-dd' | 'mm/dd/yyyy';
  amount_format: 'local' | 'international';
  address: string;
  phone: string;
  region: string;
  country: string;
  postal_code: string;
  phone_country: string;
  theme_mode: 'light' | 'dark';
  email_notifications: boolean;
  push_notifications: boolean;
  marketing_notifications: boolean;
  compact_mode: boolean;
  default_dashboard_view: 'overview' | 'accounts' | 'transactions';
  mask_balances: boolean;
  require_payment_confirmation: boolean;
}

interface PasswordFormState {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

interface DashboardProfileViewProps {
  profileForm: ProfileFormState;
  profilePicture: string | null;
  setProfileForm: Dispatch<SetStateAction<ProfileFormState>>;
  profileSaving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onProfilePictureUpload: (file: File) => Promise<void>;
  profilePictureUploading: boolean;

  passwordForm: PasswordFormState;
  setPasswordForm: Dispatch<SetStateAction<PasswordFormState>>;
  passwordSaving: boolean;
  onPasswordSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

const currencyOptions = [
  { value: 'EUR', label: 'EUR - eiro' },
  { value: 'USD', label: 'USD - ASV dolārs' },
  { value: 'GBP', label: 'GBP - Lielbritānijas mārciņa' },
  { value: 'SEK', label: 'SEK - Zviedrijas krona' },
  { value: 'NOK', label: 'NOK - Norvēģijas krona' },
];

const themeOptions: Array<{ value: ProfileFormState['theme_mode']; label: string }> = [
  { value: 'light', label: 'Gaišais režīms' },
  { value: 'dark', label: 'Tumšais režīms' },
];

const timezoneOptions = [
  { value: 'Europe/Riga', label: 'Eiropa/Rīga (EET)' },
  { value: 'Europe/Stockholm', label: 'Eiropa/Stokholma (CET)' },
  { value: 'Europe/London', label: 'Eiropa/Londona (GMT/BST)' },
  { value: 'UTC', label: 'UTC' },
];

const amountFormatOptions: Array<{ value: ProfileFormState['amount_format']; label: string }> = [
  { value: 'local', label: 'Lokālais (piem., 1 234,56)' },
  { value: 'international', label: 'Starptautisks (piem., 1,234.56)' },
];

const phoneCountryOptions = [
  { value: '+371', label: '+371' },
  { value: '+372', label: '+372' },
  { value: '+370', label: '+370' },
  { value: '+46', label: '+46' },
  { value: '+44', label: '+44' },
];

const countryOptions = [
  { value: 'LV', label: 'Latvija' },
  { value: 'EE', label: 'Igaunija' },
  { value: 'LT', label: 'Lietuva' },
  { value: 'SE', label: 'Zviedrija' },
  { value: 'GB', label: 'Lielbritānija' },
];

export function DashboardProfileView({
  profileForm,
  profilePicture,
  setProfileForm,
  profileSaving,
  onSubmit,
  onProfilePictureUpload,
  profilePictureUploading,
  passwordForm,
  setPasswordForm,
  passwordSaving,
  onPasswordSubmit,
}: DashboardProfileViewProps) {
  const [failedProfilePicture, setFailedProfilePicture] = useState<string | null>(null);
  const [localProfilePreview, setLocalProfilePreview] = useState<string | null>(null);
  const displayPicture = localProfilePreview ?? profilePicture;

  useEffect(() => {
    if (profilePicture && localProfilePreview) {
      const previewUrl = localProfilePreview;
      window.setTimeout(() => {
        setLocalProfilePreview((current) => (current === previewUrl ? null : current));
        URL.revokeObjectURL(previewUrl);
      }, 1200);
    }
  }, [localProfilePreview, profilePicture]);

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
      <article className="rounded-xl border border-bank-border bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-bank-muted">Profils un lietotnes preferences</h3>

        <div className="mb-5 grid gap-3 rounded-xl bg-bank-panel-soft/45 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <span className="inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-bank-panel text-xl font-semibold text-bank-cosmic">
            {displayPicture && failedProfilePicture !== displayPicture ? (
              <img
                src={displayPicture}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setFailedProfilePicture(displayPicture)}
              />
            ) : (
              <img src={asteraLogo} alt="" className="h-full w-full object-cover" />
            )}
          </span>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-bank-muted">Profila attēls</p>
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-bank-border bg-white px-3 py-2 text-sm font-semibold text-bank-ink transition hover:bg-bank-panel-soft">
              {profilePictureUploading ? 'Augšuplādē...' : 'Augšupielādēt jaunu foto'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={profilePictureUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }

                  setLocalProfilePreview(URL.createObjectURL(file));
                  void onProfilePictureUpload(file);
                  event.currentTarget.value = '';
                }}
              />
            </label>
            <p className="text-xs text-bank-muted">Atbalstītie formāti: JPG, PNG, WebP. Maksimālais izmērs: 2MB.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-bank-muted">
              Vārds un uzvārds
              <input
                required
                maxLength={20}
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    name: sanitizePersonName(event.target.value),
                  }))
                }
                placeholder="Piemēram, Janis Berzins"
                className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wider text-bank-muted">
              E-pasts
              <input
                readOnly
                tabIndex={-1}
                value={profileForm.email}
                title={profileForm.email}
                className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm text-bank-ink"
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wider text-bank-muted">
              Primārā valūta
              <select
                value={profileForm.preferred_currency}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    preferred_currency: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
              >
                {currencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wider text-bank-muted">
              Izskata režīms
              <select
                value={profileForm.theme_mode}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    theme_mode: event.target.value as ProfileFormState['theme_mode'],
                  }))
                }
                className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
              >
                {themeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wider text-bank-muted">
              Laika zona
              <select
                value={profileForm.timezone}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    timezone: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
              >
                {timezoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wider text-bank-muted">
              Summu attēlojums
              <select
                value={profileForm.amount_format}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    amount_format: event.target.value as ProfileFormState['amount_format'],
                  }))
                }
                className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
              >
                {amountFormatOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

          </div>

          <div className="grid gap-3 border-t border-bank-border pt-4 md:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-bank-muted md:col-span-2">
              Adrese
              <input
                maxLength={120}
                value={profileForm.address}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, address: sanitizePlainText(event.target.value, 120) }))}
                className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wider text-bank-muted">
              Tālrunis
              <div className="mt-1 grid grid-cols-[minmax(104px,120px)_minmax(0,1fr)] gap-2">
                <select
                  value={profileForm.phone_country}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, phone_country: event.target.value }))}
                  className="w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 pr-8 text-sm"
                >
                  {phoneCountryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  maxLength={24}
                  value={profileForm.phone}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: sanitizePhone(event.target.value) }))}
                  className="w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
                />
              </div>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wider text-bank-muted">
              Reģions
              <input
                maxLength={80}
                value={profileForm.region}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, region: sanitizePlainText(event.target.value, 80) }))}
                className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wider text-bank-muted">
              Valsts
              <select
                value={profileForm.country}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, country: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
              >
                {countryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wider text-bank-muted">
              Pasta indekss
              <input
                maxLength={20}
                value={profileForm.postal_code}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, postal_code: sanitizePostalCode(event.target.value) }))}
                className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={profileSaving}
            className="inline-flex items-center justify-center rounded-xl bg-bank-cosmic px-4 py-2 text-sm font-semibold text-white transition hover:bg-bank-cosmic-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {profileSaving ? 'Saglabā...' : 'Saglabāt iestatījumus'}
          </button>
        </form>
      </article>

      <article className="rounded-xl border border-bank-border bg-white p-5 xl:sticky xl:top-24">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-bank-muted">Drošība</h3>

        <div className="mb-4 rounded-xl bg-bank-panel-soft p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-bank-muted">Drošības ieteikumi</p>
          <ul className="mt-2 space-y-1 text-sm text-bank-muted">
            <li>Parolei jābūt vismaz 8 simbolus garai.</li>
            <li>Jāiekļauj viens lielais burts, viens mazais burts un viens cipars.</li>
            <li>Paroles maiņai nepieciešama esošā parole.</li>
          </ul>
        </div>

        <form onSubmit={onPasswordSubmit} className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-bank-muted">
            Esošā parole
            <input
              required
              type="password"
              minLength={8}
              maxLength={128}
              value={passwordForm.current_password}
              onChange={(event) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  current_password: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider text-bank-muted">
            Jaunā parole
            <input
              required
              type="password"
              minLength={8}
              maxLength={128}
              pattern={STRONG_PASSWORD_PATTERN.source}
              title="Parolei jābūt vismaz 8 simbolus garai, ar vienu lielo burtu, vienu mazo burtu un vienu ciparu."
              value={passwordForm.new_password}
              onChange={(event) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  new_password: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider text-bank-muted">
            Jaunā parole atkārtoti
            <input
              required
              type="password"
              minLength={8}
              maxLength={128}
              pattern={STRONG_PASSWORD_PATTERN.source}
              title="Parolei jābūt vismaz 8 simbolus garai, ar vienu lielo burtu, vienu mazo burtu un vienu ciparu."
              value={passwordForm.new_password_confirmation}
              onChange={(event) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  new_password_confirmation: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={passwordSaving}
            className="inline-flex items-center justify-center rounded-xl bg-bank-cosmic px-4 py-2 text-sm font-semibold text-white transition hover:bg-bank-cosmic-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {passwordSaving ? 'Maina...' : 'Mainīt paroli'}
          </button>
        </form>
      </article>
    </section>
  );
}
