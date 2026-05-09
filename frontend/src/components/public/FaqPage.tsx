import { PublicShell } from './PublicShell';

interface FaqPageProps {
  onBackHome: () => void;
  onAbout: () => void;
  onContact: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
  onCookie: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

const faqSections = [
  {
    title: 'Konta atvēršana un piekļuve',
    items: [
      {
        question: 'Cik ātri varu atvērt kontu?',
        answer: 'Lielākā daļa klientu kontu atver tiešsaistē līdz 5 minūtēm, ja visa informācija ir ievadīta korekti.',
      },
      {
        question: 'Vai varu lietot internetbanku no telefona?',
        answer: 'Jā, platforma ir pielāgota mobilajām ierīcēm, planšetēm un datoriem bez funkcionalitātes zuduma.',
      },
      {
        question: 'Ko darīt, ja nevaru ielogoties?',
        answer: 'Sazinies ar klientu atbalstu, lai pēc identitātes pārbaudes atjaunotu piekļuvi kontam.',
      },
      {
        question: 'Vai varu izmantot vienu kontu vairākiem ģimenes locekļiem?',
        answer: 'Jā, vari pievienot konta dalībniekus ar atšķirīgām piekļuves tiesībām.',
      },
    ],
  },
  {
    title: 'Maksājumi un komisijas',
    items: [
      {
        question: 'Kāda komisija tiek piemērota pārskaitījumam?',
        answer: 'Pārskaitījumiem tiek piemērota 2.5% komisija, kas ir redzama pirms apstiprināšanas.',
      },
      {
        question: 'Kāpēc mans maksājums ir statusā "gaida apstiprinājumu"?',
        answer: 'Atsevišķiem maksājumiem drošības nolūkos tiek veikta papildu pārbaude pirms izpildes.',
      },
      {
        question: 'Vai varu atcelt tikko ievadītu maksājumu?',
        answer: 'Jā, maksājumu var atcelt līdz brīdim, kad tas nonāk izpildes stadijā.',
      },
      {
        question: 'Vai redzēšu pilnu maksājuma izmaksu pirms nosūtīšanas?',
        answer: 'Jā, sistēma parāda summu, komisiju un kopējo debetu pirms galīgās apstiprināšanas.',
      },
    ],
  },
  {
    title: 'Drošība un dati',
    items: [
      {
        question: 'Kā tiek aizsargāti mani dati?',
        answer: 'Pieeja datiem tiek kontrolēta pēc lietotāja lomas, un svarīgās darbības tiek reģistrētas drošības žurnālos.',
      },
      {
        question: 'Vai banka dalās ar datiem ar trešajām pusēm?',
        answer: 'Personas dati tiek apstrādāti tikai saskaņā ar privātuma politiku un normatīvajiem aktiem.',
      },
      {
        question: 'Ko darīt, ja pamanu aizdomīgu aktivitāti?',
        answer: 'Nekavējoties sazinies ar klientu centru. Mēs varam īslaicīgi ierobežot piekļuvi kontam drošības nolūkos.',
      },
      {
        question: 'Vai varu pieprasīt savu datu pārskatīšanu vai dzēšanu?',
        answer: 'Jā, vari iesniegt pieprasījumu datu piekļuvei, labošanai vai dzēšanai atbilstoši privātuma noteikumiem.',
      },
    ],
  },
];

export function FaqPage({ onBackHome, onAbout, onContact, onTerms, onPrivacy, onCookie, onLogin, onRegister }: FaqPageProps) {
  return (
    <PublicShell
      activePage="faq"
      onHome={onBackHome}
      onAbout={onAbout}
      onContact={onContact}
      onFaq={() => undefined}
      onTerms={onTerms}
      onPrivacy={onPrivacy}
      onCookie={onCookie}
      onLogin={onLogin}
      onRegister={onRegister}
    >
      <section className="space-y-6 rounded-[24px] bg-bank-panel px-6 py-8 sm:px-8 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-bank-muted">FAQ</p>
        <h1 className="max-w-3xl font-display text-4xl font-semibold tracking-tight md:text-5xl">Detalizēti biežāk uzdotie jautājumi</h1>
        <p className="max-w-3xl text-lg text-bank-muted">Atbildes par kontiem, maksājumiem, piekļuvi un datu drošību vienuviet.</p>
      </section>

      <section className="space-y-8 py-12 md:py-16">
        {faqSections.map((section, index) => (
          <article key={section.title} className="rounded-xl bg-bank-panel-soft p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-bank-cosmic sm:text-2xl">{section.title}</h2>
            <div className="mt-4 space-y-3">
              {section.items.map((item, itemIndex) => (
                <details
                  key={item.question}
                  className="rounded-lg bg-bank-panel px-4 py-4"
                  open={index === 0 && itemIndex === 0}
                >
                  <summary className="cursor-pointer list-none text-base font-semibold">{item.question}</summary>
                  <p className="mt-3 text-bank-muted">{item.answer}</p>
                </details>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-4 rounded-xl bg-bank-panel-soft p-6 py-10">
        <h2 className="font-display text-3xl font-semibold md:text-4xl">Neatradi vajadzīgo atbildi?</h2>
        <p className="max-w-2xl text-lg text-bank-muted">Sazinies ar konsultantu kontaktu sadaļā un saņem personīgu atbildi pēc iespējas ātrāk.</p>
        <p className="text-sm text-bank-muted">Izmanto galvenes pogas, lai ātri atvērtu sadaļu Kontakti vai Par mums.</p>
      </section>
    </PublicShell>
  );
}
