import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Swords, 
  Users, 
  Shield, 
  Trophy, 
  Flame, 
  Zap, 
  MapPin, 
  Crosshair, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight
} from 'lucide-react'

// Brawl Stars Brawler Card Component for Physical Paper Battle Board
function BrawlerPortraitCard({
  id,
  name,
  role,
  power = '11',
  badgeColor = 'bg-scream-yellow text-ink-black',
  rotation = 'rotate-0',
  className = '',
  isMain = false
}) {
  const [imgError, setImgError] = useState(false)
  const primaryUrl = `https://cdn.brawlify.com/brawlers/borderless/${id}.png`
  const fallbackUrl = `https://cdn.brawlify.com/brawlers/borders/${id}.png`

  return (
    <div className={`relative transition-all duration-300 select-none group ${rotation} ${className}`}>
      {/* Paper Card Frame */}
      <div 
        className={`bg-paper-cream border-2 border-ink-black shadow-hard p-2 sm:p-2.5 relative flex flex-col items-center transition-transform group-hover:scale-105 group-hover:-translate-y-1 ${
          isMain ? 'ring-2 ring-battle-red/30' : ''
        }`}
      >
        {/* Star Power / Power Level Tag */}
        <div className="absolute -top-2.5 -right-2 bg-battle-red text-white text-[9px] sm:text-[10px] font-headline-sm uppercase px-1.5 py-0.5 border border-ink-black shadow-tape flex items-center gap-0.5 font-bold z-20">
          <span>PWR {power}</span>
          <span className="text-scream-yellow font-black">⚡</span>
        </div>

        {/* Brawler Character Illustration */}
        <div 
          className={`relative flex items-center justify-center overflow-hidden bg-white border border-ink-black/20 w-full ${
            isMain ? 'h-36 sm:h-44' : 'h-28 sm:h-34'
          }`}
        >
          <img
            src={imgError ? fallbackUrl : primaryUrl}
            alt={name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain filter drop-shadow-[2px_3px_0px_rgba(24,23,22,0.85)] transform transition-transform group-hover:scale-110"
            loading="eager"
          />
        </div>

        {/* Paper Tape Name Badge */}
        <div 
          className={`-mt-2.5 sm:-mt-3 ${badgeColor} border border-ink-black px-2 py-0.5 font-headline-sm text-[10px] sm:text-xs uppercase font-bold tracking-wider shadow-tape z-20 whitespace-nowrap text-center`}
        >
          {name} <span className="text-[8px] sm:text-[9px] opacity-80 font-normal">[{role}]</span>
        </div>
      </div>
    </div>
  )
}

// Stylized Paper Battle Map Background (Tactical Arena Grid)
function PaperBattleMapBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 z-0">
      <div 
        className="w-full h-full"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(24, 23, 22, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(24, 23, 22, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      <svg className="absolute w-full h-full inset-0" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50%" cy="45%" r="160" stroke="#181716" strokeWidth="2.5" strokeDasharray="8 8" fill="none" />
        <circle cx="50%" cy="45%" r="70" stroke="#FF2A42" strokeWidth="3" strokeDasharray="4 4" fill="rgba(255, 199, 0, 0.05)" />

        <path d="M 200 400 Q 350 300 500 350 T 700 250" stroke="#FF2A42" strokeWidth="3" strokeDasharray="6 6" fill="none" />
        <polygon points="705,245 690,240 695,255" fill="#FF2A42" />

        <g transform="translate(180, 180) rotate(-5)">
          <rect x="0" y="0" width="120" height="40" fill="#FAF5EA" stroke="#181716" strokeWidth="2.5" />
          <line x1="40" y1="0" x2="40" y2="40" stroke="#181716" strokeWidth="2" />
          <line x1="80" y1="0" x2="80" y2="40" stroke="#181716" strokeWidth="2" />
          <line x1="0" y1="20" x2="120" y2="20" stroke="#181716" strokeWidth="2" />
        </g>

        <g transform="translate(850, 160) rotate(4)">
          <rect x="0" y="0" width="140" height="40" fill="#FAF5EA" stroke="#181716" strokeWidth="2.5" />
          <line x1="45" y1="0" x2="45" y2="40" stroke="#181716" strokeWidth="2" />
          <line x1="90" y1="0" x2="90" y2="40" stroke="#181716" strokeWidth="2" />
          <line x1="0" y1="20" x2="140" y2="20" stroke="#181716" strokeWidth="2" />
        </g>

        <g transform="translate(320, 480)">
          <path d="M0 30 C10 10 30 10 40 30 C50 10 70 10 80 30 C90 10 110 10 120 30 Z" fill="#70DE00" stroke="#181716" strokeWidth="2.5" opacity="0.6" />
        </g>
      </svg>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen text-ink-black font-body-md bg-paper-cream overflow-x-hidden selection:bg-scream-yellow selection:text-ink-black flex flex-col relative">
      
      {/* ========================================================================= */}
      {/* 1. HERO BATTLE BOARD SECTION (STARTS DIRECTLY FROM PAPER BACKGROUND) */}
      {/* ========================================================================= */}
      <section className="relative min-h-[100svh] min-h-screen flex flex-col justify-between pt-6 pb-6 sm:pt-8 sm:pb-8 md:pt-10 md:pb-10 border-b-4 border-ink-black overflow-hidden">
        <PaperBattleMapBackground />

        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop w-full mb-2 sm:mb-4 relative z-10 flex-shrink-0">
          <div className="inline-flex flex-wrap items-center gap-3">
            <div className="bg-scream-yellow text-ink-black border-2 border-ink-black px-4 py-1.5 font-headline-sm text-xs sm:text-sm uppercase -rotate-2 shadow-tape flex items-center gap-2 font-bold">
              <span className="text-battle-red font-bold text-base">⚡</span>
              <span>SEASON 01 // BRAWL STARS COMPETITIVE MATCHMAKING</span>
            </div>
            <div className="hidden sm:inline-block bg-white text-ink-black border-2 border-ink-black px-3 py-1 font-label-bold text-xs uppercase rotate-1 shadow-tape">
              EST. 2026 · SCRIMMAGE BOARD
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10 my-auto flex-1 py-4">
          
          <div className="lg:col-span-7 flex flex-col gap-6 relative">
            
            <div className="relative">
              <div className="absolute -top-5 -left-4 bg-paper-cream border border-dashed border-ink-black/40 px-2 py-0.5 text-[10px] font-label-bold uppercase tracking-widest text-on-surface-variant -rotate-3">
                // MATCHMAKING POSTER NO. 01
              </div>

              <h1
                className="font-display-xl text-5xl sm:text-7xl md:text-8xl uppercase tracking-tighter text-battle-red leading-none mt-2"
                style={{ WebkitTextStroke: '2.5px #181716', textShadow: '4px 4px 0 #181716' }}
              >
                SCRIMS.{' '}
                <span className="text-ink-black" style={{ WebkitTextStroke: '0px', textShadow: 'none' }}>
                  TEAMS.
                </span>{' '}
                <br className="hidden sm:inline" />
                <span className="text-scream-yellow">COMPETE.</span>
              </h1>
            </div>

            <div className="relative max-w-xl">
              <p className="font-body-lg text-lg sm:text-xl md:text-2xl text-ink-black font-bold border-l-4 border-battle-red pl-4 bg-white/70 py-2 border-y-2 border-r-2 border-ink-black shadow-hard-sm transform -rotate-0.5">
                Find players. Build teams. Run competitive scrims.
              </p>
              <p className="font-body-md text-sm text-on-surface-variant font-medium mt-2 pl-4">
                The dedicated competitive scrim board for Brawl Stars squads, semi-pros, and club organizers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/login"
                className="bg-battle-red text-white font-headline-lg text-xl sm:text-2xl uppercase px-8 py-4 border-2 border-ink-black shadow-hard hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100 transform -rotate-1 hover:rotate-0 flex items-center gap-3 font-bold tracking-wider cursor-pointer"
              >
                <span>GET STARTED</span>
                <span className="text-scream-yellow text-2xl">⚡</span>
              </Link>

              <Link
                to="/board"
                className="bg-white text-ink-black font-headline-md text-base sm:text-lg uppercase px-6 py-4 border-2 border-ink-black shadow-hard hover:bg-scream-yellow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100 transform rotate-1 hover:rotate-0 flex items-center gap-2 font-bold tracking-wider"
              >
                <span>EXPLORE SCRIMS</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-label-bold uppercase text-ink-black">
              <span className="bg-paper-cream px-2.5 py-1 border border-ink-black shadow-tape flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-acid-green stroke-[3]" />
                3v3 Friendly Sets
              </span>
              <span className="bg-paper-cream px-2.5 py-1 border border-ink-black shadow-tape flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-acid-green stroke-[3]" />
                Power League Draft
              </span>
              <span className="bg-paper-cream px-2.5 py-1 border border-ink-black shadow-tape flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-acid-green stroke-[3]" />
                Verified Brawl API Stats
              </span>
            </div>

            {/* Mobile Roster Lineup */}
            <div className="block lg:hidden mt-6 bg-white border-2 border-ink-black shadow-hard p-4 transform -rotate-1">
              <div className="border-b-2 border-dashed border-ink-black/30 pb-2 mb-3 flex justify-between items-center text-[10px] font-label-bold uppercase font-bold text-on-surface-variant">
                <span>ARENA: HARD ROCK MINE</span>
                <span className="text-battle-red">3V3 GEM GRAB</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <BrawlerPortraitCard
                  id="16000006"
                  name="MORTIS"
                  role="ASSASSIN"
                  power="11"
                  badgeColor="bg-electric-blue text-white"
                  rotation="-rotate-3"
                  className="w-24 sm:w-28"
                />
                <BrawlerPortraitCard
                  id="16000001"
                  name="COLT"
                  role="CAPTAIN"
                  power="11"
                  badgeColor="bg-scream-yellow text-ink-black"
                  rotation="rotate-0"
                  isMain={true}
                  className="w-28 sm:w-32 z-10"
                />
                <BrawlerPortraitCard
                  id="16000009"
                  name="SPIKE"
                  role="CONTROL"
                  power="11"
                  badgeColor="bg-acid-green text-ink-black"
                  rotation="rotate-3"
                  className="w-24 sm:w-28"
                />
              </div>
            </div>
          </div>

          {/* Right Hero Visual: Competitive Brawler Poster Card Composition */}
          <div className="lg:col-span-5 relative hidden lg:flex items-center justify-center min-h-[480px]">
            {/* White Paper Card Background */}
            <div 
              className="relative w-full bg-white border-2 border-ink-black shadow-hard p-5 sm:p-6 transform rotate-2 overflow-hidden flex flex-col justify-between"
              style={{
                clipPath: 'polygon(0 0, 100% 0, 100% 97%, 95% 100%, 90% 97%, 85% 100%, 80% 97%, 75% 100%, 70% 97%, 65% 100%, 60% 97%, 55% 100%, 50% 97%, 45% 100%, 40% 97%, 35% 100%, 30% 97%, 25% 100%, 20% 97%, 15% 100%, 10% 97%, 5% 100%, 0 97%)'
              }}
            >
              {/* Card Header */}
              <div className="border-b-2 border-dashed border-ink-black/30 pb-3 flex justify-between items-center text-[11px] font-label-bold text-on-surface-variant uppercase font-bold tracking-wider">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-acid-green animate-pulse" />
                  ARENA: HARD ROCK MINE
                </span>
                <span className="text-battle-red font-bold bg-battle-red/10 px-2 py-0.5 border border-battle-red/30">
                  3V3 GEM GRAB
                </span>
              </div>

              {/* Centered Brawlers Roster Lineup inside the card */}
              <div className="relative py-6 flex items-center justify-center min-h-[300px]">
                {/* Background Arena Tactical Markings */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                  <div className="w-56 h-56 rounded-full border-2 border-dashed border-ink-black flex items-center justify-center">
                    <div className="w-28 h-28 rounded-full border border-ink-black" />
                  </div>
                </div>

                {/* 3 Brawlers Lineup */}
                <div className="relative flex items-center justify-center w-full">
                  {/* Left Brawler: MORTIS (Aggro Slayer) */}
                  <BrawlerPortraitCard
                    id="16000006"
                    name="MORTIS"
                    role="ASSASSIN"
                    power="11"
                    badgeColor="bg-electric-blue text-white"
                    rotation="-rotate-6"
                    className="w-36 -mr-6 z-10 opacity-95 hover:opacity-100 transform hover:-translate-y-2 hover:-rotate-3"
                  />

                  {/* Center Main Brawler: COLT (Sharpshooter Captain) */}
                  <BrawlerPortraitCard
                    id="16000001"
                    name="COLT"
                    role="SHARPSHOOTER"
                    power="11"
                    badgeColor="bg-scream-yellow text-ink-black"
                    rotation="rotate-0"
                    isMain={true}
                    className="w-44 z-20 transform hover:-translate-y-3 hover:scale-105"
                  />

                  {/* Right Brawler: SPIKE (Controller) */}
                  <BrawlerPortraitCard
                    id="16000009"
                    name="SPIKE"
                    role="CONTROLLER"
                    power="11"
                    badgeColor="bg-acid-green text-ink-black"
                    rotation="rotate-6"
                    className="w-36 -ml-6 z-10 opacity-95 hover:opacity-100 transform hover:-translate-y-2 hover:rotate-3"
                  />
                </div>
              </div>

              {/* Card Sub-Footer Info */}
              <div className="pt-3 border-t-2 border-dashed border-ink-black/20 flex justify-between items-center text-[10px] font-label-bold uppercase text-on-surface-variant font-bold">
                <span>META TEAM SYNERGY: TIER S</span>
                <span className="text-ink-black">LOBBY STATUS: FULL</span>
              </div>
            </div>

            {/* Hot Lobby Ready Tag */}
            <div className="absolute -bottom-4 right-2 bg-scream-yellow border-2 border-ink-black p-3 font-headline-sm text-xs uppercase shadow-hard z-30 transform rotate-6 font-bold">
              <div className="text-battle-red font-bold flex items-center gap-1">
                <Flame className="w-4 h-4 fill-current" />
                <span>HOT LOBBY READY</span>
              </div>
              <p className="font-body-md text-[10px] text-ink-black mt-0.5 lowercase font-bold">
                room code: #X7K9P2
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. FEATURE SECTION: FOUR PAPER-STYLE CARDS */}
      {/* ========================================================================= */}
      <section className="py-16 md:py-24 bg-surface-container relative z-10 border-b-4 border-ink-black">
        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop">
          
          <div className="text-center max-w-2xl mx-auto mb-16 relative">
            <div className="bg-paper-cream border-2 border-ink-black px-4 py-1 font-headline-sm text-xs uppercase shadow-tape inline-block -rotate-1 mb-3 font-bold">
              ⚡ THE SCRIMMAGE TOOLKIT
            </div>
            <h2
              className="font-display-xl text-4xl sm:text-5xl md:text-6xl uppercase tracking-tight text-ink-black leading-none"
              style={{ WebkitTextStroke: '1.5px #181716' }}
            >
              BUILT FOR <span className="text-battle-red">COMPETITORS.</span>
            </h2>
            <p className="font-body-md text-sm md:text-base text-on-surface-variant font-bold mt-3">
              Everything you need to organize high-stakes practice matches, build team synergy, and dominate brackets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            
            {/* Card 1: HOST SCRIMS */}
            <div className="bg-white border-2 border-ink-black shadow-hard p-6 flex flex-col justify-between transform -rotate-1 hover:rotate-0 transition-transform duration-200 relative group">
              <div className="absolute -top-3 left-4 w-12 h-6 bg-scream-yellow/80 border border-ink-black -rotate-6 shadow-tape pointer-events-none" />

              <div>
                <div className="w-12 h-12 bg-battle-red text-white border-2 border-ink-black flex items-center justify-center shadow-tape mb-5 transform -rotate-3 group-hover:rotate-0 transition-transform">
                  <Flame className="w-6 h-6 fill-current" />
                </div>
                <h3 className="font-headline-sm text-2xl uppercase text-ink-black mb-2 font-bold tracking-tight">
                  HOST SCRIMS
                </h3>
                <p className="font-body-md text-sm text-on-surface-variant font-medium leading-relaxed">
                  Create and manage your own scrims. Select custom map pools, pick friendly or power league draft mode, and set lobby schedules.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t-2 border-dashed border-ink-black/20 text-xs font-label-bold uppercase text-battle-red flex items-center gap-1 font-bold">
                <span>Custom Map Sets</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Card 2: FIND PLAYERS */}
            <div className="bg-white border-2 border-ink-black shadow-hard p-6 flex flex-col justify-between transform rotate-1 hover:rotate-0 transition-transform duration-200 relative group">
              <div className="absolute -top-3 right-4 w-12 h-6 bg-electric-blue/40 border border-ink-black rotate-6 shadow-tape pointer-events-none" />

              <div>
                <div className="w-12 h-12 bg-electric-blue text-white border-2 border-ink-black flex items-center justify-center shadow-tape mb-5 transform rotate-3 group-hover:rotate-0 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-headline-sm text-2xl uppercase text-ink-black mb-2 font-bold tracking-tight">
                  FIND PLAYERS
                </h3>
                <p className="font-body-md text-sm text-on-surface-variant font-medium leading-relaxed">
                  Find opponents and fill your lobby. Browse the live open board, jump into available team slots, and coordinate in real-time chat.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t-2 border-dashed border-ink-black/20 text-xs font-label-bold uppercase text-electric-blue flex items-center gap-1 font-bold">
                <span>Live Open Board</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Card 3: BUILD TEAMS */}
            <div className="bg-white border-2 border-ink-black shadow-hard p-6 flex flex-col justify-between transform -rotate-1.5 hover:rotate-0 transition-transform duration-200 relative group">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-6 bg-acid-green/50 border border-ink-black -rotate-2 shadow-tape pointer-events-none" />

              <div>
                <div className="w-12 h-12 bg-acid-green text-ink-black border-2 border-ink-black flex items-center justify-center shadow-tape mb-5 transform -rotate-2 group-hover:rotate-0 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="font-headline-sm text-2xl uppercase text-ink-black mb-2 font-bold tracking-tight">
                  BUILD TEAMS
                </h3>
                <p className="font-body-md text-sm text-on-surface-variant font-medium leading-relaxed">
                  Create teams and compete together. Assign rosters, choose custom arena brawler banners, and challenge rival clubs to scrim series.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t-2 border-dashed border-ink-black/20 text-xs font-label-bold uppercase text-ink-black flex items-center gap-1 font-bold">
                <span>Squad Directory</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Card 4: TRACK MATCHES */}
            <div className="bg-white border-2 border-ink-black shadow-hard p-6 flex flex-col justify-between transform rotate-2 hover:rotate-0 transition-transform duration-200 relative group">
              <div className="absolute -top-3 right-6 w-12 h-6 bg-scream-yellow/80 border border-ink-black rotate-4 shadow-tape pointer-events-none" />

              <div>
                <div className="w-12 h-12 bg-scream-yellow text-ink-black border-2 border-ink-black flex items-center justify-center shadow-tape mb-5 transform rotate-2 group-hover:rotate-0 transition-transform">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="font-headline-sm text-2xl uppercase text-ink-black mb-2 font-bold tracking-tight">
                  TRACK MATCHES
                </h3>
                <p className="font-body-md text-sm text-on-surface-variant font-medium leading-relaxed">
                  Keep your scrim and match history organized. Log map-by-map winner breakdowns, review performance, and build your team legacy.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t-2 border-dashed border-ink-black/20 text-xs font-label-bold uppercase text-battle-red flex items-center gap-1 font-bold">
                <span>Match History Logs</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. PHYSICAL BATTLE BOARD PREVIEW / WORKFLOW */}
      {/* ========================================================================= */}
      <section className="py-16 md:py-20 max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop w-full relative z-10">
        <div className="bg-white border-2 border-ink-black shadow-hard p-6 md:p-10 transform -rotate-0.5 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-battle-red text-white border-2 border-ink-black px-3 py-1 font-headline-sm text-xs uppercase -rotate-2 w-max shadow-tape font-bold">
                HOW IT WORKS // 3 STEPS
              </div>
              <h2 className="font-headline-lg text-3xl sm:text-4xl md:text-5xl uppercase text-ink-black leading-tight font-bold">
                ZERO HASSLE. <br />
                <span className="text-battle-red">INSTANT COMPETITIVE SCRIMS.</span>
              </h2>
              
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-scream-yellow border-2 border-ink-black flex items-center justify-center font-headline-sm text-sm flex-shrink-0 font-bold shadow-tape">
                    1
                  </div>
                  <div>
                    <h4 className="font-headline-sm text-lg uppercase text-ink-black font-bold">Host or Join a Lobby</h4>
                    <p className="font-body-md text-xs text-on-surface-variant font-medium">Pick standard competitive maps like Hard Rock Mine, Shooting Star, or Safe Zone.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-electric-blue text-white border-2 border-ink-black flex items-center justify-center font-headline-sm text-sm flex-shrink-0 font-bold shadow-tape">
                    2
                  </div>
                  <div>
                    <h4 className="font-headline-sm text-lg uppercase text-ink-black font-bold">Share In-Game Room Code</h4>
                    <p className="font-body-md text-xs text-on-surface-variant font-medium">Copy the host's friendly battle team code with one click and load into Brawl Stars.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-acid-green text-ink-black border-2 border-ink-black flex items-center justify-center font-headline-sm text-sm flex-shrink-0 font-bold shadow-tape">
                    3
                  </div>
                  <div>
                    <h4 className="font-headline-sm text-lg uppercase text-ink-black font-bold">Log Results & Climb</h4>
                    <p className="font-body-md text-xs text-on-surface-variant font-medium">Record map set winners and track player profile trophy progressions.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Paper Card Mockup */}
            <div className="lg:col-span-6 bg-paper-cream border-2 border-ink-black p-6 shadow-hard rotate-1 relative">
              <div className="absolute -top-3 right-4 bg-battle-red text-white border-2 border-ink-black px-2 py-0.5 font-headline-sm text-[10px] uppercase shadow-tape rotate-3 font-bold">
                LIVE SCRIM DEMO
              </div>

              <div className="flex justify-between items-center border-b-2 border-ink-black pb-3 mb-4">
                <div>
                  <span className="text-xs font-label-bold uppercase text-on-surface-variant block font-bold">HOSTED BY</span>
                  <span className="font-headline-md text-xl uppercase text-ink-black font-bold">KAI // [TRIBE]</span>
                </div>
                <span className="bg-scream-yellow border-2 border-ink-black px-2.5 py-1 font-headline-sm text-xs uppercase font-bold shadow-tape">
                  5 / 6 SLOTS FILLED
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-white border-2 border-ink-black p-2 text-center shadow-tape">
                  <span className="text-[10px] font-label-bold uppercase text-on-surface-variant block">MAP 1</span>
                  <span className="font-headline-sm text-xs uppercase text-ink-black font-bold block truncate">Hard Rock Mine</span>
                  <span className="text-[9px] bg-electric-blue text-white px-1 py-0.2 uppercase font-bold mt-1 inline-block">GEM GRAB</span>
                </div>
                <div className="bg-white border-2 border-ink-black p-2 text-center shadow-tape">
                  <span className="text-[10px] font-label-bold uppercase text-on-surface-variant block">MAP 2</span>
                  <span className="font-headline-sm text-xs uppercase text-ink-black font-bold block truncate">Shooting Star</span>
                  <span className="text-[9px] bg-battle-red text-white px-1 py-0.2 uppercase font-bold mt-1 inline-block">BOUNTY</span>
                </div>
                <div className="bg-white border-2 border-ink-black p-2 text-center shadow-tape">
                  <span className="text-[10px] font-label-bold uppercase text-on-surface-variant block">MAP 3</span>
                  <span className="font-headline-sm text-xs uppercase text-ink-black font-bold block truncate">Safe Zone</span>
                  <span className="text-[9px] bg-scream-yellow text-ink-black px-1 py-0.2 uppercase font-bold mt-1 inline-block">HEIST</span>
                </div>
              </div>

              <div className="bg-white border-2 border-dashed border-ink-black/40 p-3 flex justify-between items-center text-xs font-body-md">
                <span className="font-bold text-ink-black">Friendly Code: <strong className="font-headline-md text-sm uppercase text-battle-red">#X9P4K2</strong></span>
                <Link to="/login" className="bg-battle-red text-white border border-ink-black px-3 py-1 font-headline-sm text-[11px] uppercase font-bold hover:bg-ink-black transition-colors">
                  JOIN SCRIM →
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FINAL CTA SECTION: READY TO RUN IT? */}
      {/* ========================================================================= */}
      <section className="py-16 md:py-20 bg-paper-cream relative z-10 border-t-4 border-ink-black">
        <div className="max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop text-center">
          <div 
            className="bg-white border-4 border-ink-black shadow-hard-lg p-8 sm:p-12 transform -rotate-1 relative"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), 95% 100%, 90% calc(100% - 5px), 85% 100%, 80% calc(100% - 8px), 75% 100%, 70% calc(100% - 6px), 65% 100%, 60% calc(100% - 4px), 55% 100%, 50% calc(100% - 9px), 45% 100%, 40% calc(100% - 5px), 35% 100%, 30% calc(100% - 7px), 25% 100%, 20% calc(100% - 4px), 15% 100%, 10% calc(100% - 8px), 5% 100%, 0 calc(100% - 5px))'
            }}
          >
            <div className="bg-battle-red text-white border-2 border-ink-black px-4 py-1.5 font-headline-sm text-sm uppercase -rotate-3 shadow-tape inline-block mb-4 font-bold tracking-wider">
              ⚡ GET IN THE GAME
            </div>

            <h2
              className="font-display-xl text-5xl sm:text-6xl md:text-7xl uppercase tracking-tighter text-battle-red leading-none mb-4"
              style={{ WebkitTextStroke: '2px #181716', textShadow: '3px 3px 0 #181716' }}
            >
              READY TO <span className="text-scream-yellow">RUN IT?</span>
            </h2>

            <p className="font-body-lg text-base sm:text-lg text-ink-black font-bold max-w-lg mx-auto mb-8">
              Join hundreds of competitive Brawl Stars players hosting scrims, forming teams, and practicing every day.
            </p>

            <Link
              to="/login"
              className="inline-block bg-battle-red text-white font-headline-lg text-2xl uppercase px-12 py-5 border-2 border-ink-black shadow-hard hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100 transform rotate-1 hover:rotate-0 font-bold tracking-wider cursor-pointer"
            >
              GET STARTED ⚡
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. MINIMAL PAPER FOOTER */}
      {/* ========================================================================= */}
      <footer className="bg-white border-t-4 border-ink-black py-8 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-label-bold uppercase text-on-surface-variant">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-scream-yellow border border-ink-black flex items-center justify-center font-bold text-xs shadow-tape">
              ⚡
            </div>
            <span className="font-headline-sm text-sm text-ink-black font-bold tracking-wider">
              SCRIMMAGE
            </span>
            <span className="text-on-surface-variant font-medium lowercase text-[11px]">
              — community-run competitive platform
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/terms" className="text-ink-black hover:text-battle-red underline font-bold transition-colors">
              Terms & Privacy Policy →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
