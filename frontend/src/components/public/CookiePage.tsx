import { PublicShell } from './PublicShell';

interface CookiePageProps {
  onBackHome: () => void;
  onAbout: () => void;
  onContact: () => void;
  onFaq: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

export function CookiePage({
  onBackHome,
  onAbout,
  onContact,
  onFaq,
  onTerms,
  onPrivacy,
  onLogin,
  onRegister,
}: CookiePageProps) {
  return (
    <PublicShell
      activePage="cookie"
      onHome={onBackHome}
      onAbout={onAbout}
      onContact={onContact}
      onFaq={onFaq}
      onTerms={onTerms}
      onPrivacy={onPrivacy}
      onCookie={() => undefined}
      onLogin={onLogin}
      onRegister={onRegister}
    >
      <article className="mx-auto max-w-[860px] border border-slate-300 bg-white px-6 py-8 text-slate-900 sm:px-10 sm:py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Sīkdatņu politika</h1>
        <p className="mt-2 text-sm text-slate-600">Pēdējās izmaiņas: 13.04.2026</p>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold">1. Kas ir sīkdatnes</h2>
          <p>
            Sīkdatnes ir nelieli teksta faili, kas tiek saglabāti lietotāja ierīcē, lai nodrošinātu vietnes darbību,
            drošību un lietošanas ērtumu.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">2. Kādas sīkdatnes mēs izmantojam</h2>
          <p>
            Mēs izmantojam nepieciešamās sīkdatnes (vietnes funkcionalitātei un drošībai), analītiskās sīkdatnes
            (veiktspējas uzlabošanai) un preferences sīkdatnes (lietotāja iestatījumu saglabāšanai).
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">3. Nepieciešamās sīkdatnes</h2>
          <p>
            Nepieciešamās sīkdatnes nodrošina pamatfunkcijas, piemēram, autentifikācijas sesiju uzturēšanu,
            drošības pārbaudes un piekļuvi aizsargātām lapām.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">4. Analītiskās sīkdatnes</h2>
          <p>
            Analītiskās sīkdatnes palīdz saprast, kā lietotāji izmanto vietni, lai mēs varētu uzlabot navigāciju,
            ielādes ātrumu un lietojamību.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">5. Preferences sīkdatnes</h2>
          <p>
            Preferences sīkdatnes atceras lietotāja izvēles, piemēram, valodas vai interfeisa iestatījumus,
            lai nodrošinātu ērtāku pieredzi nākamajās apmeklējuma reizēs.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">6. Sīkdatņu pārvaldība</h2>
          <p>
            Lietotājs var pārvaldīt vai dzēst sīkdatnes pārlūkprogrammas iestatījumos. Dažu sīkdatņu atspējošana var ietekmēt
            vietnes funkcionalitāti.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">7. Izmaiņas politikā</h2>
          <p>
            Mēs varam periodiski atjaunināt šo politiku. Jaunas versijas tiek publicētas šajā lapā.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">8. Saziņa</h2>
          <p>
            Jautājumiem par sīkdatnēm un datu aizsardzību sazinieties ar banku pa e-pastu atbalsts@asterabanka.lv.
          </p>
        </section>
      </article>
    </PublicShell>
  );
}
