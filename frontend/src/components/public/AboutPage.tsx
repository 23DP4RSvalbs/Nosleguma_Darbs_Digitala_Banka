import { PublicShell } from './PublicShell';

interface AboutPageProps {
  onBackHome: () => void;
  onContact: () => void;
  onFaq: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
  onCookie: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

export function AboutPage({ onBackHome, onContact, onFaq, onTerms, onPrivacy, onCookie, onLogin, onRegister }: AboutPageProps) {
  return (
    <PublicShell
      activePage="about"
      onHome={onBackHome}
      onAbout={() => undefined}
      onContact={onContact}
      onFaq={onFaq}
      onTerms={onTerms}
      onPrivacy={onPrivacy}
      onCookie={onCookie}
      onLogin={onLogin}
      onRegister={onRegister}
    >
      <section className="space-y-6 rounded-[24px] bg-bank-panel px-6 py-8 sm:px-8 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-bank-muted">Par Astera banku</p>
        <h1 className="max-w-4xl font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Mēs veidojam bankošanu, kas ir ātra, droša un saprotama ikvienam klientam.
        </h1>
        <p className="max-w-3xl text-lg text-bank-muted">
          Astera banka apvieno ikdienas maksājumus, kontu pārvaldību un profesionālu atbalstu vienā viegli lietojamā internetbankā.
        </p>
      </section>

      <section className="grid gap-5 py-12 md:grid-cols-3 md:py-16">
        <article className="space-y-2 rounded-xl bg-bank-panel-soft p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-bank-muted">Drošība</h2>
          <p className="text-bank-muted">Piekļuve internetbankai tiek aizsargāta ar vairāku līmeņu validāciju un nepārtrauktu uzraudzību.</p>
        </article>

        <article className="space-y-2 rounded-xl bg-bank-panel-soft p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-bank-muted">Ērta lietošana</h2>
          <p className="text-bank-muted">No pieteikuma līdz maksājuma apstiprināšanai katrs solis ir skaidrs un intuitīvs.</p>
        </article>

        <article className="space-y-2 rounded-xl bg-bank-panel-soft p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-bank-muted">Personīga pieeja</h2>
          <p className="text-bank-muted">Klientu konsultanti palīdz ikdienas jautājumos un sniedz atbildes saprotamā valodā.</p>
        </article>
      </section>

      <section className="space-y-5 py-10 md:py-12">
        <h2 className="font-display text-3xl font-semibold md:text-4xl">Ko klienti novērtē visvairāk</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <article className="border-l-2 border-bank-accent-strong/60 px-4 py-2">
            <p className="text-sm font-semibold text-bank-cosmic">Skaidri konta pārskati</p>
            <p className="mt-2 text-bank-muted">Pilna darījumu vēsture un konta statusi pieejami bez papildu soļiem.</p>
          </article>
          <article className="border-l-2 border-bank-accent-strong/60 px-4 py-2">
            <p className="text-sm font-semibold text-bank-cosmic">Pārredzami maksājumi</p>
            <p className="mt-2 text-bank-muted">Pirms nosūtīšanas redzama pilna darījuma informācija un komisijas aprēķins.</p>
          </article>
          <article className="border-l-2 border-bank-accent-strong/60 px-4 py-2">
            <p className="text-sm font-semibold text-bank-cosmic">Reāllaika paziņojumi</p>
            <p className="mt-2 text-bank-muted">Mēs informējam par būtiskām konta darbībām un aizdomīgiem mēģinājumiem.</p>
          </article>
          <article className="border-l-2 border-bank-accent-strong/60 px-4 py-2">
            <p className="text-sm font-semibold text-bank-cosmic">Atbalsts cilvēku valodā</p>
            <p className="mt-2 text-bank-muted">Atbalsta komanda palīdz atrisināt jautājumus bez sarežģītiem tehniskiem terminiem.</p>
          </article>
        </div>
      </section>
    </PublicShell>
  );
}
