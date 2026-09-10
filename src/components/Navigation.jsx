import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import UserAvatar from './UserAvatar'

export default function Navigation() {
  const { session, profile } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { label: 'SCRIMS', path: '/board' },
    { label: 'TEAMS', path: '/teams' },
    { label: 'MATCHES', path: '/matches' },
    { label: 'MY LOBBIES', path: '/my-lobbies' },
    { label: 'SETTINGS', path: '/settings' },
    ...(profile?.is_admin ? [{ label: 'ADMIN ⚡', path: '/admin', isAdmin: true }] : []),
  ]

  const isActive = (path) => {
    if (path === '/board') {
      return location.pathname === '/' || location.pathname === '/board'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b-4 border-ink-black shadow-hard-sm">
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop h-16 md:h-20 flex items-center justify-between">
        
        {/* Left: Brand Logo & Links */}
        <div className="flex items-center gap-6 md:gap-10">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-scream-yellow border-2 border-ink-black flex items-center justify-center shadow-tape -rotate-3 group-hover:rotate-0 transition-transform">
              <span className="text-xl">⚡</span>
            </div>
            <span
              className="font-headline-lg text-2xl md:text-3xl uppercase tracking-tight text-battle-red"
              style={{ WebkitTextStroke: '1.5px #181716', textShadow: '2px 2px 0 #181716' }}
            >
              SCRIM<span className="text-scream-yellow">MAGE</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2.5">
            {navItems.map((item) => {
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3.5 py-1.5 font-headline-sm text-sm uppercase transition-all border-2 ${
                    active
                      ? 'bg-scream-yellow text-ink-black border-ink-black shadow-tape -rotate-1 font-bold'
                      : 'border-transparent text-on-surface-variant hover:text-ink-black hover:bg-[#FAF5EA] hover:border-ink-black'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right: Actions & User Avatar */}
        <div className="flex items-center gap-3 md:gap-4">
          <Link
            to="/create-lobby"
            className="hidden sm:inline-block bg-battle-red text-white border-2 border-ink-black px-4 py-2 font-headline-sm text-xs md:text-sm uppercase shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer font-bold tracking-wider"
          >
            + HOST LOBBY ⚡
          </Link>

          {session ? (
            <Link
              to={`/player/${profile?.id || session?.user?.id}`}
              className="flex items-center gap-2 border-2 border-ink-black p-1 bg-paper-cream shadow-tape hover:rotate-2 transition-transform"
              title={profile?.display_name || 'My Profile'}
            >
              <div className="w-8 h-8 overflow-hidden bg-white border border-ink-black flex items-center justify-center">
                <UserAvatar
                  src={profile?.main_brawler_icon_url}
                  alt={profile?.display_name || 'Profile'}
                  className="w-full h-full object-contain"
                />
              </div>
            </Link>
          ) : (
            <Link
              to="/login"
              className="bg-electric-blue text-white border-2 border-ink-black px-4 py-2 font-headline-sm text-xs uppercase shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 transition-all font-bold"
            >
              LOG IN
            </Link>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 border-2 border-ink-black bg-paper-cream shadow-tape cursor-pointer"
            aria-label="Toggle menu"
          >
            <span className="font-headline-sm text-lg block leading-none">☰</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-paper-cream border-t-2 border-ink-black p-4 flex flex-col gap-3 shadow-hard">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 font-headline-sm text-xs uppercase border-2 border-ink-black text-center ${
                    active ? 'bg-scream-yellow shadow-tape font-bold' : 'bg-white text-ink-black'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          <Link
            to="/create-lobby"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full bg-battle-red text-white border-2 border-ink-black py-3 text-center font-headline-sm text-sm uppercase shadow-hard font-bold"
          >
            + HOST LOBBY ⚡
          </Link>
        </div>
      )}
    </header>
  )
}
