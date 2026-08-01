

interface SealLogoProps {
  size?: 'small' | 'large';
  className?: string;
}

export default function SealLogo({ size = 'large', className = '' }: SealLogoProps) {
  const dimensions = size === 'small' ? 40 : 120;
  
  // The subtle -3deg rotation and a rough textured look
  return (
    <div 
      className={`inline-flex items-center justify-center text-maroon ${className}`}
      style={{
        transform: 'rotate(-3deg)',
        width: dimensions,
        height: dimensions
      }}
    >
      <svg 
        viewBox="0 0 100 100" 
        width="100%" 
        height="100%" 
        xmlns="http://www.w3.org/2000/svg"
        className="fill-current"
        style={{ filter: 'url(#stamp-texture)' }}
      >
        <defs>
          <filter id="stamp-texture">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 7 -3" in="noise" result="coloredNoise" />
            <feComposite operator="in" in="SourceGraphic" in2="coloredNoise" result="composite1" />
            <feComposite operator="in" in="SourceGraphic" in2="composite1" result="final" />
          </filter>
        </defs>

        {/* Outer Ring */}
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 1 5 1 6 0 5 1" />
        
        {/* Inner Ring */}
        <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 1 4 0.5 5 1" />
        
        {/* Center Text */}
        <text 
          x="50" 
          y="56" 
          textAnchor="middle" 
          fontSize="18" 
          fontWeight="bold"
          fontFamily="system-ui, sans-serif" 
        >
          முத்திரை
        </text>
      </svg>
    </div>
  );
}
