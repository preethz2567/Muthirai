import { useEffect, useRef } from 'react';

// Math/Geometry helpers
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
const distance = (x1: number, y1: number, x2: number, y2: number) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  targetX: number;
  targetY: number;
  forming: boolean;
}

export default function ParticleSealCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const NUM_PARTICLES = 75;
    const COLORS = ['#7A1F2B', '#B8862E']; // maroon, gold
    
    // State machine
    let state: 'DRIFTING' | 'FORMING' | 'HOLDING' | 'DISPERSING' = 'DRIFTING';
    let lastStateChangeTime = performance.now();
    
    // Timings
    const DRIFT_DURATION = 6000;
    const FORMING_DURATION = 2000;
    const HOLD_DURATION = 2000;

    // Mouse tracking
    let mouse = { x: -1000, y: -1000 };
    const MOUSE_RADIUS = 150;
    const REPULSION_STRENGTH = 0.5;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const generateSealTargets = () => {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      // Adjust center slightly to the right to balance the layout if desired, 
      // but centering is safer for full-screen background
      const radius = Math.min(canvas.width, canvas.height) * 0.25;

      particles.forEach((p, i) => {
        // Outline of a circle, maybe some inner points
        if (i < NUM_PARTICLES * 0.8) {
          // 80% on the outer ring
          const angle = (i / (NUM_PARTICLES * 0.8)) * Math.PI * 2;
          // Add slight noise to make it look like an imperfect stamp
          const rNoise = randomRange(-5, 5);
          p.targetX = centerX + Math.cos(angle) * (radius + rNoise);
          p.targetY = centerY + Math.sin(angle) * (radius + rNoise);
        } else {
          // 20% on an inner ring or random interior
          const angle = randomRange(0, Math.PI * 2);
          const innerRadius = radius * randomRange(0.6, 0.8);
          p.targetX = centerX + Math.cos(angle) * innerRadius;
          p.targetY = centerY + Math.sin(angle) * innerRadius;
        }
      });
    };

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < NUM_PARTICLES; i++) {
        particles.push({
          x: randomRange(0, canvas.width),
          y: randomRange(0, canvas.height),
          vx: randomRange(-0.5, 0.5),
          vy: randomRange(-0.5, 0.5),
          radius: randomRange(1, 2.5),
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          targetX: 0,
          targetY: 0,
          forming: false
        });
      }
      generateSealTargets();
    };

    const draw = (time: number) => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // State machine logic
      const elapsed = time - lastStateChangeTime;
      
      if (state === 'DRIFTING' && elapsed > DRIFT_DURATION) {
        state = 'FORMING';
        lastStateChangeTime = time;
        generateSealTargets(); // regenerate based on current window size
      } else if (state === 'FORMING' && elapsed > FORMING_DURATION) {
        state = 'HOLDING';
        lastStateChangeTime = time;
      } else if (state === 'HOLDING' && elapsed > HOLD_DURATION) {
        state = 'DRIFTING';
        lastStateChangeTime = time;
        // Give them a little kick when dispersing
        particles.forEach(p => {
          p.vx = randomRange(-1, 1);
          p.vy = randomRange(-1, 1);
        });
      }

      const progress = state === 'FORMING' ? Math.min(elapsed / FORMING_DURATION, 1) : 1;
      // Spring/easing (easeOutCubic)
      const ease = 1 - Math.pow(1 - progress, 3);

      particles.forEach(p => {
        if (state === 'DRIFTING' || state === 'DISPERSING') {
          // Normal drift
          p.x += p.vx;
          p.y += p.vy;

          // Bounce off walls
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
          
          // Constrain
          p.x = Math.max(0, Math.min(canvas.width, p.x));
          p.y = Math.max(0, Math.min(canvas.height, p.y));
        } else {
          // Forming or Holding: interpolate to target
          // Use ease for smooth forming
          p.x += (p.targetX - p.x) * (0.05 * ease);
          p.y += (p.targetY - p.y) * (0.05 * ease);
        }

        // Mouse Repulsion
        const dist = distance(mouse.x, mouse.y, p.x, p.y);
        if (dist < MOUSE_RADIUS) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
          const dx = (p.x - mouse.x) / dist;
          const dy = (p.y - mouse.y) / dist;
          
          // Apply repulsion
          p.x += dx * force * REPULSION_STRENGTH * 5;
          p.y += dy * force * REPULSION_STRENGTH * 5;
          
          // Alter velocity slightly if drifting
          if (state === 'DRIFTING') {
            p.vx += dx * force * 0.1;
            p.vy += dy * force * 0.1;
            // Cap speed
            const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
            if (speed > 1.5) {
              p.vx = (p.vx / speed) * 1.5;
              p.vy = (p.vy / speed) * 1.5;
            }
          }
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        
        // Add a slight glow/blur effect based on state
        ctx.shadowBlur = state === 'HOLDING' ? 10 : 2;
        ctx.shadowColor = p.color;
        
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
