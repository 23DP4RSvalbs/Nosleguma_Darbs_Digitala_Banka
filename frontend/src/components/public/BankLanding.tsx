import { useEffect, useState } from 'react';
import companyImage from '../../assets/compan.jpg';
import familyImage from '../../assets/family.webp';
import personalImage from '../../assets/perso.jpg';
import { PublicShell } from './PublicShell';

interface BankLandingProps {
  onLogin: () => void;
  onRegister: () => void;
  onAbout: () => void;
  onContact: () => void;
  onFaq: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
  onCookie: () => void;
}

type LiveCounters = {
  transactions: number;
  riskChecks: number;
  activeClients: number;
  securityAlerts: number;
};

const COUNTERS_STORAGE_KEY = 'astera-live-counters-v2';

const DEFAULT_COUNTERS: LiveCounters = {
  transactions: 58_240,
  riskChecks: 9_180,
  activeClients: 3_260,
  securityAlerts: 42,
};

function loadStoredCounters(): LiveCounters {
  if (typeof window === 'undefined') {
    return DEFAULT_COUNTERS;
  }

  try {
    const raw = window.localStorage.getItem(COUNTERS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_COUNTERS;
    }

    const parsed = JSON.parse(raw) as Partial<LiveCounters>;

    if (
      typeof parsed.transactions !== 'number' ||
      typeof parsed.riskChecks !== 'number' ||
      typeof parsed.activeClients !== 'number' ||
      typeof parsed.securityAlerts !== 'number'
    ) {
      return DEFAULT_COUNTERS;
    }

    return {
      transactions: parsed.transactions,
      riskChecks: parsed.riskChecks,
      activeClients: parsed.activeClients,
      securityAlerts: parsed.securityAlerts,
    };
  } catch {
    return DEFAULT_COUNTERS;
  }
}

function formatCounter(value: number): string {
  return new Intl.NumberFormat('lv-LV').format(value);
}

const MAX_COUNTER_DISPLAY_LENGTH = 9;

function formatCounterDisplay(value: number): string {
  const formatted = formatCounter(value);

  if (formatted.length <= MAX_COUNTER_DISPLAY_LENGTH) {
    return formatted;
  }

  return `${formatted.slice(0, MAX_COUNTER_DISPLAY_LENGTH)}...`;
}

function positiveJitter(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type ServiceCard = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
};

const serviceCards: ServiceCard[] = [
  {
    title: 'Ikdienas konts',
    description: 'Vienā skatā redzami ienākošie un izejošie maksājumi, kartes limiti un konta atlikums.',
    image: personalImage,
    imageAlt: 'Personīgā internetbankas vide ikdienas kontam',
  },
  {
    title: 'Ātri pārskaitījumi',
    description: 'Pirms nosūtīšanas skaidri redzama summa, komisija un kopējais debets bez slēptām izmaksām.',
    image: companyImage,
    imageAlt: 'Digitāls pārskaitījumu process uzņēmuma vajadzībām',
  },
  {
    title: 'Atbalsts vienmēr blakus',
    description: 'Klientu atbalsts palīdzēs gan ikdienas jautājumos, gan sarežģītākos konta pieprasījumos.',
    image: familyImage,
    imageAlt: 'Klientu atbalsts ģimenes finanšu plānošanai',
  },
];

const trustRows = [
  'Maksājumu apstiprinājumi notiek ar vairāku līmeņu drošības pārbaudi.',
  'Jebkura būtiska konta izmaiņa tiek apstiprināta un reģistrēta drošības žurnālā.',
  'Klients vienmēr redz pilnu darījuma informāciju pirms apstiprināšanas.',
  'Sistēma automātiski bloķē riskantas darbības un brīdina par neatbilstībām.',
];

const onboardingSteps = [
  { title: 'Reģistrējies', description: 'Aizpildi pieteikumu un apstiprini kontaktinformāciju.' },
  { title: 'Aktivizē kontu', description: 'Izvēlies konta tipu un saņem piekļuvi internetbankai.' },
  { title: 'Pārvaldi līdzekļus', description: 'Veic pārskaitījumus un seko maksājumu statusam reāllaikā.' },
  { title: 'Saņem atbalstu', description: 'Jebkurā brīdī raksti konsultantam vai izmanto FAQ centru.' },
];

