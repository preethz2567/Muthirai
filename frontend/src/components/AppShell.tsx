import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useParams, useNavigate, useLocation } from 'react-router-dom'
import { getBrand, getBrands, type BrandListOut } from '../lib/api'
import VerificationSeal from './VerificationSeal'

// Simple SVG Icons
const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
)

const IconIdentity = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const IconValidation = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
)

const IconDrift = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
)

const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

const IconHelp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const IconCompass = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
)

export default function AppShell() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const brandId = id || 'draft'
  
  const [brandName, setBrandName] = useState('Acme Corp')
  const [brands, setBrands] = useState<BrandListOut[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync click outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Fetch all brands
  useEffect(() => {
    let mounted = true
    getBrands().then(data => {
      if (mounted) setBrands(data)
    }).catch(err => {
      console.warn("Failed to load brands list", err)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    if (brandId && brandId !== 'draft') {
      localStorage.setItem('muthirai_brand_id', brandId)
      getBrand(brandId).then(data => {
        if (mounted && data.name) {
          setBrandName(data.name)
        }
      }).catch(err => {
        console.warn("Failed to load brand name for AppShell", err)
      })
    }
    return () => { mounted = false }
  }, [brandId])

  const handleBrandSwitch = (newBrandId: string) => {
    setIsDropdownOpen(false)
    if (newBrandId === brandId) return
    localStorage.setItem('muthirai_brand_id', newBrandId)
    // Replace the current brandId in the path with newBrandId
    const newPath = location.pathname.replace(`/brands/${brandId}`, `/brands/${newBrandId}`)
    navigate(newPath)
  }

  const navItems = [
    { name: 'Dashboard', path: `/brands/${brandId}/dashboard`, icon: <IconDashboard /> },
    { name: 'Brand Identity', path: `/brands/${brandId}/review`, icon: <IconIdentity /> },
    { name: 'Validation', path: `/brands/${brandId}/score`, icon: <IconValidation /> },
    { name: 'Drift Analytics', path: `/brands/${brandId}/drift`, icon: <IconDrift /> },
    { name: 'Trajectory Compass', path: `/brands/${brandId}/compass`, icon: <IconCompass /> },
    { name: 'Settings', path: `/brands/${brandId}/settings`, icon: <IconSettings /> },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-ink)', fontFamily: 'var(--font-sans)' }}>
      {/* Left Sidebar */}
      <aside style={{ 
        width: '260px', 
        background: 'var(--color-surface)', 
        borderRight: '1px solid var(--color-border)', 
        display: 'flex', 
        flexDirection: 'column' 
      }}>
        {/* Brand Header */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
          <VerificationSeal variant="nav" tone="brass" />
          <span style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em', color: 'var(--color-text-primary)' }}>Muthirai</span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '1rem 0.5rem' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.55rem 1rem',
                fontSize: '0.85rem',
                borderRadius: '2px',
                textDecoration: 'none',
                background: isActive ? 'var(--color-surface-raised)' : 'transparent',
                color: isActive ? 'var(--color-brass)' : 'var(--color-text-muted)',
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? '2px solid var(--color-brass)' : '2px solid transparent',
              })}
              onMouseEnter={(e) => {
                const target = e.currentTarget
                if (target.getAttribute('aria-current') !== 'page') {
                  target.style.background = 'var(--color-surface-raised)'
                  target.style.color = 'var(--color-text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget
                if (target.getAttribute('aria-current') !== 'page') {
                  target.style.background = 'transparent'
                  target.style.color = 'var(--color-text-muted)'
                }
              }}
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* User / Brand Card */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', position: 'relative' }} ref={dropdownRef}>
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '2px',
              transition: 'background 0.15s ease',
              background: isDropdownOpen ? 'var(--color-surface-raised)' : 'transparent'
            }}
          >
            <div style={{ width: 28, height: 28, borderRadius: '2px', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-brass)' }}>
              {brandName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--color-text-primary)' }} title={brandName}>{brandName}</div>
              <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Active Brand</div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          
          {/* Brand Switcher Dropdown */}
          {isDropdownOpen && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 0.5rem)',
              left: '1rem',
              right: '1rem',
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              borderRadius: '2px',
              padding: '0.5rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', padding: '0.25rem 0.5rem 0.4rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Switch Brand
              </div>
              {brands.map((b) => (
                <div
                  key={b.id}
                  onClick={() => handleBrandSwitch(b.id)}
                  style={{
                    padding: '0.45rem 0.5rem',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: b.id === brandId ? 'var(--color-brass)' : 'var(--color-text-muted)',
                    background: b.id === brandId ? 'rgba(184,137,74,0.08)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderLeft: b.id === brandId ? '2px solid var(--color-brass)' : '2px solid transparent',
                  }}
                >
                  <div style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {b.name}
                  </div>
                </div>
              ))}
              <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.25rem 0' }} />
              <div
                onClick={() => navigate('/setup')}
                style={{
                  padding: '0.45rem 0.5rem',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: 'var(--color-brass)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 500
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(184,137,74,0.06)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create New Brand
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Bar */}
        <header style={{
          height: 56,
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem'
        }}>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', background: 'var(--color-ink)', padding: '0.4rem 0.875rem', borderRadius: 2, border: '1px solid var(--color-border)', width: 300 }}>
            <IconSearch />
            <input 
              type="text" 
              placeholder="Search analytics..." 
              style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', width: '100%', color: 'var(--color-text-primary)' }} 
            />
          </div>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', color: 'var(--color-text-muted)' }}>
            <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><IconBell /></button>
            <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><IconHelp /></button>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: 'var(--color-ink)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}