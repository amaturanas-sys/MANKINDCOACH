/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Landing pública del sitio. Lo ve cualquier visitante.
 * Secciones: Hero · Acerca · Servicios · Productos/Ebooks · Testimonios ·
 * FAQ · Blog · Contacto · Zona de clientes.
 *
 * IMPORTANTE: este sitio es PURAMENTE PROMOCIONAL. NO incluye la app del
 * administrador (workspace clínico), que vive como app local en el equipo
 * del coach (ver `MankindFactory.bat` o `MankindFactory_Admin_Estable.html`).
 *
 * La "Zona de clientes" es una sección estática que ofrece a los pacientes:
 *   - Datos de contacto del coach
 *   - Descargar la ficha inicial (HTML autocontenido que genera un JSON)
 *   - Formulario rápido de envío (mailto: pre-cargado)
 *
 * El contenido es estático aquí (editable en este archivo).
 */

import React, { useState } from 'react';
import {
  ArrowRight, Check, Star, MessageCircle, Mail, Instagram,
  Activity, Target, BookOpen, Calendar, Download, ChevronDown, ChevronUp,
  Award, Users, HeartPulse, Dumbbell, ExternalLink, UserCircle, FileDown, Send
} from 'lucide-react';
import { intakeFormHtml } from '../lib/coachForms';

/* ─── Datos editables (edita aquí los textos del sitio) ─── */
const SITE = {
  brand: 'MankindFactory',
  tagline: 'Entrenamiento prescrito como medicina',
  hero: {
    headline: 'Fuerza, salud y rendimiento.\nSin recetas mágicas.',
    sub: 'Programación científica de entrenamiento adaptada a tu fisiología, historia clínica y objetivos. Para personas que valoran el método sobre las modas.',
    primaryCta: 'Agendar evaluación inicial',
    secondaryCta: 'Conocer servicios'
  },
  coach: {
    name: 'Alberto Maturana S.',
    title: 'Coach · Medicina del Deporte',
    bio: 'Más de una década programando entrenamiento basado en evidencia. Trabajo con personas que entrenan para mejorar su salud, su rendimiento o ambos, con un enfoque clínico riguroso: anamnesis, evaluación funcional, prescripción individualizada y métricas de evolución reales.',
    credentials: [
      'Certificación NSCA — Strength & Conditioning',
      'Especialización en programación basada en evidencia',
      '10+ años de experiencia clínica',
      'Pacientes desde 16 hasta 78 años'
    ]
  },
  contact: {
    whatsapp: '+56912345678',
    email: 'hola@mankindfactory.app',
    instagram: '@mankindfactory'
  }
};

const SERVICES: Array<{
  id: string; icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string; description: string; price: string; features: string[]; highlighted?: boolean;
}> = [
  {
    id: 'evaluacion',
    icon: Activity,
    title: 'Evaluación inicial',
    description: 'Anamnesis completa, evaluación funcional, antropometría y diseño de plan personalizado.',
    price: 'CLP $60.000',
    features: [
      'Antropometría + composición corporal',
      'Evaluación de fuerza máxima (1RM)',
      'Test cardiovascular básico',
      'Diseño del plan inicial',
      'Documento clínico digital'
    ]
  },
  {
    id: 'mensual',
    icon: Target,
    title: 'Plan mensual',
    description: 'Programación semanal personalizada con seguimiento, ajustes y control de progreso.',
    price: 'CLP $80.000 / mes',
    features: [
      'Programación de microciclos',
      'Ajustes semanales',
      '1 control quincenal en línea',
      'WhatsApp para consultas técnicas',
      'Acceso a la biblioteca de ejercicios'
    ],
    highlighted: true
  },
  {
    id: 'pack-trimestral',
    icon: Award,
    title: 'Pack trimestral',
    description: '3 meses con 15% de descuento. Ideal para construir adherencia y ver cambios reales.',
    price: 'CLP $204.000 (15% OFF)',
    features: [
      'Todo lo del plan mensual',
      'Re-evaluación trimestral incluida',
      'Reporte de evolución detallado',
      'Prioridad en agendamientos',
      '15% de descuento total'
    ]
  }
];

