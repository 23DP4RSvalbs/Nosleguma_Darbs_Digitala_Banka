import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import asteraLogo from '../../assets/astera-logo.png';

type PublicPage = 'home' | 'about' | 'contact' | 'faq' | 'terms' | 'privacy' | 'cookie' | 'auth';

interface PublicShellProps {
  activePage: PublicPage;
  onHome: () => void;
  onAbout: () => void;
  onContact: () => void;
  onFaq: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
  onCookie: () => void;
  onLogin: () => void;
  onRegister: () => void;
  children: ReactNode;
}

export function PublicShell({
  activePage,
  onHome,
  onAbout,
  onContact,
  onFaq,
  onTerms,
  onPrivacy,
  onCookie,
  onLogin,
  children,
}: PublicShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [useBurgerMenu, setUseBurgerMenu] = useState(false);
  const headerRowRef = useRef<HTMLDivElement | null>(null);
  const headerMeasureRef = useRef<HTMLDivElement | null>(null);

  const links = [
    { key: 'home' as const, label: 'Sākumlapa', onClick: onHome },
    { key: 'about' as const, label: 'Par mums', onClick: onAbout },
    { key: 'contact' as const, label: 'Kontakti', onClick: onContact },
    { key: 'faq' as const, label: 'FAQ', onClick: onFaq },
  ];

  useEffect(() => {
    const updateLayout = () => {
      const availableWidth = headerRowRef.current?.clientWidth ?? 0;
      const requiredWidth = headerMeasureRef.current?.scrollWidth ?? 0;

      if (availableWidth === 0 || requiredWidth === 0) {
        return;
      }

      setUseBurgerMenu(requiredWidth > availableWidth);
    };

    updateLayout();

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateLayout) : null;

    if (headerRowRef.current && observer) {
      observer.observe(headerRowRef.current);
    }

    if (headerMeasureRef.current && observer) {
      observer.observe(headerMeasureRef.current);
    }

    window.addEventListener('resize', updateLayout);

    return () => {
      if (observer) {
        observer.disconnect();
      }

      window.removeEventListener('resize', updateLayout);
    };
  }, []);

  const navButtonBase = 'inline-flex h-10 min-w-[112px] items-center justify-center rounded-md border px-4 text-sm font-semibold transition-colors';
  const navButtonIdle = 'border-bank-border bg-bank-panel text-bank-ink hover:bg-bank-panel-soft';
  const navButtonActive = 'border-bank-cosmic bg-bank-cosmic text-white';
  const homeLogoBase = 'inline-flex h-10 min-w-[132px] items-center justify-center gap-2 rounded-md px-3 transition-colors';
  const homeLogoIdle = 'text-bank-cosmic hover:text-bank-cosmic-soft';
  const homeLogoActive = 'text-bank-cosmic';
  const authEntry = 'inline-flex h-10 min-w-[146px] items-center justify-center rounded-md border border-bank-cosmic bg-bank-cosmic px-4 text-sm font-semibold text-white transition-colors hover:bg-bank-cosmic-soft';

  const movingAnnouncements = [
    'Internetbanka pieejama 24/7 no datora, planšetes un telefona',
    'Konti, maksājumi un paziņojumi vienā drošā platformā',
    'Klientu atbalsts pieejams darba dienās no 09:00 līdz 18:00',
  ];
  const announcementLoop = Array.from({ length: 10 }, () => movingAnnouncements).flat();

  function renderHomeLogo(decorative = false) {
    return (
      <>
        <img src={asteraLogo} alt={decorative ? '' : 'Astera banka'} className="h-7 w-7 object-cover" />
        <span className="font-display text-base font-semibold leading-none tracking-[0.08em]">Astera</span>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-bank-base pb-14 font-body text-bank-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-bank-ink focus:shadow-lg"
      >
        Pāriet uz galveno saturu
      </a>

      <header className="sticky top-0 z-30 border-b border-bank-border bg-white">
        <div className="mx-auto max-w-[1180px] px-5 py-4 sm:px-6">
          <div ref={headerRowRef} className="relative">
            <div ref={headerMeasureRef} className="pointer-events-none absolute -left-[9999px] top-0 inline-flex items-center gap-2 whitespace-nowrap opacity-0">
              {links.map((link) => {
                const isActive = activePage === link.key;

                if (link.key === 'home') {
                  return (
                    <span
                      key={`measure-${link.key}`}
                      className={`${homeLogoBase} ${isActive ? homeLogoActive : homeLogoIdle}`}
                    >
                      {renderHomeLogo(true)}
                    </span>
                  );
                }

                return (
                  <span
                    key={`measure-${link.key}`}
                    className={`${navButtonBase} ${isActive ? navButtonActive : navButtonIdle}`}
                  >
                    {link.label}
                  </span>
                );
              })}
              <span className={authEntry}>Ienākt / Reģistrēties</span>
            </div>

            {useBurgerMenu ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-md border border-bank-border bg-bank-panel px-4 py-2 text-sm font-semibold text-bank-ink"
                  aria-label={isMenuOpen ? 'Aizvērt izvēlni' : 'Atvērt izvēlni'}
                  aria-expanded={isMenuOpen}
                  aria-controls="public-menu"
                >
                  <span className="text-xl leading-none">{isMenuOpen ? '×' : '☰'}</span>
                  Izvēlne
                </button>
              </div>
            ) : (
              <nav className="flex flex-nowrap items-center justify-center gap-2">
                {links.map((link) => {
                  const isActive = activePage === link.key;

                  if (link.key === 'home') {
                    return (
                      <a
                        key={link.key}
                        href="/"
                        onClick={(event) => {
                          event.preventDefault();
                          link.onClick();
                        }}
                        aria-current={isActive ? 'page' : undefined}
                        className={`${homeLogoBase} ${isActive ? homeLogoActive : homeLogoIdle}`}
                      >
                        {renderHomeLogo()}
                      </a>
                    );
                  }

                  return (
                    <button
                      key={link.key}
                      type="button"
                      onClick={link.onClick}
                      aria-current={isActive ? 'page' : undefined}
                      className={`${navButtonBase} ${isActive ? navButtonActive : navButtonIdle}`}
                    >
                      {link.label}
                    </button>
                  );
                })}

                <button type="button" onClick={onLogin} className={authEntry}>
                  Ienākt / Reģistrēties
                </button>
              </nav>
            )}
          </div>

          {useBurgerMenu && isMenuOpen && (
            <div id="public-menu" className="mt-4 space-y-3 rounded-xl border border-bank-border bg-bank-panel-soft p-3">
              <nav className="grid gap-1">
                {links.map((link) => {
                  const isActive = activePage === link.key;

                  return (
                    <button
                      key={link.key}
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        link.onClick();
                      }}
                      className={`${navButtonBase} w-full min-w-0 justify-start px-3 text-left ${isActive ? navButtonActive : navButtonIdle}`}
                    >
                      {link.label}
                    </button>
                  );
                })}
              </nav>

              <div className="grid gap-2 border-t border-bank-border pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLogin();
                  }}
                  className={authEntry}
                >
                  Ienākt / Reģistrēties
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1180px] px-5 py-10 sm:px-6 md:py-14">
        {children}
      </main>

      <footer className="mt-10 border-t border-bank-border/85 bg-bank-panel/90 backdrop-blur-xl">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-10 sm:px-6 md:grid-cols-3">
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bank-muted">Astera banka</p>
            <p className="mt-3 text-sm text-bank-muted">
              Droša ikdienas bankošana vienā platformā: konti, pārskaitījumi, kartes un klientu atbalsts.
            </p>
            <p className="mt-4 text-xs text-bank-muted">© 2026 Astera banka. Visas tiesības aizsargātas.</p>
          </section>

          <section>
            <p className="text-sm font-semibold">Navigācija</p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <a
                href="/"
                onClick={(event) => {
                  event.preventDefault();
                  onHome();
                }}
                className="w-fit text-bank-muted underline-offset-4 transition hover:text-bank-ink hover:underline"
              >
                Sākumlapa
              </a>
              <a
                href="/about"
                onClick={(event) => {
                  event.preventDefault();
                  onAbout();
                }}
                className="w-fit text-bank-muted underline-offset-4 transition hover:text-bank-ink hover:underline"
              >
                Par mums
              </a>
              <a
                href="/contact"
                onClick={(event) => {
                  event.preventDefault();
                  onContact();
                }}
                className="w-fit text-bank-muted underline-offset-4 transition hover:text-bank-ink hover:underline"
              >
                Kontakti
              </a>
              <a
                href="/faq"
                onClick={(event) => {
                  event.preventDefault();
                  onFaq();
                }}
                className="w-fit text-bank-muted underline-offset-4 transition hover:text-bank-ink hover:underline"
              >
                FAQ
              </a>
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold">Juridiskā informācija</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-bank-muted">
              <a
                href="/terms"
                onClick={(event) => {
                  event.preventDefault();
                  onTerms();
                }}
                className="w-fit underline-offset-4 transition hover:text-bank-ink hover:underline"
              >
                Lietošanas noteikumi
              </a>
              <a
                href="/privacy"
                onClick={(event) => {
                  event.preventDefault();
                  onPrivacy();
                }}
                className="w-fit underline-offset-4 transition hover:text-bank-ink hover:underline"
              >
                Privātuma politika
              </a>
              <a
                href="/cookies"
                onClick={(event) => {
                  event.preventDefault();
                  onCookie();
                }}
                className="w-fit underline-offset-4 transition hover:text-bank-ink hover:underline"
              >
                Sīkdatņu politika
              </a>
            </div>
          </section>
        </div>
      </footer>

      <div className="bank-announcement fixed inset-x-0 bottom-0 z-40" role="status" aria-live="polite">
        <div className="bank-announcement-track px-5 sm:px-6">
          {[...announcementLoop, ...announcementLoop].map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
