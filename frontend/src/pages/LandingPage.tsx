import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const DISPLAY_FONT = '"Space Grotesk", sans-serif'
const HEADING_FONT = '"Space Grotesk", sans-serif'
const BODY_FONT = '"Inter", sans-serif'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', fontFamily: BODY_FONT }}>
      
      {/* 1. Hero Section */}
      <section style={{ position: 'relative', height: '100vh', width: '100%', overflow: 'hidden', backgroundColor: '#0D1117' }}>
        
        {/* Video Background with Fallback */}
        <video 
          autoPlay 
          muted 
          loop 
          playsInline 
          poster="/landing-poster.jpg"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} 
        >
          <source src="/landing-bg.mp4" type="video/mp4" />
        </video>
        
        {/* Dark Gradient Overlay */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(13,17,23,0.5), rgba(13,17,23,0.85))', zIndex: 1 }} />

        {/* Hero Content */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          
          {/* Top Nav (staggered fade-in) */}
          <motion.nav 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.0, duration: 0.8, ease: 'easeOut' }}
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '2rem 4rem' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                width: 32, 
                height: 32, 
                borderRadius: '50%', 
                background: 'var(--maroon)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
                  <path d="M12 6c-3.31 0-6 2.69-6 6"></path>
                  <path d="M12 10c-1.1 0-2 .9-2 2"></path>
                </svg>
              </div>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#FFFFFF', fontFamily: DISPLAY_FONT, letterSpacing: '0.05em' }}>முத்திரை</span>
              <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.7)', marginLeft: '0.5rem', fontFamily: DISPLAY_FONT }}>
                ENTERPRISE VOICE
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <nav style={{ display: 'flex', gap: '1.5rem' }}>
                {['Platform', 'Solutions', 'Pricing', 'Resources'].map(link => (
                  <a key={link} href="#" style={{ color: '#FFFFFF', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, opacity: 0.9 }}>{link}</a>
                ))}
              </nav>
              <button 
                onClick={() => navigate('/setup')}
                style={{ 
                  background: 'transparent', 
                  border: '1px solid rgba(255,255,255,0.3)', 
                  color: '#FFFFFF', 
                  padding: '0.5rem 1.25rem', 
                  borderRadius: 6, 
                  fontSize: '0.875rem', 
                  fontWeight: 600, 
                  cursor: 'pointer' 
                }}
              >
                Sign In
              </button>
            </div>
          </motion.nav>

          {/* Main Hero Center */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 2rem' }}>
            
            {/* SVG Seal Impact Animation */}
            <motion.div
              initial={{ scale: 1.15, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
              style={{ position: 'relative', width: 180, height: 180, marginBottom: '2rem' }}
            >
              {/* Glow Flash */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 1.4] }}
                transition={{ delay: 1.1, duration: 0.6, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '100%',
                  height: '100%',
                  transform: 'translate(-50%, -50%)',
                  background: 'radial-gradient(circle, rgba(227,179,65,0.8) 0%, rgba(227,179,65,0) 70%)',
                  zIndex: -1,
                  borderRadius: '50%'
                }}
              />
              
              {/* SVG Graphic */}
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r="85" fill="none" stroke="#E3B341" strokeWidth="2" />
                <circle cx="90" cy="90" r="75" fill="none" stroke="#E3B341" strokeWidth="6" opacity="0.9" />
                <text x="90" y="98" fill="#E3B341" fontSize="28" fontWeight="bold" fontFamily={DISPLAY_FONT} textAnchor="middle" letterSpacing="0.05em">முத்திரை</text>
              </svg>
            </motion.div>

            {/* Headline and Subtext (staggered fade-in) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.8, ease: 'easeOut' }}
              style={{ maxWidth: 800 }}
            >
              <h1 style={{ fontFamily: HEADING_FONT, fontSize: '4.5rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
                Your Brand Voice.<br />Mathematically Guaranteed.
              </h1>
              <p style={{ fontFamily: BODY_FONT, fontSize: '1.25rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: 600, margin: '0 auto 2.5rem' }}>
                Muthirai enforces absolute consistency across your entire enterprise by mathematically scoring content against your unique identity vector.
              </p>
              <button 
                onClick={() => navigate('/setup')}
                style={{ 
                  background: 'var(--maroon)', 
                  color: '#FFFFFF', 
                  padding: '1.125rem 2.5rem', 
                  borderRadius: 8, 
                  fontSize: '1.125rem', 
                  fontWeight: 600, 
                  border: 'none', 
                  cursor: 'pointer',
                  fontFamily: BODY_FONT,
                  boxShadow: '0 4px 14px rgba(196, 72, 92, 0.4)'
                }}
              >
                Initialize Brand Engine
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. Platform Value Props */}
      <main style={{ flex: 1 }}>
        <section style={{ padding: '6rem 2rem', background: 'var(--bg)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <h2 style={{ fontFamily: HEADING_FONT, fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '-0.01em' }}>
                The Engine of Consistency
              </h2>
              <p style={{ fontFamily: BODY_FONT, fontSize: '1.125rem', color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto' }}>
                Stop relying on subjective guidelines. Deploy an intelligent engine that mathematically scores and corrects your brand voice.
              </p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
              {[
                {
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--maroon)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>,
                  title: 'Build Brand Identity',
                  desc: 'Extract your brand\'s unique tone, vocabulary, and values into a centralized Identity Card.'
                },
                {
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--maroon)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
                  title: 'Validate AI Content',
                  desc: 'Score any content for consistency and distinctiveness against your brand baseline.'
                },
                {
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--maroon)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>,
                  title: 'Rewrite in Brand Voice',
                  desc: 'Automatically rewrite off-brand passages to align perfectly with your approved voice.'
                }
              ].map(card => (
                <div key={card.title} style={{ padding: '2.5rem', background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(122,31,43,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    {card.icon}
                  </div>
                  <h3 style={{ fontFamily: HEADING_FONT, fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>{card.title}</h3>
                  <p style={{ fontFamily: BODY_FONT, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>{card.desc}</p>
                  <a href="#" style={{ color: 'var(--maroon)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontFamily: BODY_FONT }}>
                    Learn more <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. "Trusted by" Strip */}
        <section style={{ padding: '4rem 2rem', background: 'transparent', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
            <h4 style={{ fontFamily: DISPLAY_FONT, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '2rem' }}>Trusted by Modern Marketing Teams</h4>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem', opacity: 0.45, flexWrap: 'wrap' }}>
              {['ACME CORP', 'GLOBAL MEDIA', 'TECHSTART', 'HORIZON', 'VERTEX'].map(brand => (
                <span key={brand} style={{ fontFamily: DISPLAY_FONT, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>{brand}</span>
              ))}
            </div>
          </div>
        </section>

        {/* 5. CTA Band */}
        <section style={{ padding: '6rem 2rem', background: 'var(--maroon)', textAlign: 'center' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <h2 style={{ fontFamily: HEADING_FONT, fontSize: '3rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '1rem', letterSpacing: '-0.01em' }}>Ready to secure your voice?</h2>
            <p style={{ fontFamily: BODY_FONT, fontSize: '1.125rem', color: 'rgba(255,255,255,0.8)', marginBottom: '2.5rem' }}>Join the platform that guarantees AI consistency across all your enterprise communications.</p>
            <button 
              onClick={() => navigate('/setup')}
              style={{ 
                fontFamily: BODY_FONT,
                padding: '1rem 2.5rem', 
                fontSize: '1rem', 
                fontWeight: 600, 
                background: '#FFFFFF', 
                color: 'var(--maroon)', 
                border: 'none', 
                borderRadius: 8, 
                cursor: 'pointer' 
              }}>
              Start Your Trial
            </button>
          </div>
        </section>
      </main>

      {/* 6. Footer */}
      <footer style={{ padding: '2rem', background: 'var(--card)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: DISPLAY_FONT, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>முத்திரை</span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {['Privacy Policy', 'Terms of Service', 'Contact'].map(link => (
              <a key={link} href="#" style={{ fontFamily: BODY_FONT, color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>{link}</a>
            ))}
          </div>
          <div style={{ fontFamily: BODY_FONT, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            &copy; {new Date().getFullYear()} Muthirai. All rights reserved.
          </div>
        </div>
      </footer>
      
    </div>
  )
}
