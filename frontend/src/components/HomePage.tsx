import { ArrowRight } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";

export function HomePage() {
  return (
    <div className="min-h-screen w-full bg-neutral-50/50 pt-20 font-sans text-neutral-900 overflow-hidden relative">
      <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-neutral-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-slate-200/30 rounded-full blur-[100px] pointer-events-none" />

      <section className="relative min-h-[90vh] flex flex-col justify-center px-6">
        <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative z-10">
          <div className="lg:col-span-7">
            <div>


              <h1 className="text-7xl md:text-[7rem] font-bold tracking-tighter leading-[0.9] mb-8 text-neutral-900 mix-blend-multiply">
                Kosmoss <br />
                <span className="text-cosmic opacity-90">Tavā kabatā.</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-neutral-500 mb-12 max-w-lg font-normal leading-relaxed">
                Mēs esam pārrakstījuši banku sistēmas kodu. Tīra enerģija, bezgalīgas iespējas un pilnīga brīvība.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <button className="btn-cosmic px-10 py-4 text-lg flex items-center gap-3">
                  Reģistrēties
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button className="px-8 py-4 text-neutral-600 hover:text-black font-medium border-b border-transparent hover:border-black">
                  Uzzināt vairāk
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative flex items-center justify-center">
             <div className="w-[400px] h-[500px] relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-300 to-neutral-100 rounded-[2rem] transform rotate-6 scale-95 shadow-2xl opacity-80" />
                <div className="absolute inset-0 bg-white rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden border border-neutral-200">
                   <ImageWithFallback 
                      src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMHNpbHZlciUyMGZsdWlkfGVufHwwfHx8MTcyOTcwMjIwMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                      alt="Liquid Metal Abstract"
                      className="w-full h-full object-cover opacity-90"
                   />
                   <div className="absolute bottom-8 left-8">
                      <div className="text-4xl font-bold text-neutral-900 tracking-tighter">∞</div>
                      <div className="text-xs font-bold uppercase tracking-widest text-neutral-500 mt-1">Potenciāls</div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      <section className="py-24 border-y border-neutral-200 bg-white overflow-hidden">
         <div className="flex items-center gap-24 opacity-20 px-6 whitespace-nowrap">
            {["ĀTRUMS", "DROŠĪBA", "BRĪVĪBA", "INOVĀCIJA", "NĀKOTNE", "KOSMOSS"].map((word, i) => (
               <span key={i} className="text-[10vw] font-bold text-transparent" style={{ WebkitTextStroke: '2px #000' }}>
                  {word}
               </span>
            ))}
         </div>
      </section>

      <section className="py-32 px-6 bg-neutral-50">
        <div className="max-w-[1400px] mx-auto">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-24 gap-y-16">
              <div className="md:col-span-2 mb-12">
                 <h2 className="text-4xl font-bold tracking-tight mb-4">Mūsu Specialitāte.</h2>
                 <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
              </div>

              {[
                {
                  title: "Globāla Valūta",
                  desc: "Norēķinieties jebkur pasaulē. Reālais valūtas kurss bez uzcenojuma.",
                  img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnbG9iZSUyMHRlY2h8ZW58MHx8fHwxNzI5NzAyMjAwfDA&ixlib=rb-4.1.0&q=80&w=1080"
                },
                {
                  title: "Kiberaizsardzība", 
                  desc: "Jūsu līdzekļi ir aizsargāti ar kvantu šifrēšanu. Drošāk par seifu.",
                  img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjeWJlcnNlY3VyaXR5JTIwYWJzdHJhY3R8ZW58MHx8fHwxNzI5NzAyMjAwfDA&ixlib=rb-4.1.0&q=80&w=1080"
                },
                {
                  title: "Momentānie Pārskaitījumi",
                  desc: "Nauda pārvietojas gaismas ātrumā. Nekādu brīvdienu, nekādu kavējumu.",
                  img: "https://images.unsplash.com/photo-1518770660439-4636190af475?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNoJTIwY2hpcHxlbnwwfHx8fDE3Mjk3MDIyMDB8MA&ixlib=rb-4.1.0&q=80&w=1080"
                },
                {
                   title: "Metāla Kartes",
                   desc: "Izgatavotas no kosmosa kuģu klases titāna. Smagas, izturīgas, mūžīgas.",
                   img: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZXRhbCUyMHRleHR1cmV8ZW58MHx8fHwxNzI5NzAyMjAwfDA&ixlib=rb-4.1.0&q=80&w=1080"
                }
              ].map((item, i) => (
                <div key={i} className="cursor-pointer">
                   <div className="w-full aspect-[16/9] overflow-hidden rounded-lg mb-6 bg-neutral-200 relative">
                      <ImageWithFallback 
                        src={item.img} 
                        alt={item.title}
                        className="w-full h-full object-cover grayscale opacity-80"
                      />
                      <div className="absolute inset-0 bg-black/10" />
                   </div>
                   <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
                      {item.title}
                      <ArrowRight className="w-5 h-5 text-blue-600" />
                   </h3>
                   <p className="text-neutral-500 max-w-sm text-lg leading-relaxed border-l border-neutral-300 pl-4">
                      {item.desc}
                   </p>
                </div>
              ))}
           </div>
        </div>
      </section>

      <section className="py-32 px-6 relative overflow-hidden bg-neutral-900 text-white">
         <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-purple-900/40 blur-[150px] rounded-full pointer-events-none" />
         <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-5xl md:text-8xl font-bold mb-8 tracking-tighter mix-blend-screen">
              Pievienojies <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Visumam.</span>
            </h2>
            <p className="text-xl text-neutral-400 mb-12 max-w-2xl mx-auto">
               Jūsu finanšu nākotne sākas šeit. 3 minūtes reģistrācijai. Bezmaksas sākums.
            </p>
            <button className="bg-white text-black font-bold px-12 py-5 text-xl rounded-full shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
              Atvērt Kontu
            </button>
         </div>
      </section>
    </div>
  );
}