const PRODUCTS: Array<{
  id: string; title: string; description: string; price: string; coverEmoji: string;
}> = [
  {
    id: 'ebook-fuerza',
    title: 'Fundamentos de Fuerza',
    description: 'Mini-guía PDF de 25 páginas. Los 5 conceptos que necesitas dominar antes de tu primera barra.',
    price: 'Gratis',
    coverEmoji: '📘'
  },
  {
    id: 'ebook-endurance',
    title: 'Endurance · Zonas y protocolos',
    description: 'Guía práctica para entrenar Z1-Z5: cómo calcular tus zonas, protocolos NSCA y plantillas listas.',
    price: 'CLP $9.900',
    coverEmoji: '🏃'
  },
  {
    id: 'curso-anamnesis',
    title: 'Anamnesis para coaches',
    description: 'Mini-curso PDF + plantilla editable. Cómo hacer una anamnesis clínica antes de prescribir.',
    price: 'CLP $19.900',
    coverEmoji: '📋'
  }
];

const TESTIMONIALS: Array<{
  id: string; name: string; role: string; quote: string; metric?: string;
}> = [
  {
    id: 't1', name: 'Carla M.', role: 'Pre-quirúrgica de rodilla',
    quote: 'Llegué con dolor lumbar y miedo a sentadillas. En 6 meses recuperé fuerza, mi cirujano me autorizó la cirugía con mejor pronóstico y entiendo mi cuerpo de otra forma.',
    metric: '+40% sentadilla 1RM · 0 dolor lumbar'
  },
  {
    id: 't2', name: 'Diego R.', role: 'Corredor amateur · 42 años',
    quote: 'Pasé de querer correr 5K sin morir a terminar mi primer media maratón en 1h47. La programación por zonas + el trabajo de fuerza cambiaron todo.',
    metric: 'PR 21K: 1h47 · VO2 +12%'
  },
  {
    id: 't3', name: 'Sofía P.', role: 'Triatleta sprint',
    quote: 'Las sesiones brick que diseñó Alberto fueron la diferencia en mi primera competencia. Sentí que entrenaba con propósito, no improvisando.',
    metric: 'Top 10 categoría · 1ª competencia'
  }
];

const FAQS = [
  {
    q: '¿Necesito experiencia previa para empezar?',
    a: 'No. Trabajo con principiantes absolutos y atletas avanzados por igual. El primer paso siempre es la evaluación inicial donde definimos el punto de partida real.'
  },
  {
    q: '¿Tienen modalidad online o solo presencial?',
    a: 'Ambas. La programación, controles y seguimiento son 100% online. Si vives en Santiago podemos coordinar evaluaciones presenciales en gimnasios partner.'
  },
  {
    q: '¿Qué pasa si tengo una lesión o condición médica?',
    a: 'La anamnesis inicial incluye historia clínica completa. Adaptamos el plan a tus contraindicaciones y, si es necesario, coordinamos con tu kinesiólogo/médico tratante.'
  },
  {
    q: '¿Puedo seguir el plan en mi gimnasio actual?',
    a: 'Sí. Diseño los planes pensando en el equipamiento real al que tienes acceso. Si tu gimnasio no tiene algo, sustituyo por ejercicios equivalentes.'
  },
  {
    q: '¿Cómo se ven los controles de progreso?',
    a: 'Cada 2 semanas registramos métricas relevantes (carga, repeticiones, RPE, antropometría según el ciclo). Mensualmente reviso tendencias y ajusto el plan.'
  },
  {
    q: '¿Aceptan pagos en cuotas?',
    a: 'Sí, podemos coordinar pago en 2 cuotas sin interés para el pack trimestral. Para el plan mensual el pago es al inicio del mes.'
  }
];

const BLOG_POSTS: Array<{
  id: string; title: string; excerpt: string; readTime: string; tag: string;
}> = [
  {
    id: 'mito-sentadilla',
    title: '¿La sentadilla profunda daña las rodillas?',
    excerpt: 'Mito vs realidad: lo que dice la evidencia sobre profundidad, cartílago y dolor articular.',
    readTime: '5 min',
    tag: 'Mitos'
  },
  {
    id: 'zonas-cardio',
    title: 'Cómo calcular tus zonas de entrenamiento sin reloj caro',
    excerpt: '3 métodos prácticos para estimar tus zonas Z1-Z5: % FCmax, talk test y RPE Borg.',
    readTime: '8 min',
    tag: 'Endurance'
  },
  {
    id: 'progresion-novato',
    title: 'Progresión para principiantes: 12 semanas reales',
    excerpt: 'Plantilla que uso con pacientes nuevos. Por qué la dosis mínima efectiva vence a la intensidad.',
    readTime: '10 min',
    tag: 'Fuerza'
  }
];

