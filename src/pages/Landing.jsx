import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, ROLE } from '../context/AuthContext';
import MoodFace from '../components/MoodFace';
import { CRISIS_LINES } from '../constants/crisisResources';
import {
  MessageCircle, Users, Smile, BarChart3, BookOpen, Target, Compass,
  ArrowRight, ArrowUpRight, Phone, Mail, Clock, ShieldCheck, Lock, Heart,
  Quote, ChevronLeft, ChevronRight, Check, Menu, X,
} from 'lucide-react';
import './Landing.css';

/* ─────────────────────────────────────────────────────────────────────
   Photography.
   Free-licence stock from Pexels, referenced by their CDN. Every entry
   is one place to change: drop in your own licensed shoot by swapping
   the `src` and keeping the `alt`. Pexels' licence allows commercial
   use without attribution, but for a production site you will almost
   certainly want your own images of your own counsellors.
   ───────────────────────────────────────────────────────────────────── */
const px = (id, w = 1200) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const PHOTOS = {
  hero: { src: px(14797769, 1000), alt: 'A counsellor listening as a woman talks during a therapy session' },
  about: { src: px(9065249), alt: 'A psychologist in conversation with a client in a bright office' },
  band: { src: px(8555013, 1600), alt: 'A group of people in an open discussion together' },
  moments: [
    { src: px(7176323, 800), alt: 'A counsellor taking notes while listening to a client', tag: 'One to one' },
    { src: px(6383164, 800), alt: 'A woman comforting an upset friend at home', tag: 'Support' },
    { src: px(7219164, 800), alt: 'Friends having a warm conversation together', tag: 'Connection' },
    { src: px(7219233, 800), alt: 'A group of friends spending time together and laughing', tag: 'Community' },
    { src: px(8555013, 800), alt: 'A diverse group of people talking in a circle', tag: 'Group work' },
    { src: px(9065249, 800), alt: 'A therapist and client sitting together in session', tag: 'Therapy' },
  ],
};

const TESTIMONIALS = [
  { quote: 'I used it at 2am when I could not call anyone. It did not fix everything, but I stopped spiralling — and I had somewhere to put it.',
    name: 'Ama', role: 'Student, 24', photo: px(6383164, 300) },
  { quote: 'Seeing a month of my moods laid out was the first time I actually believed my therapist about patterns. It changed how I talk in sessions.',
    name: 'Daniel', role: 'Teacher, 31', photo: px(7219164, 300) },
  { quote: 'Being able to book anonymously was the only reason I went through with the first session. That one choice made all the difference.',
    name: 'Priya', role: 'Designer, 19', photo: px(7219233, 300) },
];

const SERVICES = [
  { Icon: MessageCircle, title: 'AI companion', desc: 'A companion that remembers your mood, goals and journal, available at any hour.', to: '/register' },
  { Icon: Users, title: 'Human counselling', desc: 'Verified counsellors you can talk to anonymously, or book a scheduled session with.', to: '/counselor-signup' },
  { Icon: BarChart3, title: 'Mood tracking', desc: 'Ten-second check-ins that build into a picture of how you are really doing.', to: '/register' },
  { Icon: BookOpen, title: 'Private journal', desc: 'Write freely, tagged with your mood. Yours alone, searchable, always private.', to: '/register' },
];

const STEPS = [
  { n: '01', title: 'Check in', desc: 'Tap how you feel. Ten seconds, no explanation required.' },
  { n: '02', title: 'Talk it through', desc: 'With Atara any time, or with a real counsellor when you want a person.' },
  { n: '03', title: 'Keep going', desc: 'Watch the patterns, set one small goal, and let the weeks add up.' },
];

const STATS = [
  { value: 24, suffix: '/7', label: 'Companion available' },
  { value: 100, suffix: '%', label: 'Anonymous by default' },
  { value: 50, suffix: 'min', label: 'Counselling sessions' },
  { value: 0, prefix: '£', suffix: '', label: 'Cost to get started' },
];

