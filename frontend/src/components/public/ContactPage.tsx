import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Clock3, Mail, PhoneCall } from 'lucide-react';
import { PublicShell } from './PublicShell';

interface ContactPageProps {
  onBackHome: () => void;
  onAbout: () => void;
  onFaq: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
  onCookie: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

interface ContactFormState {
  name: string;
  email: string;
  topic: string;
  message: string;
}

type ContactField = keyof ContactFormState;
type ContactErrors = Partial<Record<ContactField, string>>;

const NAME_REGEX = /^[A-Za-zĀ-ž\s'-]{2,60}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function sanitizeName(value: string): string {
  return value.replace(/[^A-Za-zĀ-ž\s'-]/g, '').slice(0, 60);
}

function sanitizeEmail(value: string): string {
  return value.replace(/[^A-Za-z0-9._%+-@]/g, '').slice(0, 120);
}

function sanitizeMessage(value: string): string {
  return value.replace(/[^A-Za-z0-9Ā-ž.,!?;:'"()\-+/@#%&\s]/g, '').slice(0, 500);
}

function validateForm(form: ContactFormState): ContactErrors {
  const errors: ContactErrors = {};

  if (!NAME_REGEX.test(form.name.trim())) {
    errors.name = 'Ievadi vārdu un uzvārdu (2-60 simboli, tikai burti, atstarpes, apostrofs vai domuzīme).';
  }

  if (!EMAIL_REGEX.test(form.email.trim())) {
    errors.email = 'Ievadi derīgu e-pasta adresi, piemēram, vards@epasts.lv.';
  }

  if (form.message.trim().length < 20) {
    errors.message = 'Ziņai jābūt vismaz 20 simbolu garai.';
  }

  if (form.message.length > 500) {
    errors.message = 'Maksimālais ziņas garums ir 500 simboli.';
  }

  return errors;
}

export function ContactPage({
  onBackHome,
  onAbout,
  onFaq,
  onTerms,
  onPrivacy,
  onCookie,
  onLogin,
  onRegister,
}: ContactPageProps) {
  const [formState, setFormState] = useState<ContactFormState>({
    name: '',
    email: '',
    topic: 'general',
    message: '',
  });
  const [formErrors, setFormErrors] = useState<ContactErrors>({});
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const remainingCharacters = useMemo(() => 500 - formState.message.length, [formState.message]);

  useEffect(() => {
    if (!formNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFormNotice(null);
    }, 4500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [formNotice]);

  function clearFieldError(field: ContactField) {
    setFormErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleNameChange(value: string) {
    setFormState((prev) => ({ ...prev, name: sanitizeName(value) }));
    clearFieldError('name');
    setFormNotice(null);
  }

  function handleEmailChange(value: string) {
    setFormState((prev) => ({ ...prev, email: sanitizeEmail(value) }));
    clearFieldError('email');
    setFormNotice(null);
  }

  function handleMessageChange(value: string) {
    setFormState((prev) => ({ ...prev, message: sanitizeMessage(value) }));
    clearFieldError('message');
    setFormNotice(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateForm(formState);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFormNotice('Pārbaudi ievadītos laukus un izlabo atzīmētās kļūdas.');
      return;
    }

    setFormErrors({});

    setFormNotice('Paldies! Pieprasījums saņemts, ar Tevi sazināsimies tuvākajā darba laikā.');
    setFormState({ name: '', email: '', topic: 'general', message: '' });
  }

  return (
    <PublicShell
      activePage="contact"
      onHome={onBackHome}
      onAbout={onAbout}
      onContact={() => undefined}
      onFaq={onFaq}
      onTerms={onTerms}
      onPrivacy={onPrivacy}
      onCookie={onCookie}
      onLogin={onLogin}
      onRegister={onRegister}
    >
      {formNotice && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[110] w-[min(560px,calc(100vw-1.5rem))] -translate-x-1/2">
          <div
            className={`pointer-events-auto rounded-lg border border-l-4 bg-white px-3 py-2.5 text-sm shadow-[0_12px_32px_rgba(17,34,64,0.14)] ${
              Object.keys(formErrors).length > 0
                ? 'border-red-200 border-l-red-500 text-red-700'
                : 'border-emerald-200 border-l-emerald-500 text-emerald-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <p className="flex-1 leading-relaxed">{formNotice}</p>
              <button
                onClick={() => setFormNotice(null)}
                className="rounded-md px-1.5 py-0.5 text-xs font-semibold text-bank-muted transition hover:bg-black/5 hover:text-bank-ink"
                aria-label="Aizvērt paziņojumu"
              >
                Aizvērt
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-bank-muted">Kontakti</p>
        <h1 className="max-w-3xl font-display text-4xl font-semibold tracking-tight md:text-5xl">Sazinies ar mūsu klientu atbalstu</h1>
        <p className="max-w-3xl text-lg text-bank-muted">
          Atbildēsim uz jautājumiem par kontiem, maksājumiem, drošību un internetbankas lietošanu.
        </p>
      </section>

      <section className="grid gap-6 py-12 md:py-16 lg:grid-cols-[0.98fr_1.02fr] lg:items-start">
        <article className="space-y-5 lg:pr-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-bank-muted">Tiešais kontakts</h2>
          <ul className="mt-4 space-y-3 text-bank-muted">
            <li>Atbalsta e-pasts: atbalsts@asterabanka.lv</li>
            <li>Klientu centrs: +371 20 000 000</li>
            <li>Steidzamiem jautājumiem: +371 67 000 000</li>
          </ul>

          <div className="border-l-2 border-bank-accent-strong/60 pl-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-bank-muted">Darba laiks</h3>
            <p className="mt-3 text-bank-muted">Pirmdiena–Piektdiena: 09:00–18:00 (EET)</p>
            <p className="mt-1 text-bank-muted">Sestdiena: 10:00-15:00 (attālināts atbalsts)</p>
            <p className="mt-1 text-bank-muted">Vidējais atbildes laiks: līdz 1 darba dienai.</p>
          </div>

          <div className="relative h-[220px] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#2b328d] via-[#3562da] to-[#2ec1cf] sm:h-[250px] md:h-[260px] lg:h-[220px] xl:h-[240px]">
            <div className="absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-cyan-200/20" />
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/16" />
            <Mail className="absolute left-6 top-7 h-12 w-12 text-white/90" strokeWidth={1.8} aria-hidden="true" />
            <div className="absolute right-6 top-8 rounded-xl bg-white/18 px-3 py-2 backdrop-blur-sm">
              <PhoneCall className="h-6 w-6 text-white/90" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div className="absolute bottom-6 left-6 rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
              <Clock3 className="h-6 w-6 text-white/90" strokeWidth={1.8} aria-hidden="true" />
            </div>
          </div>
        </article>

        <article className="border-l-2 border-bank-accent-strong/60 pl-5 md:pl-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-bank-muted">Nosūti ziņu</h2>
          <p className="mt-2 text-sm text-bank-muted">
            Aizpildi visus laukus precīzi. Neatbilstoši simboli netiks pieņemti.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3" aria-labelledby="contact-form-heading">
            <h3 id="contact-form-heading" className="sr-only">Kontakta forma</h3>
            <label htmlFor="contact-name" className="block text-sm font-medium">
              Vārds
              <input
                id="contact-name"
                aria-label="Vārds"
                aria-invalid={formErrors.name ? 'true' : 'false'}
                aria-describedby={formErrors.name ? 'contact-name-error' : 'contact-name-help'}
                value={formState.name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Piemērs: Elīna Ozola"
                autoComplete="name"
                required
                maxLength={60}
                className={`mt-1 w-full border bg-bank-panel px-3 py-2 ${
                  formErrors.name ? 'border-red-300' : 'border-bank-border'
                }`}
              />
              <span id="contact-name-help" className="mt-1 block text-xs text-bank-muted">Atļauti tikai burti, atstarpes, apostrofs un domuzīme.</span>
              {formErrors.name ? (
                <p id="contact-name-error" className="mt-1 text-xs text-rose-700">{formErrors.name}</p>
              ) : null}
            </label>

            <label htmlFor="contact-email" className="block text-sm font-medium">
              E-pasts
              <input
                id="contact-email"
                aria-label="E-pasts"
                aria-invalid={formErrors.email ? 'true' : 'false'}
                aria-describedby={formErrors.email ? 'contact-email-error' : undefined}
                type="email"
                value={formState.email}
                onChange={(event) => handleEmailChange(event.target.value)}
                placeholder="Piemērs: vards@epasts.lv"
                autoComplete="email"
                required
                maxLength={120}
                className={`mt-1 w-full border bg-bank-panel px-3 py-2 ${
                  formErrors.email ? 'border-red-300' : 'border-bank-border'
                }`}
              />
              {formErrors.email ? (
                <p id="contact-email-error" className="mt-1 text-xs text-rose-700">{formErrors.email}</p>
              ) : null}
            </label>

            <label htmlFor="contact-topic" className="block text-sm font-medium">
              Tēma
              <select
                id="contact-topic"
                aria-label="Tēma"
                value={formState.topic}
                onChange={(event) => setFormState((prev) => ({ ...prev, topic: event.target.value }))}
                className="mt-1 w-full border border-bank-border bg-bank-panel px-3 py-2"
              >
                <option value="general">Vispārīgs jautājums</option>
                <option value="account">Konta iestatījumi</option>
                <option value="transaction">Transakcijas</option>
                <option value="security">Drošība un piekļuve</option>
              </select>
            </label>

            <label htmlFor="contact-message" className="block text-sm font-medium">
              Ziņa
              <textarea
                id="contact-message"
                aria-label="Ziņa"
                aria-invalid={formErrors.message ? 'true' : 'false'}
                aria-describedby={formErrors.message ? 'contact-message-error' : 'contact-message-help'}
                value={formState.message}
                onChange={(event) => handleMessageChange(event.target.value)}
                placeholder="Piemērs: Vēlos precizēt, kā iestatīt ikdienas maksājumu limitu internetbankā."
                rows={5}
                required
                maxLength={500}
                className={`mt-1 w-full resize-none border bg-bank-panel px-3 py-2 ${
                  formErrors.message ? 'border-red-300' : 'border-bank-border'
                }`}
              />
              <div id="contact-message-help" className="mt-1 flex items-center justify-between text-xs">
                <span className="text-bank-muted">Minimālais garums: 20 simboli. Maksimums: 500.</span>
                <span className={remainingCharacters <= 40 ? 'text-bank-cosmic font-semibold' : 'text-bank-muted'}>
                  Atlikuši {remainingCharacters}
                </span>
              </div>
              {formErrors.message ? (
                <p id="contact-message-error" className="mt-1 text-xs text-rose-700">{formErrors.message}</p>
              ) : null}
            </label>

            <button
              type="submit"
              className="rounded-full border border-bank-cosmic bg-bank-cosmic px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-bank-cosmic-soft"
            >
              Nosūtīt pieprasījumu
            </button>
          </form>

        </article>
      </section>
    </PublicShell>
  );
}
