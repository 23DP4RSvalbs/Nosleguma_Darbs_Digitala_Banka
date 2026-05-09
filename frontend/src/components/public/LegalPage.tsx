import { PublicShell } from './PublicShell';

interface LegalPageProps {
  onBackHome: () => void;
  onAbout: () => void;
  onContact: () => void;
  onFaq: () => void;
  onPrivacy: () => void;
  onCookie: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

export function LegalPage({ onBackHome, onAbout, onContact, onFaq, onPrivacy, onCookie, onLogin, onRegister }: LegalPageProps) {
  return (
    <PublicShell
      activePage="terms"
      onHome={onBackHome}
      onAbout={onAbout}
      onContact={onContact}
      onFaq={onFaq}
      onTerms={() => undefined}
      onPrivacy={onPrivacy}
      onCookie={onCookie}
      onLogin={onLogin}
      onRegister={onRegister}
    >
      <article className="mx-auto max-w-[860px] border border-slate-300 bg-white px-6 py-8 text-slate-900 sm:px-10 sm:py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Lietošanas noteikumi</h1>
        <p className="mt-2 text-sm text-slate-600">Pēdējās izmaiņas: 13.04.2026</p>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold">1. Vispārīgie noteikumi</h2>
          <p>
            Šie lietošanas noteikumi nosaka kārtību, kādā klients izmanto Astera bankas internetbanku un saistītos digitālos
            pakalpojumus. Izmantojot internetbanku, klients apliecina, ka ir iepazinies ar noteikumiem un piekrīt tiem.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">2. Konta atvēršana un piekļuve</h2>
          <p>
            Klientam ir pienākums sniegt patiesu, pilnīgu un aktuālu informāciju konta atvēršanas brīdī, kā arī nekavējoties
            paziņot bankai par būtiskām izmaiņām personas datos vai uzņēmuma datos.
          </p>
          <p>
            Banka ir tiesīga pieprasīt papildu dokumentus un apturēt pakalpojuma aktivizāciju līdz brīdim, kad ir veikta pilna
            identitātes un atbilstības pārbaude.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">3. Drošības pienākumi</h2>
          <p>
            Klients ir atbildīgs par autentifikācijas datu, paroļu un ierīču drošu lietošanu. Aizliegts nodot piekļuves datus
            trešajām personām vai glabāt tos nedrošā formā.
          </p>
          <p>
            Ja rodas aizdomas par nesankcionētu piekļuvi, klientam nekavējoties jāsazinās ar banku, lai ierobežotu piekļuvi
            kontam un novērstu iespējamus zaudējumus.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">4. Maksājumu noteikumi</h2>
          <p>
            Maksājuma uzdevums tiek uzskatīts par saņemtu, kad tas ir korekti ievadīts un apstiprināts internetbankā. Komisijas,
            limiti un izpildes termiņi tiek piemēroti saskaņā ar konkrētā pakalpojuma nosacījumiem.
          </p>
          <p>
            Banka var aizturēt, noraidīt vai pieprasīt papildu pārbaudi maksājumiem, kas neatbilst drošības, sankciju vai citu
            normatīvo prasību kritērijiem.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">5. Pakalpojuma pieejamība</h2>
          <p>
            Banka nodrošina pakalpojuma uzturēšanu un tehnisko atbalstu saprātīgā apjomā, tomēr var plānot apkopes logus,
            sistēmas atjauninājumus vai drošības ierobežojumus, kas uz laiku ietekmē pakalpojuma pieejamību.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">6. Atbildība</h2>
          <p>
            Katra puse ir atbildīga par tiešajiem zaudējumiem, ko izraisījusi tās vainojama rīcība. Banka neatbild par netiešiem
            zaudējumiem, ja to pieļauj piemērojamie tiesību akti.
          </p>
          <p>
            Klients ir atbildīgs par darbībām, kas veiktas ar viņa autentifikācijas datiem, līdz brīdim, kad banka ir saņēmusi
            paziņojumu par drošības incidentu un veikusi piekļuves ierobežojumu.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">7. Noteikumu izmaiņas</h2>
          <p>
            Banka var periodiski atjaunināt noteikumus. Būtiskas izmaiņas tiek publicētas internetbankā un stājas spēkā
            paziņojumā norādītajā termiņā.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">8. Saziņa</h2>
          <p>
            Jautājumiem par noteikumiem sazinieties ar klientu atbalstu: atbalsts@asterabanka.lv vai +371 20 000 000.
          </p>
        </section>
      </article>
    </PublicShell>
  );
}
