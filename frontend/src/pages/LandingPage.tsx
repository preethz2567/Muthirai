import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import SealLogo from '../components/SealLogo'
import QuadrantChart from '../components/QuadrantChart'
import ParticleSealCanvas from '../components/ParticleSealCanvas'

export default function LandingPage() {
  const navigate = useNavigate()

  // Stagger variants for the hero content
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#141110] text-(--color-parchment) font-sans selection:bg-(--color-gold) selection:text-[#141110]">
      
      {/* ── Nav bar ── */}
      <nav className="flex items-center justify-between px-8 py-4 bg-(--color-parchment) border-b border-[rgba(184,134,46,0.3)] sticky top-0 z-50 text-(--color-ink)">
        <div className="flex items-center gap-3">
          <SealLogo size="small" className="text-(--color-maroon)" />
          <span className="text-xl font-serif font-bold tracking-widest uppercase text-(--color-maroon)">
            Muthirai
          </span>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-sm font-semibold hover:text-(--color-maroon) transition-colors">
            Sign In
          </button>
          <button
            onClick={() => navigate('/setup')}
            className="text-sm font-bold bg-(--color-maroon) text-(--color-parchment) px-5 py-2 rounded transition-transform hover:-translate-y-[1px] hover:shadow-md"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <main className="relative min-h-[calc(100vh-73px)] flex flex-col justify-center items-center lg:items-start lg:pl-[10%] px-6 py-20 overflow-hidden">
        
        {/* Canvas Background */}
        <ParticleSealCanvas />

        {/* Hero Content */}
        <motion.div 
          className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left max-w-2xl gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants}>
            <span className="font-mono text-[10px] sm:text-xs font-bold tracking-widest text-(--color-gold) uppercase px-3 py-1.5 bg-white/5 rounded border border-(--color-gold)/30 backdrop-blur-sm">
              Brand Intelligence Division
            </span>
          </motion.div>

          <motion.h1 
            variants={itemVariants}
            className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-white"
          >
            Every Brand Has A <br className="hidden sm:block"/>
            <em className="text-(--color-gold) italic font-serif">Seal.</em>
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="text-lg sm:text-xl text-gray-400 font-sans leading-relaxed max-w-lg"
          >
            Muthirai validates whether your AI-generated content still carries it.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-4">
            <button
              onClick={() => navigate('/setup')}
              className="bg-(--color-gold) text-[#141110] px-8 py-3.5 rounded font-bold text-[1.05rem] hover:bg-(--color-gold)/90 transition-all shadow-[0_0_20px_rgba(184,134,46,0.3)] hover:shadow-[0_0_30px_rgba(184,134,46,0.5)]"
            >
              Get Started
            </button>
            <button className="border border-white/30 text-white px-8 py-3.5 rounded font-semibold text-[1.05rem] hover:bg-white/10 transition-colors">
              See How It Works
            </button>
          </motion.div>
        </motion.div>
      </main>

      {/* ── Below Hero: Brand Console Preview ── */}
      <section className="bg-(--color-parchment) text-(--color-ink) relative z-20 py-32 px-6">
        <motion.div 
          className="max-w-5xl mx-auto flex flex-col items-center gap-16"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center max-w-2xl">
            <h2 className="font-serif text-4xl font-bold mb-4">Precision Scoring Engine</h2>
            <p className="text-gray-600">
              Instantly plot any piece of content on the two axes of brand intelligence: 
              Consistency to your voice, and Distinctiveness from the category norm.
            </p>
          </div>

          <div className="w-full relative shadow-2xl rounded-xl border border-(--color-sandal) bg-(--color-parchment) overflow-hidden max-w-3xl">
            {/* Header bar */}
            <div className="bg-(--color-ink) text-(--color-parchment) flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="font-mono text-xs ml-4 tracking-widest text-(--color-sandal) opacity-80">
                  BRAND CONSOLE
                </span>
              </div>
              <div className="flex gap-4 font-mono text-[10px] text-(--color-sandal) opacity-60">
                <span className="text-(--color-parchment) opacity-100 border-b border-(--color-gold) pb-1">SCORING</span>
                <span>TRAJECTORY</span>
                <span>IDENTITY</span>
              </div>
            </div>

            {/* Content area */}
            <div className="p-6 md:p-8 bg-white/50 flex flex-col gap-8">
              <div className="h-[300px] w-full border border-(--color-sandal) rounded-lg bg-white p-2">
                <QuadrantChart 
                  contentScore={{ x: 0.82, y: 0.74 }}
                  targetScore={{ x: 0.90, y: 0.85 }} 
                />
              </div>

              {/* Data readouts */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-(--color-ink) rounded-md p-5 flex flex-col">
                  <span className="font-mono text-xs text-(--color-sandal) mb-2 opacity-80 tracking-wider">CONSISTENCY</span>
                  <span className="font-mono text-3xl text-green-400 font-bold">0.82</span>
                </div>
                <div className="bg-(--color-ink) rounded-md p-5 flex flex-col">
                  <span className="font-mono text-xs text-(--color-sandal) mb-2 opacity-80 tracking-wider">DISTINCTIVENESS</span>
                  <span className="font-mono text-3xl text-(--color-gold) font-bold">0.74</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

    </div>
  )
}