export function BankLanding({ onLogin, onRegister, onAbout, onContact, onFaq, onTerms, onPrivacy, onCookie }: BankLandingProps) {
  const [liveCounters, setLiveCounters] = useState<LiveCounters>(() => loadStoredCounters());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setLiveCounters((prev) => ({
        transactions: prev.transactions + positiveJitter(1, 4),
        riskChecks: prev.riskChecks + positiveJitter(1, 2),
        activeClients: prev.activeClients + positiveJitter(0, 1),
        securityAlerts: prev.securityAlerts + positiveJitter(0, 1),
      }));
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(COUNTERS_STORAGE_KEY, JSON.stringify(liveCounters));
  }, [liveCounters]);

  return (
    <PublicShell
      activePage="home"
      onHome={() => undefined}
      onAbout={onAbout}
      onContact={onContact}
      onFaq={onFaq}
      onTerms={onTerms}
      onPrivacy={onPrivacy}
      onCookie={onCookie}
      onLogin={onLogin}
      onRegister={onRegister}
    >
      <section className="relative overflow-hidden rounded-2xl border border-[#97b9ff] bg-[linear-gradient(126deg,#1c2f87_0%,#433fbe_30%,#1478c7_56%,#0f9db9_76%,#6b3ed4_100%)] px-5 py-5 text-white sm:px-7 sm:py-6 md:px-8 md:py-7">
        <div className="pointer-events-none absolute -right-28 -top-20 h-72 w-72 bg-[radial-gradient(circle,rgba(255,255,255,0.34),rgba(255,255,255,0)_70%)]" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 bg-[radial-gradient(circle,rgba(89,252,255,0.34),rgba(89,252,255,0)_72%)]" />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(350px,410px)] lg:items-center xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-4 lg:pr-4">
            <h1 className="max-w-[42rem] font-display text-[clamp(1.78rem,4.3vw,3.16rem)] font-semibold leading-tight tracking-tight">
              Viss Tavai ikdienas bankošanai vienā drošā platformā.
            </h1>
            <p className="max-w-[40rem] text-[clamp(1rem,1.95vw,1.2rem)] text-white/88">
              Pārskati kontus, veic pārskaitījumus un seko darbībām reāllaikā. Viss pielāgots datoram, planšetei un telefonam.
            </p>
          </div>

          <aside className="mt-1 w-full lg:mt-0 lg:justify-self-end lg:w-full lg:max-w-[420px]">
            <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-white/90">Platformas rādītāji</h2>
            <p className="mt-2 text-sm text-white/80">Aktuāls dienas pārskats par sistēmas aktivitāti.</p>

            <div className="mt-4 grid gap-2">
              <article className="grid grid-cols-[minmax(0,1fr)_minmax(132px,170px)] items-center gap-3 rounded-lg border border-white/25 bg-white/10 px-3 py-2.5 backdrop-blur-[1px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/78">Transakcijas</p>
                <p
                  className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-right font-display text-[clamp(1.55rem,3.4vw,2.2rem)] leading-none tabular-nums"
                  title={formatCounter(liveCounters.transactions)}
                >
                  {formatCounterDisplay(liveCounters.transactions)}
                </p>
              </article>
              <article className="grid grid-cols-[minmax(0,1fr)_minmax(132px,170px)] items-center gap-3 rounded-lg border border-white/25 bg-white/10 px-3 py-2.5 backdrop-blur-[1px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/78">Riska pārbaudes</p>
                <p
                  className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-right font-display text-[clamp(1.55rem,3.4vw,2.2rem)] leading-none tabular-nums"
                  title={formatCounter(liveCounters.riskChecks)}
                >
                  {formatCounterDisplay(liveCounters.riskChecks)}
                </p>
              </article>
              <article className="grid grid-cols-[minmax(0,1fr)_minmax(132px,170px)] items-center gap-3 rounded-lg border border-white/25 bg-white/10 px-3 py-2.5 backdrop-blur-[1px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/78">Aktīvie klienti</p>
                <p
                  className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-right font-display text-[clamp(1.55rem,3.4vw,2.2rem)] leading-none tabular-nums"
                  title={formatCounter(liveCounters.activeClients)}
                >
                  {formatCounterDisplay(liveCounters.activeClients)}
                </p>
              </article>
              <article className="grid grid-cols-[minmax(0,1fr)_minmax(132px,170px)] items-center gap-3 rounded-lg border border-white/25 bg-white/10 px-3 py-2.5 backdrop-blur-[1px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/78">Drošības brīdinājumi</p>
                <p
                  className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-right font-display text-[clamp(1.55rem,3.4vw,2.2rem)] leading-none tabular-nums"
                  title={formatCounter(liveCounters.securityAlerts)}
                >
                  {formatCounterDisplay(liveCounters.securityAlerts)}
                </p>
              </article>
            </div>

            <p className="mt-3 text-xs text-white/70">Rādītāji tiek atjaunoti automātiski visas dienas garumā.</p>
          </aside>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="rounded-2xl border border-bank-border/70 bg-bank-panel-soft/55 p-5 sm:p-6 md:p-7">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-bank-muted">Galvenie pakalpojumi</p>
            <h2 className="font-display text-[clamp(1.85rem,4.4vw,2.95rem)] font-semibold leading-tight tracking-tight text-balance">Pakalpojumi ikdienas bankošanai</h2>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {serviceCards.map((row, index) => {
              const layoutClass = index === 2 ? 'md:col-span-2 xl:col-span-1' : '';

              return (
                <article key={row.title} className={`overflow-hidden rounded-lg border border-bank-border/70 bg-bank-panel ${layoutClass}`}>
                  <img
                    src={row.image}
                    alt={row.imageAlt}
                    className="h-40 w-full object-cover sm:h-44 md:h-40 xl:h-44"
                    loading="lazy"
                  />
                  <div className="p-5">
                    <h3 className="text-xl font-semibold">{row.title}</h3>
                    <p className="mt-3 text-bank-muted">{row.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
          <article className="h-full rounded-2xl border border-bank-border bg-bank-panel p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-bank-muted">Drošība un Pārliecība</p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
              Aizsardzība katrai darbībai internetbankā
            </h2>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {trustRows.map((item) => (
                <li key={item} className="rounded-lg border border-bank-border/80 bg-bank-panel-soft p-4 text-sm text-bank-muted">
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="h-full rounded-2xl border border-bank-border bg-bank-panel-soft p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-bank-muted">Kāpēc tas ir svarīgi</p>
            <h3 className="mt-3 font-display text-2xl font-semibold leading-tight sm:text-3xl">Vienkārša lietošana ar stingru kontroli</h3>
            <p className="mt-5 text-bank-muted">
              Katram maksājumam tiek pārbaudīts gan lietotāja konteksts, gan darījuma uzvedība. Tas palīdz agri pamanīt risku,
              vienlaikus saglabājot vienkāršu lietošanas pieredzi klientam.
            </p>
            <p className="mt-4 text-bank-muted">Tu vienmēr redzi summu, komisiju un statusu vienā vietā, tāpēc nav pārsteigumu pēc apstiprināšanas.</p>

            <div className="mt-6 rounded-xl border border-bank-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-bank-muted">Reāllaika kontrole</p>
              <p className="mt-2 text-sm text-bank-muted">Sistēma automātiski brīdina par aizdomīgām darbībām un palīdz pieņemt drošāku lēmumu pirms apstiprināšanas.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="space-y-6 py-16 md:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-bank-muted">Kā sākt</p>
          <h2 className="mt-3 font-display text-4xl font-semibold md:text-5xl">Ceļš līdz pirmajam veiksmīgajam maksājumam</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {onboardingSteps.map((step, index) => (
            <article key={step.title} className="border-l-2 border-bank-accent-strong/60 px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-bank-muted">Solis {index + 1}</p>
              <h3 className="mt-2 text-lg font-semibold text-bank-cosmic">{step.title}</h3>
              <p className="mt-2 text-sm text-bank-muted">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-l-2 border-bank-accent-strong/60 py-6 pl-4 md:pl-5">
        <p className="text-sm text-bank-muted">
          Jautājumi par pakalpojumiem? Atver sadaļu Kontakti vai FAQ no galvenes pogām un saņem nepieciešamo informāciju.
        </p>
      </section>
    </PublicShell>
  );
}
