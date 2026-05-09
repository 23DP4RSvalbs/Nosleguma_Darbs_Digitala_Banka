import { PublicShell } from './PublicShell';

interface PrivacyPageProps {
  onBackHome: () => void;
  onAbout: () => void;
  onContact: () => void;
  onFaq: () => void;
  onTerms: () => void;
  onCookie: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

export function PrivacyPage({ onBackHome, onAbout, onContact, onFaq, onTerms, onCookie, onLogin, onRegister }: PrivacyPageProps) {
  return (
    <PublicShell
      activePage="privacy"
      onHome={onBackHome}
      onAbout={onAbout}
      onContact={onContact}
      onFaq={onFaq}
      onTerms={onTerms}
      onPrivacy={() => undefined}
      onCookie={onCookie}
      onLogin={onLogin}
      onRegister={onRegister}
    >
      <article className="mx-auto max-w-[860px] border border-slate-300 bg-white px-6 py-8 text-slate-900 sm:px-10 sm:py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Privātuma politika</h1>
        <p className="mt-2 text-sm text-slate-600">Pēdējās izmaiņas: 13.04.2026</p>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold">1. Politikas mērķis</h2>
          <p>
            Šī privātuma politika skaidro, kā Astera banka ievāc, apstrādā, glabā un aizsargā klientu personas datus,
            izmantojot internetbanku un saistītos pakalpojumus.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">2. Datu kategorijas</h2>
          <p>
            Banka var apstrādāt identifikācijas datus, kontaktinformāciju, konta un transakciju datus, autentifikācijas
            datus, kā arī tehniskos lietošanas datus, kas nepieciešami drošai un korektai pakalpojumu nodrošināšanai.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">3. Apstrādes tiesiskais pamats</h2>
          <p>
            Personas datu apstrāde tiek veikta līguma izpildei, normatīvo aktu prasību izpildei, leģitīmo interešu
            nodrošināšanai un, atsevišķos gadījumos, uz piekrišanas pamata.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">4. Datu izmantošanas mērķi</h2>
          <p>
            Dati tiek izmantoti konta uzturēšanai, maksājumu apstrādei, krāpšanas novēršanai, klientu atbalsta nodrošināšanai,
            kā arī sistēmas kvalitātes un drošības uzlabošanai.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">5. Datu glabāšanas termiņš</h2>
          <p>
            Personas dati tiek glabāti tikai tik ilgi, cik nepieciešams noteikto mērķu sasniegšanai un normatīvo aktu prasību
            izpildei. Pēc termiņa beigām dati tiek dzēsti vai anonimizēti.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">6. Datu nodošana trešajām personām</h2>
          <p>
            Dati var tikt nodoti pakalpojumu sniedzējiem vai uzraugošajām institūcijām tikai nepieciešamajā apjomā un saskaņā
            ar piemērojamiem tiesību aktiem.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">7. Klienta tiesības</h2>
          <p>
            Klientam ir tiesības pieprasīt piekļuvi saviem datiem, datu labošanu, dzēšanu, apstrādes ierobežošanu,
            iebildumu izteikšanu un datu pārnesamību, ciktāl to pieļauj normatīvie akti.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">8. Drošības pasākumi</h2>
          <p>
            Banka izmanto organizatoriskos un tehniskos drošības pasākumus, tostarp piekļuves kontroli, auditācijas žurnālus,
            sistēmu uzraudzību un datu aizsardzības procedūras.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">9. Saziņa</h2>
          <p>
            Ar datu aizsardzību saistītos jautājumos sazinieties ar banku pa e-pastu atbalsts@asterabanka.lv.
          </p>
        </section>
      </article>
    </PublicShell>
  );
}
