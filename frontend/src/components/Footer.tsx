import { Twitter, Instagram, Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-100 py-16 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center text-white font-bold">B</div>
            <span className="text-lg font-medium">Banka</span>
          </div>
          <p className="text-sm text-neutral-400 font-light">
            © 2026 Banka. Visas tiesības aizsargātas.
          </p>
        </div>
        
        <div className="flex gap-8 text-neutral-500 text-sm font-medium">
          <a href="#" className="hover:text-neutral-900 transition-colors">Par Mums</a>
          <a href="#" className="hover:text-neutral-900 transition-colors">Plāni</a>
          <a href="#" className="hover:text-neutral-900 transition-colors">Kontakti</a>
          <a href="#" className="hover:text-neutral-900 transition-colors">Privātums</a>
        </div>

        <div className="flex gap-4">
          {[Twitter, Instagram, Linkedin].map((Icon, i) => (
             <a key={i} href="#" className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 hover:bg-neutral-900 hover:text-white transition-all duration-300">
               <Icon className="w-4 h-4" />
             </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
