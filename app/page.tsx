'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Layers, Zap, MousePointer2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabaseClient';
import { AddProjectModal } from '@/components/projectDialog';
import { toast } from 'sonner';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI-Powered Generation',
    desc: 'Describe any UI in plain English. Get pixel-perfect screens in seconds.',
  },
  {
    icon: Layers,
    title: 'Infinite Canvas',
    desc: 'Lay out every screen side by side. See the full picture at once.',
  },
  {
    icon: MousePointer2,
    title: 'Visual Element Editor',
    desc: 'Click any element to inspect and edit styles — no code required.',
  },
  {
    icon: Zap,
    title: 'Instant Iterations',
    desc: 'Prompt changes, apply them live. Ship ideas faster than ever.',
  },
];

const STEPS = [
  { n: '01', title: 'Describe', desc: 'Type what you want to build — a dashboard, onboarding flow, settings page, anything.' },
  { n: '02', title: 'Generate', desc: 'mockIt produces a fully-styled, responsive screen in seconds using your description.' },
  { n: '03', title: 'Refine', desc: 'Click elements to edit, prompt tweaks, or dive into the HTML — full control, always.' },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  useEffect(() => {
    const els = [document.documentElement, document.body];
    const main = document.querySelector('main') as HTMLElement | null;
    els.forEach(el => { el.style.overflow = 'auto'; el.style.height = 'auto'; el.style.scrollbarWidth = 'none'; });
    if (main) { main.style.overflow = 'auto'; main.style.height = 'auto'; main.style.scrollbarWidth = 'none'; }
    return () => {
      els.forEach(el => { el.style.overflow = ''; el.style.height = ''; });
      if (main) { main.style.overflow = ''; main.style.height = ''; }
    };
  }, []);

  const handleStart = async () => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    // Check for existing projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }

    if (projects && projects.length > 0) {
      router.push(`/projects/${projects[0].id}`);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleAddProject = async (name: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ name, user_id: user.id, content: {}, processing: false }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        toast.success(`"${name}" created`);
        router.push(`/projects/${data.id}`);
      }
      setIsModalOpen(false);
    } catch {
      toast.error('Failed to create project');
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{
        background: '#080810',
        fontFamily: "'DM Sans', sans-serif",
        color: '#e8e8f0',
      }}
    >
      {/* Google font */}
      <style>{`
        html, body, main { scrollbar-width: none !important; }
        html::-webkit-scrollbar, body::-webkit-scrollbar, main::-webkit-scrollbar { display: none !important; }

        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,300&family=Instrument+Serif:ital@0;1&display=swap');

        .hero-title { font-family: 'Instrument Serif', serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) both; }
        .d1 { animation-delay: 0.05s }
        .d2 { animation-delay: 0.15s }
        .d3 { animation-delay: 0.25s }
        .d4 { animation-delay: 0.38s }

        @keyframes gridPulse {
          0%,100% { opacity: 0.025; }
          50%      { opacity: 0.055; }
        }

        .grid-bg {
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: gridPulse 6s ease-in-out infinite;
        }

        .cta-btn {
          position: relative;
          overflow: hidden;
          background: #fff;
          color: #080810;
          border: none;
          border-radius: 9999px;
          padding: 14px 32px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          letter-spacing: -0.01em;
        }
        .cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(255,255,255,0.18);
        }
        .cta-btn:active { transform: translateY(0); }

        .ghost-btn {
          background: transparent;
          color: rgba(255,255,255,0.5);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 9999px;
          padding: 13px 28px;
          font-size: 15px;
          font-weight: 400;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.18s ease;
          font-family: 'DM Sans', sans-serif;
        }
        .ghost-btn:hover {
          border-color: rgba(255,255,255,0.25);
          color: rgba(255,255,255,0.85);
        }

        .feature-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 28px;
          transition: all 0.2s ease;
        }
        .feature-card:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.12);
          transform: translateY(-2px);
        }

        .step-num {
          font-family: 'Instrument Serif', serif;
          font-size: 64px;
          line-height: 1;
          color: rgba(255,255,255,0.06);
          position: absolute;
          top: -8px;
          left: 24px;
          pointer-events: none;
          user-select: none;
        }

        .noise {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 100;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-size: 128px;
        }

        .glow-orb {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          transition: transform 0.8s cubic-bezier(.22,1,.36,1);
          filter: blur(80px);
        }
      `}</style>

      {/* Noise overlay */}
      <div className="noise" />

      {/* Mouse glow */}
      <div
        className="glow-orb"
        style={{
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(120,80,255,0.12) 0%, transparent 70%)',
          left: mousePos.x - 250,
          top: mousePos.y - 250,
          transition: 'left 0.6s cubic-bezier(.22,1,.36,1), top 0.6s cubic-bezier(.22,1,.36,1)',
        }}
      />

      {/* Grid background */}
      <div className="grid-bg absolute inset-0 pointer-events-none" />

      {/* Nav */}
      <nav
        className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, letterSpacing: '-0.02em', color: '#fff' }}>
          mock<span style={{ color: 'rgba(255,255,255,0.35)' }}>It</span>
        </div>
        <button className="ghost-btn" onClick={handleStart} style={{ fontSize: 13, padding: '9px 20px' }}>
          {(!loading && user) ? 'Dashboard' : 'Sign in'}
        </button>
      </nav>

      {/* Hero */}
      <section
        ref={heroRef}
        className="relative z-10 flex flex-col items-center justify-center text-center px-6"
        style={{ paddingTop: '10vh', paddingBottom: '10vh', minHeight: '88vh' }}
      >
        {/* Badge */}
        {visible && (
          <div
            className="fade-up d1 mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c5cfc', display: 'inline-block' }} />
            AI UI Generator — Now in Beta
          </div>
        )}

        {/* Title */}
        {visible && (
          <h1
            className="hero-title fade-up d2"
            style={{
              fontSize: 'clamp(48px, 8vw, 96px)',
              fontWeight: 400,
              lineHeight: 1.0,
              letterSpacing: '-0.03em',
              color: '#fff',
              maxWidth: 900,
              margin: '0 auto 24px',
            }}
          >
            Design UIs at the
            <br />
            <span style={{ color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>speed of thought</span>
          </h1>
        )}

        {/* Subtitle */}
        {visible && (
          <p
            className="fade-up d3"
            style={{
              fontSize: 'clamp(15px, 2vw, 18px)',
              color: 'rgba(255,255,255,0.4)',
              maxWidth: 480,
              margin: '0 auto 44px',
              lineHeight: 1.65,
              fontWeight: 300,
            }}
          >
            Describe any screen, get production-ready HTML in seconds.
            Edit visually, iterate instantly — on an infinite canvas.
          </p>
        )}

        {/* CTAs */}
        {visible && (
          <div className="fade-up d4 flex flex-col items-center justify-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button className="cta-btn" onClick={handleStart}>
                Start creating
                <ArrowRight size={16} />
              </button>
              <button className="ghost-btn" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>
                See how it works
              </button>
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,160,122,0.8)',
                background: 'rgba(255,160,122,0.1)',
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,160,122,0.2)',
                marginTop: 8,
                textAlign: 'center'
              }}
            >
              Notice: We are currently using a Free tier Groq API key, generation times may be hindered or subject to rate limits.
            </div>
          </div>
        )}

        {/* Floating screen mockup */}
        {visible && (
          <div
            className="fade-up"
            style={{
              animationDelay: '0.5s',
              marginTop: '72px',
              width: '100%',
              maxWidth: 820,
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              overflow: 'hidden',
              boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
            }}
          >
            {/* Fake titlebar */}
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,80,80,0.6)' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,200,50,0.6)' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(50,200,80,0.6)' }} />
              <span style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
                mockIt canvas
              </span>
            </div>
            {/* Fake canvas */}
            <div
              style={{
                height: 340,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 24,
                padding: 24,
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            >
              {[
                { w: 160, h: 280, label: 'Home', delay: 0 },
                { w: 160, h: 240, label: 'Profile', delay: 0.1 },
                { w: 160, h: 260, label: 'Settings', delay: 0.2 },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    width: s.w,
                    height: s.h,
                    borderRadius: 12,
                    border: i === 0 ? '1.5px solid rgba(124,92,252,0.6)' : '1px solid rgba(255,255,255,0.08)',
                    background: i === 0 ? 'rgba(124,92,252,0.08)' : 'rgba(255,255,255,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxShadow: i === 0 ? '0 0 30px rgba(124,92,252,0.15)' : 'none',
                  }}
                >
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {s.label}
                  </div>
                  <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[0.6, 0.4, 0.5, 0.3].map((op, j) => (
                      <div key={j} style={{ height: 8, borderRadius: 4, background: `rgba(255,255,255,${op * 0.12})`, width: `${60 + j * 10}%` }} />
                    ))}
                    <div style={{ marginTop: 4, height: 32, borderRadius: 8, background: i === 0 ? 'rgba(124,92,252,0.3)' : 'rgba(255,255,255,0.06)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 md:px-12 py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>
            Features
          </p>
          <h2 className="hero-title" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 400, color: '#fff', marginBottom: 52, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Everything you need to<br />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>move fast</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card">
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 10, marginBottom: 18,
                    background: 'rgba(124,92,252,0.15)',
                    border: '1px solid rgba(124,92,252,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <f.icon size={16} style={{ color: '#a07cfc' }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 px-6 md:px-12 py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>
            How it works
          </p>
          <h2 className="hero-title" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 400, color: '#fff', marginBottom: 52, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Three steps to your<br />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>next great idea</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {STEPS.map((s, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  padding: '32px 28px 32px 28px',
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)',
                  overflow: 'hidden',
                  marginBottom: 8,
                }}
              >
                <div className="step-num">{s.n}</div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                  <div style={{ paddingTop: 2 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 8, letterSpacing: '-0.01em' }}>{s.title}</h3>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.65, maxWidth: 500, margin: 0 }}>{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="relative z-10 px-6 md:px-12 py-32 text-center"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <h2
          className="hero-title"
          style={{
            fontSize: 'clamp(40px, 7vw, 80px)',
            fontWeight: 400,
            color: '#fff',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            marginBottom: 32,
          }}
        >
          Ready to build?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)', marginBottom: 40, fontWeight: 300 }}>
          No credit card required. Start for free.
        </p>
        <button className="cta-btn" onClick={handleStart} style={{ fontSize: 16, padding: '16px 40px' }}>
          Start creating
          <ArrowRight size={17} />
        </button>
      </section>

      {/* Footer */}
      <footer
        className="relative z-10 px-6 md:px-12 py-8 flex items-center justify-between"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 13, color: 'rgba(255,255,255,0.2)' }}
      >
        <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: 16, color: 'rgba(255,255,255,0.3)' }}>mockIt</span>
        <span>© {new Date().getFullYear()} mockIt. All rights reserved.</span>
      </footer>

      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddProject}
      />
    </div>
  );
}