import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const WORKER_BASE = import.meta.env.VITE_WORKER_URL ?? 'http://localhost:8001'

type ServiceHealth = {
  name: string
  url: string
  status: 'checking' | 'ok' | 'error'
  label: string
}

const SERVICES: ServiceHealth[] = [
  { name: 'API',          url: `${API_BASE}/health`,    status: 'checking', label: ':8000' },
  { name: 'Agent Worker', url: `${WORKER_BASE}/health`, status: 'checking', label: ':8001' },
  { name: 'Frontend',     url: '',                      status: 'ok',       label: ':5173' },
]

function StatusDot({ status }: { status: ServiceHealth['status'] }) {
  const base = 'w-2.5 h-2.5 rounded-full inline-block mr-2'
  if (status === 'ok')       return <span className={`${base} bg-emerald-400 animate-pulse`} />
  if (status === 'error')    return <span className={`${base} bg-red-500`} />
  return <span className={`${base} bg-yellow-400 animate-spin`} />
}

export default function App() {
  const [services, setServices] = useState<ServiceHealth[]>(SERVICES)

  useEffect(() => {
    SERVICES.forEach((svc, idx) => {
      if (!svc.url) return
      fetch(svc.url)
        .then(r => r.ok ? 'ok' : 'error')
        .catch(() => 'error')
        .then(status => {
          setServices(prev =>
            prev.map((s, i) => i === idx ? { ...s, status: status as 'ok' | 'error' } : s)
          )
        })
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-12"
         style={{ background: 'linear-gradient(135deg, #0f1117 0%, #1a1d27 50%, #0f1117 100%)' }}>

      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #6c63ff, #00d4aa)' }}>
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Muthirai</h1>
        </div>
        <p className="text-lg max-w-md" style={{ color: '#8b8fa8' }}>
          A three-service AI monorepo — React frontend, FastAPI REST layer, and a stateless agent-worker.
        </p>
      </div>

      {/* Service Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {services.map(svc => (
          <div key={svc.name}
               className="rounded-2xl p-5 flex flex-col gap-3 transition-transform hover:-translate-y-1"
               style={{ background: '#1a1d27', border: '1px solid #2a2d3a' }}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">{svc.name}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                    style={{ background: '#0f1117', color: '#8b8fa8' }}>{svc.label}</span>
            </div>
            <div className="flex items-center text-sm" style={{ color: '#8b8fa8' }}>
              <StatusDot status={svc.status} />
              {svc.status === 'ok'       && <span className="text-emerald-400">Healthy</span>}
              {svc.status === 'error'    && <span className="text-red-400">Unreachable</span>}
              {svc.status === 'checking' && <span className="text-yellow-400">Checking…</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="flex gap-4 flex-wrap justify-center">
        {[
          { label: 'API Docs', href: `${API_BASE}/docs` },
          { label: 'Worker Docs', href: `${WORKER_BASE}/docs` },
          { label: 'GitHub', href: '#' },
        ].map(link => (
          <a key={link.label} href={link.href} target="_blank" rel="noreferrer"
             className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90"
             style={{ background: 'linear-gradient(135deg, #6c63ff22, #00d4aa22)',
                      border: '1px solid #6c63ff55', color: '#a09bff' }}>
            {link.label} ↗
          </a>
        ))}
      </div>

      <p className="text-xs" style={{ color: '#4a4d60' }}>
        docker compose up --build · All services on muthirai-net
      </p>
    </div>
  )
}
