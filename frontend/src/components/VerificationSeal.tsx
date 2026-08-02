/**
 * VerificationSeal — THE signature visual element of Muthirai.
 *
 * A circular engraved seal with a guilloché (sinusoidal security-pattern)
 * ring in brass (#B8894A) line work.
 *
 * Modes:
 *   variant="nav"     → 32px, used in AppShell sidebar + standalone navbars
 *   variant="result"  → 80px, shown on ScoreResultPage when quadrant=on_brand,
 *                       with .animate-seal-settle CSS animation
 *   variant="large"   → 120px, landing / hero use
 *
 * Color context via `tone`:
 *   "brass"    → standard brass ring (default)
 *   "verified" → ring tinted --color-verified for on-brand contexts
 */

interface VerificationSealProps {
  variant?: 'nav' | 'nav-large' | 'result' | 'large'
  tone?: 'brass' | 'verified' | 'oxblood'
  className?: string
  animate?: boolean   // adds animate-seal-settle class
}

// Number of guilloché wave repetitions in the ring
const WAVE_COUNT = 18
const TWO_PI = 2 * Math.PI

/**
 * Build a sinusoidal path around a circle for the guilloché ring.
 * Points are computed in polar coords then converted to cartesian.
 */
function buildGuillocheRingPath(
  cx: number,
  cy: number,
  baseR: number,      // centre radius of the wave band
  amplitude: number,  // wave height
  waveCount: number,
  steps = 360,
): string {
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * TWO_PI
    const r = baseR + amplitude * Math.sin(waveCount * t)
    pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)])
  }
  return (
    `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)} ` +
    pts.slice(1).map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') +
    ' Z'
  )
}

export default function VerificationSeal({
  variant = 'nav',
  tone = 'brass',
  className = '',
  animate = false,
}: VerificationSealProps) {
  const sizes = { nav: 32, 'nav-large': 48, result: 80, large: 120 }
  const size = sizes[variant]
  const cx = size / 2
  const cy = size / 2

  // Ring geometry scales with size
  const outerCircleR = cx - 1.5
  const innerCircleR = cx - (variant.startsWith('nav') ? 6 : 9)
  const guillocheR   = cx - (variant.startsWith('nav') ? 3.5 : 5)
  const amplitude    = variant.startsWith('nav') ? 0.7 : 1.2

  const guillocheWaves = variant.startsWith('nav') ? 14 : WAVE_COUNT
  const guillocheStroke = variant.startsWith('nav') ? 0.4 : 0.55

  // Tone-responsive colours
  const ringColor = tone === 'verified' ? '#2F6F5E' : tone === 'oxblood' ? '#6E1F2B' : '#B8894A'
  const centerColor = tone === 'verified' ? '#2F6F5E' : tone === 'oxblood' ? '#6E1F2B' : '#B8894A'

  // Guilloché path (outer)
  const g1 = buildGuillocheRingPath(cx, cy, guillocheR, amplitude, guillocheWaves)
  // Second, slightly inset path for layered depth
  const g2 = buildGuillocheRingPath(cx, cy, guillocheR - (variant.startsWith('nav') ? 1.2 : 2), amplitude * 0.6, guillocheWaves, 240)

  // Nav variant: just the M lettermark inside
  // Result/large: Tamil lettermark "மு" (short for முத்திரை)
  const centerText  = variant.startsWith('nav') ? 'M' : 'மு'
  const fontSize    = variant.startsWith('nav') ? size * 0.32 : size * 0.26
  const textY       = cy + fontSize * 0.36

  const animClass = animate ? ' animate-seal-settle' : ''

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={`${className}${animClass}`}
      aria-label="Muthirai verification seal"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Outer circle — thin engraved ring */}
      <circle
        cx={cx} cy={cy} r={outerCircleR}
        fill="none"
        stroke={ringColor}
        strokeWidth={variant.startsWith('nav') ? 0.6 : 0.8}
        strokeOpacity={0.7}
      />

      {/* Guilloché wave ring — outer layer */}
      <path
        d={g1}
        fill="none"
        stroke={ringColor}
        strokeWidth={guillocheStroke}
        strokeOpacity={0.55}
      />

      {/* Guilloché wave ring — inner layer (subtle) */}
      <path
        d={g2}
        fill="none"
        stroke={ringColor}
        strokeWidth={guillocheStroke * 0.7}
        strokeOpacity={0.3}
      />

      {/* Inner circle — separates ring band from centre field */}
      <circle
        cx={cx} cy={cy} r={innerCircleR}
        fill="none"
        stroke={ringColor}
        strokeWidth={variant.startsWith('nav') ? 0.5 : 0.7}
        strokeOpacity={0.5}
      />

      {/* Centre mark */}
      <text
        x={cx}
        y={textY}
        textAnchor="middle"
        fontFamily="'Fraunces', Georgia, serif"
        fontSize={fontSize}
        fontWeight={variant.startsWith('nav') ? 600 : 400}
        fill={centerColor}
        fillOpacity={0.9}
      >
        {centerText}
      </text>
    </svg>
  )
}
