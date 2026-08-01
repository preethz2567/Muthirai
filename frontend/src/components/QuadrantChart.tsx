

export interface Point {
  x: number // Consistency (0-1)
  y: number // Distinctiveness (0-1)
}

interface QuadrantChartProps {
  contentScore: Point
  targetScore?: Point // from active trajectory
}

export default function QuadrantChart({ contentScore, targetScore }: QuadrantChartProps) {
  // Chart is 300x300 for calculation
  const SIZE = 300
  
  const toPixels = (p: Point) => ({
    x: p.x * SIZE,
    y: (1 - p.y) * SIZE // Y axis inverted for SVG
  })

  const pContent = toPixels(contentScore)
  
  let pTarget = null
  if (targetScore) {
    pTarget = toPixels(targetScore)
  }

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, margin: '0 auto' }}>
      {/* Background & Grid */}
      <svg width={SIZE} height={SIZE} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(184,134,46,0.2)', borderRadius: 4 }}>
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="rgba(184,134,46,0.5)" />
          </marker>
        </defs>
        
        {/* Axes */}
        <line x1={0} y1={SIZE/2} x2={SIZE} y2={SIZE/2} stroke="rgba(247,241,232,0.1)" strokeWidth="1" />
        <line x1={SIZE/2} y1={0} x2={SIZE/2} y2={SIZE} stroke="rgba(247,241,232,0.1)" strokeWidth="1" />

        {/* Quadrant Labels */}
        <text x="10" y="20" fill="rgba(247,241,232,0.3)" fontSize="10" fontFamily="Inter">Off-Brand (Try Hard)</text>
        <text x={SIZE - 70} y="20" fill="rgba(247,241,232,0.3)" fontSize="10" fontFamily="Inter">On Brand</text>
        <text x="10" y={SIZE - 10} fill="rgba(247,241,232,0.3)" fontSize="10" fontFamily="Inter">Off-Brand (Boring)</text>
        <text x={SIZE - 75} y={SIZE - 10} fill="rgba(247,241,232,0.3)" fontSize="10" fontFamily="Inter">Safe Generic</text>

        {/* Trajectory Arrow (if target exists) */}
        {pTarget && (
          <line
            x1={pContent.x}
            y1={pContent.y}
            x2={pTarget.x}
            y2={pTarget.y}
            stroke="rgba(184,134,46,0.5)"
            strokeWidth="2"
            strokeDasharray="4 4"
            markerEnd="url(#arrowhead)"
          />
        )}

        {/* Content Marker (Maroon) */}
        <circle cx={pContent.x} cy={pContent.y} r="6" fill="#7A1F2B" stroke="#F7F1E8" strokeWidth="2" />
        
        {/* Target Marker (Gold) */}
        {pTarget && (
          <g>
            <circle cx={pTarget.x} cy={pTarget.y} r="6" fill="#B8862E" stroke="#F7F1E8" strokeWidth="2" />
            <text x={pTarget.x + 10} y={pTarget.y + 4} fill="#E8C87A" fontSize="12" fontFamily="Inter" fontWeight="bold">Target</text>
          </g>
        )}
      </svg>
      
      {/* Axis Labels outside SVG for layout simplicity */}
      <div style={{ position: 'absolute', bottom: -25, left: '50%', transform: 'translateX(-50%)', fontSize: '0.75rem', color: 'rgba(247,241,232,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Consistency →
      </div>
      <div style={{ position: 'absolute', top: '50%', left: -30, transform: 'translateY(-50%) rotate(-90deg)', fontSize: '0.75rem', color: 'rgba(247,241,232,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Distinctiveness →
      </div>
    </div>
  )
}
