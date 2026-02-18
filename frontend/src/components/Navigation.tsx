import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Sākums", path: "/" },
    { name: "Plāni", path: "/plans" },
    { name: "Par Mums", path: "/about" },
    { name: "Kontakti", path: "/contact" },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-neutral-50/80 backdrop-blur-xl border-b border-neutral-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          

          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <a
                key={link.path}
                href={link.path}
                className="text-sm font-medium text-neutral-500 hover:text-black transition-colors tracking-wide"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button className="text-sm font-medium text-neutral-500 hover:text-black transition-colors px-4 py-2">
              Ielogoties
            </button>
            <button className="btn-cosmic text-sm px-6 py-2">
              Pieteikties
            </button>
          </div>

          <button
            className="md:hidden text-neutral-900 p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {isOpen && (
        <div className="fixed inset-0 bg-neutral-50 z-40 pt-24 px-6 flex flex-col gap-6 md:hidden">
          {navLinks.map((link) => (
            <a
              key={link.path}
              href={link.path}
              onClick={() => setIsOpen(false)}
              className="text-4xl font-bold text-neutral-900 tracking-tight hover:text-neutral-600 transition-colors"
            >
              {link.name}
            </a>
          ))}
          <div className="mt-auto mb-10 space-y-4">
            <button className="w-full btn-cosmic py-4 text-lg">
              Pieteikties
            </button>
            <button className="w-full btn-ghost py-4 text-lg">
              Ielogoties
            </button>
          </div>
        </div>
      )}
    </>
  );
}