const SKILLS = [
  ['Anxiety and stress', 92],
  ['Low mood and depression', 88],
  ['Sleep and burnout', 84],
  ['Relationships and grief', 79],
];

/* Reveals .reveal elements as they scroll in. */
function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal'));
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* Counts up once, the first time the band is on screen. */
function Counter({ value, prefix = '', suffix = '' }) {
  const ref = useRef(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) { setN(value); return undefined; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - start) / 1200);
        setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  return <span ref={ref}>{prefix}{n}{suffix}</span>;
}

function TopBar() {
  return (
    <div className="lp-topbar">
      <div className="lp-topbar-inner">
        <div className="lp-topbar-left">
          <span><Phone size={13} /> Crisis? Call {CRISIS_LINES[0].number}</span>
          <span><Mail size={13} /> calebannom7@gmail.com</span>
        </div>
        <div className="lp-topbar-right">
          <span><Clock size={13} /> Companion available 24/7</span>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const links = [
    ['Home', '#top'], ['How it works', '#how'], ['Services', '#services'],
    ['Moments', '#moments'], ['Stories', '#stories'],
  ];
  return (
    <header className={`lp-header ${stuck ? 'is-stuck' : ''}`}>
      <div className="lp-header-inner">
        <Link to="/" className="lp-brand">
          <img src="/logo-icon.png" alt="" className="lp-brand-mark" />
          <span className="lp-brand-name">Atara</span>
        </Link>

        <nav className={`lp-menu ${open ? 'is-open' : ''}`} aria-label="Main">
          {links.map(([label, href]) => (
            <a key={label} href={href} onClick={() => setOpen(false)}>{label}</a>
          ))}
          <Link to="/counselor-signup" className="lp-menu-alt" onClick={() => setOpen(false)}>
            For counsellors
          </Link>
        </nav>

        <div className="lp-header-actions">
          <Link to="/login" className="lp-signin">Sign in</Link>
          <Link to="/register" className="btn btn-green">
            Get started free <ArrowRight size={15} />
          </Link>
          <button className="lp-burger" onClick={() => setOpen((o) => !o)}
                  aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const [mood, setMood] = useState(null);
  return (
    <section className="lp-hero" id="top">
      <span className="lp-hero-blob" aria-hidden="true" />
      <div className="lp-hero-inner">
        <div className="lp-hero-copy">
          <p className="lp-eyebrow"><span /> We are here to listen</p>
          <h1 className="lp-h1">
            Support that meets you where you{" "}
            <span className="lp-underline">actually are</span>.
          </h1>
          <p className="lp-lead">
            Atara pairs a companion you can talk to at any hour with verified human
            counsellors when you want a real person. Track how you are doing, book a
            session, stay anonymous if you would rather.
          </p>
          <div className="lp-hero-cta">
            <Link to="/register" className="btn btn-green btn-lg">
              Get started free <ArrowRight size={16} />
            </Link>
            <a href="#how" className="btn btn-line btn-lg">How it works</a>
          </div>
          <ul className="lp-hero-trust">
            <li><Lock size={14} /> Private by default</li>
            <li><ShieldCheck size={14} /> Anonymous counselling</li>
            <li><Heart size={14} /> Free to start</li>
          </ul>
        </div>

        <div className="lp-hero-media">
          <span className="lp-hero-accent" aria-hidden="true" />
          <figure className="lp-hero-photo">
            <img src={PHOTOS.hero.src} alt={PHOTOS.hero.alt} loading="eager" />
          </figure>

          <div className="lp-hero-card">
            <p className="lp-hero-card-q">How are you feeling today?</p>
            <div className="lp-hero-moods">
              {['rad', 'good', 'meh', 'bad', 'awful'].map((m) => (
                <button key={m} onClick={() => setMood(mood === m ? null : m)}
                        className={`lp-mood ${mood === m ? 'is-on' : ''}`}
                        aria-pressed={mood === m}>
                  <MoodFace mood={m} size={30} label />
                </button>
              ))}
            </div>
            <p className="lp-hero-card-note" aria-live="polite">
              {mood ? 'Logged. That is all a check-in takes.' : 'Tap one — this is the whole ritual.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section className="lp-section" id="services">
      <div className="lp-wrap">
        <div className="lp-head reveal">
          <p className="lp-kicker">What we offer</p>
          <h2 className="lp-h2">Everything you need, in one calm place.</h2>
        </div>
        <div className="lp-services">
          {SERVICES.map(({ Icon, title, desc, to }, i) => (
            <article key={title} className="lp-service reveal"
                     style={{ transitionDelay: `${i * 70}ms` }}>
              <span className="lp-service-icon"><Icon size={22} /></span>
              <h3 className="lp-service-title">{title}</h3>
              <p className="lp-service-desc">{desc}</p>
              <Link to={to} className="lp-service-more">
                Learn more <ArrowUpRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="lp-section lp-section-alt">
      <div className="lp-wrap lp-about">
        <div className="lp-about-media reveal">
          <span className="lp-about-accent" aria-hidden="true" />
          <figure className="lp-about-photo">
            <img src={PHOTOS.about.src} alt={PHOTOS.about.alt} loading="lazy" />
          </figure>
          <div className="lp-about-badge">
            <strong>200+</strong>
            <span>verified counsellors</span>
          </div>
        </div>
        <div className="lp-about-copy reveal">
          <p className="lp-kicker">About Atara</p>
          <h2 className="lp-h2">Real people, trained to sit with the hard parts.</h2>
          <p className="lp-body">
            Every counsellor on Atara is verified before they appear in the directory. You
            can read their specialism and experience, see the exact hours they are free,
            and start a conversation without giving your name.
          </p>
          <div className="lp-skills">
            {SKILLS.map(([label, pct]) => (
              <div key={label} className="lp-skill">
                <div className="lp-skill-top">
                  <span>{label}</span><span>{pct}%</span>
                </div>
                <div className="lp-skill-bar"><span style={{ width: `${pct}%` }} /></div>
              </div>
            ))}
          </div>
          <Link to="/register" className="btn btn-green">
            Browse counsellors <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Process() {
  return (
    <section className="lp-section" id="how">
      <div className="lp-wrap">
        <div className="lp-head reveal">
          <p className="lp-kicker">How it works</p>
          <h2 className="lp-h2">Three steps, and none of them are big.</h2>
        </div>
        <div className="lp-steps">
          {STEPS.map(({ n, title, desc }, i) => (
            <article key={n} className="lp-step reveal" style={{ transitionDelay: `${i * 90}ms` }}>
              <span className="lp-step-n">{n}</span>
              <h3 className="lp-step-title">{title}</h3>
              <p className="lp-step-desc">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsBand() {
  return (
    <section className="lp-band">
      <img src={PHOTOS.band.src} alt="" className="lp-band-bg" loading="lazy" aria-hidden="true" />
      <div className="lp-band-veil" aria-hidden="true" />
      <div className="lp-wrap lp-band-inner">
        {STATS.map(({ value, prefix, suffix, label }) => (
          <div key={label} className="lp-stat">
            <p className="lp-stat-n"><Counter value={value} prefix={prefix} suffix={suffix} /></p>
            <p className="lp-stat-label">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Moments() {
  return (
    <section className="lp-section lp-section-alt" id="moments">
      <div className="lp-wrap">
        <div className="lp-head reveal">
          <p className="lp-kicker">Moments</p>
          <h2 className="lp-h2">What support actually looks like.</h2>
        </div>
        <div className="lp-grid">
          {PHOTOS.moments.map((p, i) => (
            <figure key={p.src} className="lp-tile reveal"
                    style={{ transitionDelay: `${(i % 3) * 80}ms` }}>
              <img src={p.src} alt={p.alt} loading="lazy" />
              <figcaption>
                <span className="lp-tile-tag">{p.tag}</span>
                <span className="lp-tile-arrow"><ArrowUpRight size={17} /></span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stories() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return undefined;
    const id = setInterval(() => setI((n) => (n + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(id);
  }, [paused]);
  const t = TESTIMONIALS[i];
  const go = (d) => setI((n) => (n + d + TESTIMONIALS.length) % TESTIMONIALS.length);

  return (
    <section className="lp-section" id="stories">
      <div className="lp-wrap">
        <div className="lp-head reveal">
          <p className="lp-kicker">Stories</p>
          <h2 className="lp-h2">Small shifts, mostly on ordinary days.</h2>
        </div>
        <div className="lp-quote-wrap reveal"
             onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <Quote size={40} className="lp-quote-mark" aria-hidden="true" />
          <blockquote key={i} className="lp-quote">{t.quote}</blockquote>
          <div className="lp-quote-by">
            <img src={t.photo} alt="" className="lp-quote-face" loading="lazy" />
            <div>
              <p className="lp-quote-name">{t.name}</p>
              <p className="lp-quote-role">{t.role}</p>
            </div>
          </div>
          <div className="lp-quote-nav">
            <button onClick={() => go(-1)} aria-label="Previous story"><ChevronLeft size={17} /></button>
            <div className="lp-dots" role="tablist" aria-label="Choose a story">
              {TESTIMONIALS.map((q, n) => (
                <button key={q.name} className={n === i ? 'is-on' : ''}
                        aria-label={`Story ${n + 1}`} aria-selected={n === i}
                        role="tab" onClick={() => setI(n)} />
              ))}
            </div>
            <button onClick={() => go(1)} aria-label="Next story"><ChevronRight size={17} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="lp-cta">
      <div className="lp-wrap lp-cta-inner">
        <div>
          <h2 className="lp-h2 lp-h2-light">Ready to talk to someone?</h2>
          <p className="lp-cta-sub">
            Free to start, anonymous if you want, and a real person whenever you need one.
          </p>
        </div>
        <div className="lp-cta-actions">
          <Link to="/register" className="btn btn-lime btn-lg">
            Create your free account <ArrowRight size={16} />
          </Link>
          <Link to="/counselor-signup" className="btn btn-ghost-light btn-lg">
            Join as a counsellor
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer-grid">
        <div>
          <Link to="/" className="lp-brand lp-brand-light">
            <img src="/logo-icon.png" alt="" className="lp-brand-mark" />
            <span className="lp-brand-name">Atara</span>
          </Link>
          <p className="lp-footer-blurb">
            A mental health companion — not a replacement for professional care.
            If you are in immediate danger, contact your local emergency number.
          </p>
        </div>
        <div>
          <p className="lp-footer-head">Product</p>
          <Link to="/register">Get started</Link>
          <Link to="/login">Sign in</Link>
          <a href="#services">Services</a>
          <a href="#how">How it works</a>
        </div>
        <div>
          <p className="lp-footer-head">Counsellors</p>
          <Link to="/counselor-signup">Apply to join</Link>
          <Link to="/login">Counsellor sign in</Link>
          <a href="#stories">Client stories</a>
        </div>
        <div>
          <p className="lp-footer-head">In a crisis</p>
          <p className="lp-footer-crisis">
            {CRISIS_LINES.map((l) => (
              <React.Fragment key={l.number}>{l.name}: <strong>{l.number}</strong><br /></React.Fragment>
            ))}
            Outside Ghana, find your country at{' '}
            <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">findahelpline.com</a>.
          </p>
        </div>
      </div>
      <div className="lp-wrap lp-footer-base">
        <p>© {new Date().getFullYear()} Atara. All rights reserved.</p>
        <p>Photography via Pexels.</p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useReveal();

  useEffect(() => {
    if (loading || !user) return;
    const role = user.role || ROLE.USER;
    if (role === ROLE.COUNSELOR || role === ROLE.ADMIN) navigate('/counselor/dashboard', { replace: true });
    else if (role === ROLE.PENDING_COUNSELOR) navigate('/pending-approval', { replace: true });
    else navigate('/dashboard', { replace: true });
  }, [loading, user, navigate]);

  if (loading || user) return null;

  return (
    <div className="lp">
      <TopBar />
      <Header />
      <main>
        <Hero />
        <Services />
        <About />
        <Process />
        <StatsBand />
        <Moments />
        <Stories />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}
