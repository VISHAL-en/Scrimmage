import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import { Flame } from 'lucide-react'

// Verified Brawl Stars Brawler Data for the Login Page Lineup
// Every character's image and name come strictly from the same data object
const LOGIN_BRAWLERS = [
  {
    id: '16000012',
    name: 'CROW',
    role: 'ASSASSIN',
    power: '11',
    badgeColor: 'bg-electric-blue text-white',
    rotation: '-rotate-6',
    imgUrl: 'https://cdn.brawlify.com/brawlers/borderless/16000012.png',
    fallbackUrl: 'https://cdn.brawlify.com/brawlers/borders/16000012.png',
    widthClass: 'w-32 sm:w-40 lg:w-48 -mr-6 lg:-mr-8 z-10',
    heightClass: 'h-36 sm:h-44 lg:h-52',
    isMain: false
  },
  {
    id: '16000000',
    name: 'SHELLY',
    role: 'CAPTAIN',
    power: '11',
    badgeColor: 'bg-scream-yellow text-ink-black',
    rotation: 'rotate-0',
    imgUrl: 'https://cdn.brawlify.com/brawlers/borderless/16000000.png',
    fallbackUrl: 'https://cdn.brawlify.com/brawlers/borders/16000000.png',
    widthClass: 'w-40 sm:w-48 lg:w-60 z-30',
    heightClass: 'h-44 sm:h-52 lg:h-64',
    isMain: true
  },
  {
    id: '16000010',
    name: 'EL PRIMO',
    role: 'TANK',
    power: '11',
    badgeColor: 'bg-acid-green text-ink-black',
    rotation: 'rotate-6',
    imgUrl: 'https://cdn.brawlify.com/brawlers/borderless/16000010.png',
    fallbackUrl: 'https://cdn.brawlify.com/brawlers/borders/16000010.png',
    widthClass: 'w-32 sm:w-40 lg:w-48 -ml-6 lg:-ml-8 z-10',
    heightClass: 'h-36 sm:h-44 lg:h-52',
    isMain: false
  }
]

