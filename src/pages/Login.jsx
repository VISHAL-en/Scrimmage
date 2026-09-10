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

export default function Login() {
  const { session, profile, loading: authLoading } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && session) {
      if (!profile || !profile.display_name) {
        navigate('/onboarding', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    }
  }, [session, profile, authLoading, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password
        })

        if (signUpError) throw signUpError

        // If email confirmation is required, data.session is null while data.user exists
        if (data.user && !data.session) {
          setMessage('Check your email to verify your account before logging in.')
          setPassword('')
        } else if (data.session) {
          navigate('/onboarding')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (signInError) throw signInError

        navigate('/')
      }
    } catch (err) {
      setError(err.message)
    } finally {
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
              <div className="flex flex-col gap-4 relative">
                <h1 className="font-headline-lg text-3xl sm:text-4xl md:text-5xl flex flex-wrap gap-x-3 gap-y-1 leading-none uppercase z-10">
                  <span
                    className="text-scream-yellow"
                    style={{ WebkitTextStroke: '2px #181716', textShadow: '3px 3px 0px #181716' }}
                  >
                    {isSignUp ? 'JOIN THE' : 'BACK TO THE'}
                  </span>
                  <span
                    className="text-battle-red"
                    style={{ WebkitTextStroke: '2px #181716', textShadow: '3px 3px 0px #181716' }}
                  >
                    SCRIM.
                  </span>
                </h1>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false)
                      setError(null)
                      setMessage(null)
                    }}
                    className={`font-headline-sm uppercase text-lg cursor-pointer ${
                      !isSignUp ? 'border-b-4 border-ink-black text-ink-black font-bold' : 'text-ink-black/40'
                    } pb-1`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true)
                      setError(null)
                      setMessage(null)
                    }}
                    className={`font-headline-sm uppercase text-lg cursor-pointer ${
                      isSignUp ? 'border-b-4 border-ink-black text-ink-black font-bold' : 'text-ink-black/40'
                    } pb-1`}
                  >
                    Sign Up
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-1">
                  <div className="relative">
                    <label className="block font-label-bold text-xs uppercase text-ink-black mb-1 font-bold">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent border-0 border-b-3 border-ink-black font-body-md text-ink-black pb-1.5 px-1 focus:ring-0 focus:outline-none focus:bg-scream-yellow/10 font-bold"
                      placeholder="brawler@starrpark.com"
                    />
                  </div>

                  <div className="relative">
                    <label className="block font-label-bold text-xs uppercase text-ink-black mb-1 font-bold">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent border-0 border-b-3 border-ink-black font-body-md text-ink-black pb-1.5 px-1 focus:ring-0 focus:outline-none focus:bg-scream-yellow/10 font-bold"
                      placeholder="••••••••"
                    />
                  </div>

                  {message && (
                    <div className="text-ink-black font-label-bold text-xs bg-acid-green p-2.5 border-2 border-ink-black shadow-tape rotate-1 flex items-center gap-2 font-bold">
                      <span className="text-sm">✓</span>
                      <span>{message}</span>
                    </div>
                  )}

                  {error && (
                    <div className="text-battle-red font-label-bold text-xs bg-[#FFE5E7] p-2 border-2 border-ink-black shadow-tape rotate-1 font-bold">
                      {error}
                    </div>
                  )}

                  <div className="relative mt-2 group w-fit">
                    <button
                      type="submit"
                      disabled={loading}
                      className="relative z-10 bg-battle-red text-white font-headline-sm text-base sm:text-lg uppercase px-7 py-3.5 border-2 border-ink-black shadow-hard rotate-[-1.5deg] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none hover:rotate-0 flex items-center gap-2 cursor-pointer font-bold"
                    >
                      {loading ? 'PROCESSING...' : isSignUp ? 'SIGN UP NOW ⚡' : 'LOG IN ⚡'}
                    </button>
                  </div>
                </form>
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