export default function PublicLandingPage() {
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /**
   * Descarga la ficha inicial como HTML autocontenido. El paciente la abre
   * en su navegador, la completa, y el HTML descarga un JSON que después
   * envía al coach por email/WhatsApp.
   */
  const downloadIntakeForm = () => {
    const html = intakeFormHtml({
      coachName: SITE.coach.name,
      clientName: '',  // se rellena cuando el paciente abre la ficha
      clientId: `intake-${Date.now()}`
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MankindFactory_Ficha_Inicial.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /** Abre el cliente de email con la ficha completada como adjunto sugerido. */
  const sendCompletedForm = () => {
    const subject = encodeURIComponent('Ficha inicial completada - MankindFactory');
    const body = encodeURIComponent(
      `Hola ${SITE.coach.name},\n\n` +
      `Te adjunto mi ficha inicial completada (archivo JSON).\n\n` +
      `Cualquier cosa que necesites adicional avísame.\n\n` +
      `Saludos.`
    );
    window.location.href = `mailto:${SITE.contact.email}?subject=${subject}&body=${body}`;
  };

  /** Envía un mensaje breve de contacto vía mailto. */
  const sendContactMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactMessage.trim()) return;
    const subject = encodeURIComponent(`Consulta de ${contactName.trim()} desde el sitio`);
    const body = encodeURIComponent(`${contactMessage.trim()}\n\n— ${contactName.trim()}`);
    window.location.href = `mailto:${SITE.contact.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-[#5D36FF] selection:text-white">
      {/* ────── NAV BAR ────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-zinc-950/85 border-b border-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="#hero" onClick={(e) => { e.preventDefault(); scrollTo('hero'); }}
            className="flex items-center gap-2 font-sans font-black tracking-tight text-base">
            <span className="text-[#5D36FF]">▲</span>
            <span>{SITE.brand}</span>
          </a>
          <div className="hidden md:flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider">
            {[
              { id: 'acerca', label: 'Acerca' },
              { id: 'servicios', label: 'Servicios' },
              { id: 'productos', label: 'Productos' },
              { id: 'testimonios', label: 'Testimonios' },
              { id: 'blog', label: 'Blog' },
              { id: 'faq', label: 'FAQ' }
            ].map(item => (
              <button key={item.id} type="button"
                onClick={() => scrollTo(item.id)}
                className="px-3 py-1.5 text-zinc-400 hover:text-white transition">
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button" onClick={() => scrollTo('clientes')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#5D36FF]/10 border border-[#5D36FF]/40 hover:bg-[#5D36FF]/20 text-[#5D36FF] hover:text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition"
            aria-label="Zona de clientes"
          >
            <UserCircle size={11} aria-hidden="true" /> Zona de clientes
          </button>
        </div>
      </nav>

      {/* ────── HERO ────── */}
      <section id="hero" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#5D36FF]/10 via-transparent to-[#EC4899]/5 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-32 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5D36FF]/10 border border-[#5D36FF]/30 mb-6">
            <Activity size={11} className="text-[#5D36FF]" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#5D36FF] font-bold">
              {SITE.tagline}
            </span>
          </div>
          <h1 className="font-sans font-black text-4xl md:text-6xl lg:text-7xl tracking-tight leading-[1.05] mb-6 whitespace-pre-line">
            {SITE.hero.headline}
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed mb-10">
            {SITE.hero.sub}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={() => scrollTo('contacto')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition">
              <Calendar size={14} aria-hidden="true" /> {SITE.hero.primaryCta}
              <ArrowRight size={14} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => scrollTo('servicios')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition">
              {SITE.hero.secondaryCta}
            </button>
          </div>
        </div>
      </section>

      {/* ────── ACERCA ────── */}
      <section id="acerca" className="border-t border-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <SectionLabel label="Acerca" icon={Users} />
          <div className="grid md:grid-cols-3 gap-10 mt-8">
            <div className="md:col-span-1">
              <div className="aspect-square bg-gradient-to-br from-[#5D36FF]/20 to-[#EC4899]/10 border border-zinc-800 rounded-2xl flex items-center justify-center">
                <span className="text-9xl opacity-30">👤</span>
              </div>
            </div>
            <div className="md:col-span-2 space-y-5">
              <h2 className="font-sans font-bold text-3xl md:text-4xl tracking-tight">{SITE.coach.name}</h2>
              <p className="font-mono text-xs text-[#5D36FF] uppercase tracking-wider">{SITE.coach.title}</p>
              <p className="text-zinc-300 leading-relaxed text-base">{SITE.coach.bio}</p>
              <ul className="space-y-2 pt-3">
                {SITE.coach.credentials.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                    <Check size={14} className="text-[#5D36FF] shrink-0 mt-1" aria-hidden="true" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ────── SERVICIOS ────── */}
      <section id="servicios" className="border-t border-zinc-900 bg-gradient-to-b from-zinc-950 to-zinc-950/50">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <SectionLabel label="Servicios" icon={Dumbbell} />
          <h2 className="font-sans font-bold text-3xl md:text-4xl tracking-tight mt-3 mb-3">
            Programas pensados como tratamiento clínico
          </h2>
          <p className="text-zinc-400 max-w-2xl mb-12">
            Cada plan parte de una evaluación rigurosa y se ajusta semanal o quincenalmente
            según tu evolución. Sin recetas genéricas.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {SERVICES.map(s => {
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  className={`p-6 rounded-2xl border transition ${
                    s.highlighted
                      ? 'bg-gradient-to-b from-[#5D36FF]/10 to-transparent border-[#5D36FF]/50 shadow-2xl shadow-[#5D36FF]/10'
                      : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {s.highlighted && (
                    <span className="inline-block mb-3 px-2 py-0.5 bg-[#5D36FF] text-white text-[9px] font-mono uppercase tracking-wider font-bold rounded">
                      Más elegido
                    </span>
                  )}
                  <Icon size={22} className="text-[#5D36FF] mb-3" aria-hidden="true" />
                  <h3 className="font-sans font-bold text-xl mb-2">{s.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">{s.description}</p>
                  <p className="font-mono text-lg font-bold text-white mb-4">{s.price}</p>
                  <ul className="space-y-2 mb-5">
                    {s.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-zinc-300">
                        <Check size={11} className="text-[#5D36FF] shrink-0 mt-1" aria-hidden="true" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => scrollTo('contacto')}
                    className={`w-full px-4 py-2 rounded-lg font-mono text-[11px] uppercase tracking-wider font-bold transition ${
                      s.highlighted
                        ? 'bg-[#5D36FF] hover:bg-[#4A22F0] text-white'
                        : 'bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/60 text-zinc-300 hover:text-white'
                    }`}>
                    Consultar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ────── PRODUCTOS / EBOOKS ────── */}
      <section id="productos" className="border-t border-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <SectionLabel label="Productos & Ebooks" icon={BookOpen} />
          <h2 className="font-sans font-bold text-3xl md:text-4xl tracking-tight mt-3 mb-3">
            Recursos descargables
          </h2>
          <p className="text-zinc-400 max-w-2xl mb-12">
            Guías y mini-cursos basados en evidencia, escritos para personas que quieren
            entender qué están haciendo y por qué.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {PRODUCTS.map(p => (
              <div key={p.id} className="bg-zinc-900/40 border border-zinc-800 hover:border-[#5D36FF]/40 rounded-2xl p-5 transition group">
                <div className="aspect-[4/3] bg-gradient-to-br from-[#5D36FF]/20 to-zinc-950 rounded-lg flex items-center justify-center mb-4 border border-zinc-800">
                  <span className="text-6xl">{p.coverEmoji}</span>
                </div>
                <h3 className="font-sans font-bold text-base mb-2">{p.title}</h3>
                <p className="text-[12px] text-zinc-400 leading-relaxed mb-3">{p.description}</p>
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                  <span className="font-mono text-sm font-bold text-[#5D36FF]">{p.price}</span>
                  <button type="button" onClick={() => scrollTo('contacto')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/60 hover:text-white text-zinc-400 rounded font-mono text-[10px] uppercase tracking-wider font-bold transition">
                    <Download size={10} aria-hidden="true" /> Obtener
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── TESTIMONIOS ────── */}
      <section id="testimonios" className="border-t border-zinc-900 bg-gradient-to-b from-zinc-950 to-zinc-950/50">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <SectionLabel label="Casos reales" icon={HeartPulse} />
          <h2 className="font-sans font-bold text-3xl md:text-4xl tracking-tight mt-3 mb-12">
            Lo que dicen quienes entrenan acá
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map(t => (
              <div key={t.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col">
                <div className="flex items-center gap-0.5 mb-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} size={12} className="text-[#FFB020] fill-[#FFB020]" aria-hidden="true" />
                  ))}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed italic mb-6 flex-1">
                  "{t.quote}"
                </p>
                {t.metric && (
                  <div className="mb-3 px-3 py-2 bg-[#5D36FF]/10 border border-[#5D36FF]/20 rounded font-mono text-[10px] text-[#5D36FF] uppercase tracking-wider font-bold">
                    {t.metric}
                  </div>
                )}
                <div className="pt-3 border-t border-zinc-800">
                  <p className="font-sans font-bold text-sm">{t.name}</p>
                  <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── BLOG ────── */}
      <section id="blog" className="border-t border-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <SectionLabel label="Blog" icon={BookOpen} />
          <div className="flex flex-wrap items-end justify-between gap-3 mt-3 mb-12">
            <h2 className="font-sans font-bold text-3xl md:text-4xl tracking-tight">
              Lecturas seleccionadas
            </h2>
            <p className="text-[12px] font-mono text-zinc-500 uppercase tracking-wider">
              Próximamente · más artículos
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {BLOG_POSTS.map(p => (
              <article key={p.id} className="bg-zinc-900/40 border border-zinc-800 hover:border-[#5D36FF]/40 rounded-2xl p-6 transition group cursor-pointer">
                <span className="inline-block mb-3 px-2 py-0.5 bg-zinc-950 border border-zinc-800 text-zinc-400 text-[9px] font-mono uppercase tracking-wider rounded">
                  {p.tag}
                </span>
                <h3 className="font-sans font-bold text-lg mb-2 leading-snug">{p.title}</h3>
                <p className="text-[12px] text-zinc-400 leading-relaxed mb-4">{p.excerpt}</p>
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                  <span className="font-mono text-[10px] text-zinc-500">{p.readTime} lectura</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#5D36FF] uppercase tracking-wider font-bold group-hover:gap-2 transition-all">
                    Leer <ArrowRight size={10} aria-hidden="true" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ────── FAQ ────── */}
      <section id="faq" className="border-t border-zinc-900 bg-gradient-to-b from-zinc-950 to-zinc-950/50">
        <div className="max-w-3xl mx-auto px-4 py-20 md:py-28">
          <SectionLabel label="Preguntas frecuentes" icon={MessageCircle} />
          <h2 className="font-sans font-bold text-3xl md:text-4xl tracking-tight mt-3 mb-12">
            Las dudas más comunes
          </h2>
          <div className="space-y-2">
            {FAQS.map((f, i) => {
              const id = `faq-${i}`;
              const isOpen = openFaq === id;
              return (
                <div key={id} className={`border rounded-xl transition ${isOpen ? 'bg-[#5D36FF]/5 border-[#5D36FF]/30' : 'bg-zinc-900/40 border-zinc-800'}`}>
                  <button type="button"
                    onClick={() => setOpenFaq(isOpen ? null : id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
                    <span className="font-sans font-bold text-sm md:text-base">{f.q}</span>
                    {isOpen ? <ChevronUp size={16} className="text-zinc-500 shrink-0" aria-hidden="true" /> : <ChevronDown size={16} className="text-zinc-500 shrink-0" aria-hidden="true" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-zinc-300 leading-relaxed">
                      {f.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ────── CONTACTO / CTA FINAL ────── */}
      <section id="contacto" className="border-t border-zinc-900">
        <div className="max-w-4xl mx-auto px-4 py-20 md:py-28">
          <div className="bg-gradient-to-br from-[#5D36FF]/15 via-zinc-950 to-[#EC4899]/10 border border-[#5D36FF]/30 rounded-3xl p-8 md:p-12 text-center">
            <SectionLabel label="Comencemos" icon={Calendar} center />
            <h2 className="font-sans font-bold text-3xl md:text-4xl tracking-tight mt-4 mb-4">
              Agenda tu evaluación inicial
            </h2>
            <p className="text-zinc-300 max-w-xl mx-auto mb-8 leading-relaxed">
              Escríbeme por el canal que prefieras y coordinamos una primera conversación
              de 15 minutos sin costo para ver si encajamos.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={`https://wa.me/${SITE.contact.whatsapp.replace(/[^0-9]/g, '')}?text=Hola%20Alberto,%20quiero%20agendar%20una%20evaluaci%C3%B3n%20inicial`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#1FB955] text-white rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition">
                <MessageCircle size={14} aria-hidden="true" /> WhatsApp
              </a>
              <a
                href={`mailto:${SITE.contact.email}?subject=Evaluaci%C3%B3n%20inicial`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/60 hover:text-white text-zinc-300 rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition">
                <Mail size={14} aria-hidden="true" /> Email
              </a>
              <a
                href={`https://instagram.com/${SITE.contact.instagram.replace('@', '')}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/60 hover:text-white text-zinc-300 rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition">
                <Instagram size={14} aria-hidden="true" /> Instagram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ────── ZONA DE CLIENTES ────── */}
      <section id="clientes" className="border-t border-zinc-900 bg-gradient-to-b from-zinc-950 via-[#5D36FF]/5 to-zinc-950">
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-28">
          <SectionLabel label="Zona de clientes" icon={UserCircle} />
          <h2 className="font-sans font-bold text-3xl md:text-4xl tracking-tight mt-3 mb-3">
            Si ya entrenás conmigo
          </h2>
          <p className="text-zinc-400 max-w-2xl mb-10 leading-relaxed">
            Encontrá acá los datos de contacto, descargá la ficha inicial para
            tu primera evaluación, o enviame un mensaje rápido.
          </p>

          <div className="grid md:grid-cols-3 gap-4">

            {/* Card 1: Contacto directo */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 flex flex-col">
              <div className="w-10 h-10 rounded-full bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center mb-4">
                <MessageCircle size={18} className="text-[#25D366]" aria-hidden="true" />
              </div>
              <h3 className="font-sans font-bold text-lg mb-2">Contacto directo</h3>
              <p className="text-[12px] text-zinc-400 leading-relaxed mb-5 flex-1">
                Para coordinar sesiones, consultar dudas técnicas o mandar fotos / videos del entrenamiento.
              </p>
              <div className="space-y-2">
                <a
                  href={`https://wa.me/${SITE.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#1FB955] text-white rounded-lg font-mono text-[11px] uppercase tracking-wider font-bold transition">
                  <MessageCircle size={12} aria-hidden="true" /> WhatsApp
                </a>
                <a
                  href={`mailto:${SITE.contact.email}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/60 text-zinc-300 hover:text-white rounded-lg font-mono text-[11px] uppercase tracking-wider font-bold transition">
                  <Mail size={12} aria-hidden="true" /> Email
                </a>
                <p className="text-[10px] font-mono text-zinc-500 text-center pt-1">
                  {SITE.contact.email}
                </p>
              </div>
            </div>

            {/* Card 2: Descargar ficha inicial */}
            <div className="bg-gradient-to-b from-[#5D36FF]/10 to-transparent border border-[#5D36FF]/30 rounded-2xl p-6 flex flex-col shadow-2xl shadow-[#5D36FF]/10">
              <div className="w-10 h-10 rounded-full bg-[#5D36FF]/20 border border-[#5D36FF]/40 flex items-center justify-center mb-4">
                <FileDown size={18} className="text-[#5D36FF]" aria-hidden="true" />
              </div>
              <h3 className="font-sans font-bold text-lg mb-2">Ficha inicial</h3>
              <p className="text-[12px] text-zinc-400 leading-relaxed mb-5 flex-1">
                Descargá la <strong className="text-white">ficha inicial</strong>: un archivo HTML que abrís
                en tu navegador, completás con tus datos y al enviarlo te descarga
                un JSON que después me reenviás.
              </p>
              <button
                type="button" onClick={downloadIntakeForm}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded-lg font-mono text-[11px] uppercase tracking-wider font-bold transition">
                <Download size={12} aria-hidden="true" /> Descargar ficha (HTML)
              </button>
              <p className="text-[10px] font-mono text-zinc-500 mt-3 leading-relaxed">
                Pasos: <span className="text-zinc-300">1.</span> Descargar · <span className="text-zinc-300">2.</span> Abrir y completar · <span className="text-zinc-300">3.</span> Enviar el JSON al coach.
              </p>
            </div>

            {/* Card 3: Enviar ficha completada */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 flex flex-col">
              <div className="w-10 h-10 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center mb-4">
                <Send size={18} className="text-[#F59E0B]" aria-hidden="true" />
              </div>
              <h3 className="font-sans font-bold text-lg mb-2">Enviar ficha completada</h3>
              <p className="text-[12px] text-zinc-400 leading-relaxed mb-5 flex-1">
                Ya completaste la ficha y tenés el JSON descargado? Abrí tu
                cliente de email con el asunto y mensaje pre-cargado para
                enviar el archivo al coach.
              </p>
              <button
                type="button" onClick={sendCompletedForm}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 border border-[#F59E0B]/40 hover:bg-[#F59E0B]/10 hover:border-[#F59E0B] text-[#F59E0B] rounded-lg font-mono text-[11px] uppercase tracking-wider font-bold transition">
                <Send size={12} aria-hidden="true" /> Abrir mi cliente de email
              </button>
              <p className="text-[10px] font-mono text-zinc-500 mt-3 leading-relaxed">
                También podés enviarme el JSON por WhatsApp (es un archivo, no texto).
              </p>
            </div>

          </div>

          {/* Formulario rápido de mensaje */}
          <div className="mt-10 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 md:p-8">
            <h3 className="font-sans font-bold text-xl mb-2">¿Una consulta rápida sin ficha?</h3>
            <p className="text-[13px] text-zinc-400 mb-5">
              Si todavía no sos paciente o querés preguntar algo puntual, escribime acá. Al enviar se abre tu cliente de email con el mensaje listo para mandar.
            </p>
            <form onSubmit={sendContactMessage} className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-1">Tu nombre</span>
                <input
                  type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                  placeholder="Nombre y apellido" required
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-[#5D36FF]/60 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-1">Contacto</span>
                <input
                  type="text"
                  placeholder={SITE.contact.email}
                  disabled
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-500 text-sm cursor-not-allowed"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-1">Tu mensaje</span>
                <textarea
                  value={contactMessage} onChange={e => setContactMessage(e.target.value)}
                  placeholder="Hola, me interesa saber más sobre…" required rows={4}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-[#5D36FF]/60 rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-y"
                />
              </label>
              <button
                type="submit"
                disabled={!contactName.trim() || !contactMessage.trim()}
                className="sm:col-span-2 px-4 py-3 bg-[#5D36FF] hover:bg-[#4A22F0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition inline-flex items-center justify-center gap-2">
                <Send size={13} aria-hidden="true" /> Enviar mensaje
              </button>
            </form>
            <p className="text-[10px] font-mono text-zinc-600 mt-4 leading-relaxed text-center">
              Al enviar se abre tu cliente de email (Outlook, Gmail, Apple Mail…) con el mensaje pre-cargado. Vos confirmás el envío desde ahí.
            </p>
          </div>
        </div>
      </section>

      {/* ────── FOOTER ────── */}
      <footer className="border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#5D36FF]">▲</span>
            <span className="font-sans font-bold">{SITE.brand}</span>
            <span className="text-zinc-600">·</span>
            <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500">
            <a href={`https://wa.me/${SITE.contact.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-white inline-flex items-center gap-1">
              WhatsApp <ExternalLink size={9} aria-hidden="true" />
            </a>
            <a href={`mailto:${SITE.contact.email}`} className="hover:text-white">{SITE.contact.email}</a>
            <button type="button" onClick={() => scrollTo('clientes')} className="hover:text-[#5D36FF] inline-flex items-center gap-1">
              <UserCircle size={9} aria-hidden="true" /> Clientes
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionLabel({ label, icon: Icon, center = false }: { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; center?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5D36FF]/10 border border-[#5D36FF]/30 ${center ? 'mx-auto' : ''}`}>
      <Icon size={11} className="text-[#5D36FF]" aria-hidden="true" />
      <span className="font-mono text-[10px] uppercase tracking-wider text-[#5D36FF] font-bold">{label}</span>
    </div>
  );
}