// Authentic Brawl Stars Brawler Card in Scrimmage Physical Paper Aesthetic
function BrawlerCard({ brawler }) {
  const [imgError, setImgError] = useState(false)
  const { name, role, power, badgeColor, rotation, widthClass, heightClass, isMain, imgUrl, fallbackUrl } = brawler

  return (
    <div className={`relative select-none transition-all duration-300 group ${rotation} ${widthClass}`}>
      {/* Paper Card Base Frame */}
      <div 
        className={`bg-paper-cream border-2 lg:border-3 border-ink-black shadow-hard p-2.5 sm:p-3 relative flex flex-col items-center transition-transform group-hover:scale-105 group-hover:-translate-y-1 ${
          isMain ? 'ring-2 ring-battle-red/40 shadow-hard-lg' : ''
        }`}
      >
        {/* Star Power / Power Level Tape Tag */}
        <div className="absolute -top-3 -right-2 bg-battle-red text-white text-[10px] lg:text-xs font-headline-sm uppercase px-2 py-0.5 border border-ink-black shadow-tape flex items-center gap-1 font-bold z-30">
          <span>PWR {power}</span>
          <span className="text-scream-yellow font-black">⚡</span>
        </div>

        {/* Brawler Character Illustration */}
        <div 
          className={`relative flex items-center justify-center overflow-hidden bg-white border border-ink-black/30 w-full ${heightClass}`}
        >
          <img
            src={imgError ? fallbackUrl : imgUrl}
            alt={name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain filter drop-shadow-[3px_5px_0px_rgba(24,23,22,0.9)] transform transition-transform group-hover:scale-110"
            loading="eager"
          />
        </div>

        {/* Paper Tape Name & Role Tag - Rendered directly from same data object */}
        <div 
          className={`-mt-3.5 ${badgeColor} border-2 border-ink-black px-2.5 py-0.5 font-headline-sm text-xs lg:text-sm uppercase font-bold tracking-wider shadow-tape z-30 whitespace-nowrap text-center`}
        >
          {name} <span className="text-[9px] lg:text-[10px] opacity-80 font-normal">[{role}]</span>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

export default function Login() {
  const { session, profile, loading: authLoading } = useAuth()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check for error parameters in URL (e.g. from OAuth redirect)
    const params = new URLSearchParams(window.location.search)
    const errorDesc = params.get('error_description')
    if (errorDesc) {
      setError(errorDesc)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && session) {
      if (!profile || !profile.display_name) {
        navigate('/onboarding', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    }
  }, [session, profile, authLoading, navigate])

  const handleGoogleSignIn = async () => {
    setError(null)
    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })

      if (authError) throw authError
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen md:overflow-hidden flex flex-col justify-between bg-paper-cream text-ink-black font-body-md relative selection:bg-scream-yellow selection:text-ink-black">
      {/* Background Blueprint Grid Texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(24, 23, 22, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(24, 23, 22, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Torn Edge Base (Bottom of screen) */}
      <div
        className="fixed bottom-0 left-0 w-full h-8 bg-ink-black/20 rotate-180 z-50 pointer-events-none opacity-40"
        style={{
          clipPath:
            'polygon(0 0, 100% 0, 100% 95%, 98% 97%, 95% 94%, 92% 98%, 89% 93%, 86% 99%, 83% 95%, 80% 98%, 77% 94%, 74% 97%, 71% 93%, 68% 99%, 65% 94%, 62% 97%, 59% 93%, 56% 98%, 53% 95%, 50% 99%, 47% 94%, 44% 98%, 41% 95%, 38% 97%, 35% 93%, 32% 99%, 29% 95%, 26% 98%, 23% 94%, 20% 97%, 17% 93%, 14% 98%, 11% 95%, 8% 99%, 5% 94%, 2% 97%, 0 95%)'
        }}
      />

      {/* Navigation Brand Header - Large Solid Black Scrimmage Logo */}
      <header className="w-full px-6 md:px-10 pt-4 md:pt-6 pb-2 flex-shrink-0 z-20">
        <div className="inline-flex items-center gap-3 select-none">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-ink-black border-2 border-ink-black flex items-center justify-center shadow-tape -rotate-2">
            <span className="text-xl sm:text-2xl text-paper-cream font-black">⚡</span>
          </div>
          <span className="font-headline-lg text-3xl sm:text-4xl md:text-5xl uppercase tracking-wider text-ink-black font-black leading-none">
            SCRIMMAGE
          </span>
        </div>
      </header>

      {/* Main Container - Sized to fit 100vh on Desktop */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex items-center justify-center relative z-10 my-auto py-2">
        <div className="grid grid-cols-12 gap-6 lg:gap-10 w-full items-center relative">
          
          {/* Main Login Composition (Left - Visual Priority) */}
          <div className="col-span-12 md:col-span-6 lg:col-span-5 relative flex items-center justify-center md:justify-start z-20">
            {/* Background Layer 1: Electric Blue */}
            <div
              className="absolute w-full max-w-md h-[105%] bg-electric-blue border-2 border-ink-black rotate-[3deg] translate-x-3 translate-y-2 opacity-90 shadow-hard pointer-events-none"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, 100% 100%, 95% 96%, 90% 100%, 85% 97%, 80% 100%, 75% 96%, 70% 100%, 65% 97%, 60% 100%, 55% 95%, 50% 100%, 45% 97%, 40% 100%, 35% 96%, 30% 100%, 25% 95%, 20% 100%, 15% 97%, 10% 100%, 5% 96%, 0 100%)'
              }}
            />

            {/* Background Layer 2: Scream Yellow */}
            <div
              className="absolute w-full max-w-md h-[103%] bg-scream-yellow border-2 border-ink-black rotate-[-2.5deg] -translate-x-2 -translate-y-2 shadow-hard pointer-events-none"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, 100% 100%, 95% 96%, 90% 100%, 85% 97%, 80% 100%, 75% 96%, 70% 100%, 65% 97%, 60% 100%, 55% 95%, 50% 100%, 45% 97%, 40% 100%, 35% 96%, 30% 100%, 25% 95%, 20% 100%, 15% 97%, 10% 100%, 5% 96%, 0 100%)'
              }}
            />

            {/* Top Layer: Paper White Card */}
            <div
              className="relative w-full max-w-md bg-white border-2 border-ink-black rotate-[0.5deg] p-6 sm:p-8 shadow-hard z-10"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, 100% 100%, 95% 96%, 90% 100%, 85% 97%, 80% 100%, 75% 96%, 70% 100%, 65% 97%, 60% 100%, 55% 95%, 50% 100%, 45% 97%, 40% 100%, 35% 96%, 30% 100%, 25% 95%, 20% 100%, 15% 97%, 10% 100%, 5% 96%, 0 100%)'
              }}
            >
              <div className="flex flex-col gap-5 relative">
                <div className="bg-scream-yellow text-ink-black border-2 border-ink-black px-3 py-1 font-headline-sm text-xs uppercase -rotate-2 w-max shadow-tape flex items-center gap-1.5 font-bold">
                  <span className="text-battle-red font-bold">⚡</span>
                  <span>AUTHENTICATION</span>
                </div>

                <h1 className="font-headline-lg text-3xl sm:text-4xl md:text-5xl flex flex-wrap gap-x-3 gap-y-1 leading-none uppercase z-10">
                  <span
                    className="text-scream-yellow"
                    style={{ WebkitTextStroke: '2px #181716', textShadow: '3px 3px 0px #181716' }}
                  >
                    JOIN THE
                  </span>
                  <span
                    className="text-battle-red"
                    style={{ WebkitTextStroke: '2px #181716', textShadow: '3px 3px 0px #181716' }}
                  >
                    SCRIM.
                  </span>
                </h1>

                <p className="font-body-md text-xs sm:text-sm text-ink-black/80 font-bold border-l-3 border-ink-black pl-3 py-0.5">
                  Sign in with your Google account to access competitive 3v3 scrims, track match stats, and manage rosters.
                </p>

                {error && (
                  <div className="text-battle-red font-label-bold text-xs bg-[#FFE5E7] p-2.5 border-2 border-ink-black shadow-tape rotate-1 font-bold">
                    ⚠ {error}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full bg-white hover:bg-paper-cream text-ink-black font-headline-sm text-base sm:text-lg uppercase py-3.5 px-4 border-2 border-ink-black shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center gap-3 cursor-pointer font-bold disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <GoogleIcon className="w-5 h-5 flex-shrink-0" />
                    <span>{loading ? 'CONNECTING...' : 'CONTINUE WITH GOOGLE'}</span>
                    <span className="text-battle-red group-hover:translate-x-0.5 transition-transform font-black">→</span>
                  </button>
                </div>

                <div className="pt-2 text-center text-[11px] font-label-bold text-ink-black/60 uppercase border-t border-dashed border-ink-black/30">
                  FAST & SECURE // ONE-CLICK SIGN IN
                </div>
              </div>
            </div>
          </div>

          {/* Large Right-Side Brawl Stars Brawlers Composition (Occupies ~40-50% Viewport Height) */}
          <div 
            className="col-span-12 md:col-span-6 lg:col-span-7 relative hidden md:flex items-center justify-center min-h-[420px] lg:min-h-[500px]"
            aria-hidden="true"
          >
            {/* White Paper Scrim Card Poster Backdrop */}
            <div
              className="absolute inset-0 bg-white/95 border-2 border-ink-black p-5 lg:p-6 rotate-[2deg] shadow-hard z-0 overflow-hidden flex flex-col justify-between"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, 100% 97%, 95% 100%, 90% 97%, 85% 100%, 80% 97%, 75% 100%, 70% 97%, 65% 100%, 60% 97%, 55% 100%, 50% 97%, 45% 100%, 40% 97%, 35% 100%, 30% 97%, 25% 100%, 20% 97%, 15% 100%, 10% 97%, 5% 100%, 0 97%)'
              }}
            >
              {/* Card Header Info */}
              <div className="flex justify-between items-center border-b-2 border-dashed border-ink-black/30 pb-2 text-xs font-label-bold uppercase text-on-surface-variant font-bold tracking-wider">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-acid-green animate-pulse" />
                  ARENA: BOUNTY // SHOOTING STAR
                </span>
                <span className="text-battle-red font-bold bg-battle-red/10 px-2 py-0.5 border border-battle-red/30">
                  3V3 POWER MATCH
                </span>
              </div>

              {/* Background Arena Tactical Coordinate Lines */}
              <div className="relative w-full flex-1 flex items-center justify-center pointer-events-none opacity-20">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50%" cy="50%" r="130" stroke="#181716" strokeWidth="2" strokeDasharray="6 6" fill="none" />
                  <circle cx="50%" cy="50%" r="65" stroke="#FF2A42" strokeWidth="2.5" strokeDasharray="4 4" fill="rgba(255, 199, 0, 0.05)" />
                  <path d="M 40 220 Q 140 160 260 200" stroke="#FF2A42" strokeWidth="2.5" strokeDasharray="5 5" fill="none" />
                </svg>
              </div>

              {/* Card Sub-Footer Info */}
              <div className="pt-2 border-t-2 border-dashed border-ink-black/20 flex justify-between items-center text-[10px] lg:text-xs font-label-bold uppercase text-on-surface-variant font-bold">
                <span>NEW SQUAD CHALLENGERS // S01</span>
                <span className="text-battle-red font-bold">LOBBY FULL · 3/3</span>
              </div>
            </div>

            {/* Layered Authentic Brawl Stars Brawler Lineup - Strict Data-Bound Mapping */}
            <div className="relative z-10 w-full flex items-center justify-center py-4">
              {LOGIN_BRAWLERS.map((brawler) => (
                <BrawlerCard key={brawler.id} brawler={brawler} />
              ))}
            </div>

            {/* Hot Lobby Ready Paper Tape Tag Attached */}
            <div className="absolute -bottom-3 right-2 bg-scream-yellow border-2 border-ink-black p-2.5 lg:p-3 font-headline-sm text-xs uppercase shadow-hard z-30 transform rotate-4 font-bold">
              <div className="text-battle-red font-bold flex items-center gap-1.5">
                <Flame className="w-4 h-4 fill-current" />
                <span>HOT LOBBY READY</span>
              </div>
              <p className="font-body-md text-[10px] text-ink-black mt-0.5 lowercase font-bold">
                room code: #B9X2M4
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer minimal tag (Compact) */}
      <footer className="w-full px-6 py-2 flex-shrink-0 z-20 text-[10px] uppercase font-label-bold text-on-surface-variant/60 text-right">
        SCRIMMAGE · COMPETITIVE BRAWL MATCHMAKING
      </footer>
    </div>
  )
}
