import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import Navigation from '../components/Navigation'
import { getBrawlers, getBrawlerBannerUrl } from '../lib/brawlers'
import { formatActionError } from '../lib/authErrors'

export default function CreateTeam() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [brawlers, setBrawlers] = useState([])
  const [loadingBrawlers, setLoadingBrawlers] = useState(true)
  const [brawlerSearch, setBrawlerSearch] = useState('')
  const [selectedBrawlerId, setSelectedBrawlerId] = useState('16000000')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [userTeamCount, setUserTeamCount] = useState(0)
  const [checkingLimit, setCheckingLimit] = useState(true)

  useEffect(() => {
    let isMounted = true
    getBrawlers().then((list) => {
      if (!isMounted) return
      setBrawlers(list || [])
      setLoadingBrawlers(false)
      if (list && list.length > 0 && !selectedBrawlerId) {
        setSelectedBrawlerId(list[0].id)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!session?.user?.id) {
      setCheckingLimit(false)
      return
    }

    const checkTeamCount = async () => {
      setCheckingLimit(true)
      try {
        const { count, error: countErr } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', session.user.id)
          .in('role', ['owner', 'member'])

        if (countErr) throw countErr
        setUserTeamCount(count || 0)
      } catch (err) {
        console.error('Error fetching user team count:', err)
      } finally {
        setCheckingLimit(false)
      }
    }

    checkTeamCount()
  }, [session?.user?.id])

  const formatTag = (raw) => {
    let clean = raw.trim().toUpperCase().replace(/[\[\]]/g, '')
    if (clean.length > 5) clean = clean.slice(0, 5)
    return clean ? `[${clean}]` : ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter a team name.')
      return
    }

    const cleanTag = formatTag(tag)
    if (!cleanTag || cleanTag === '[]') {
      setError('Team tag is required (max 5 characters).')
      return
    }

    if (!session?.user?.id) {
      setError('You must be logged in to create a team.')
      return
    }

    if (userTeamCount >= 3) {
      setError("You've reached the 3-team limit.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const bannerUrl = getBrawlerBannerUrl(selectedBrawlerId)

      const teamPayload = {
        name: name.trim(),
        tag: cleanTag,
        banner_url: bannerUrl,
        description: description.trim() || null,
        owner_id: session.user.id
      }

      let teamData = null
      let teamError = null

      // Attempt to save with banner_brawler_id column if present in schema
      const resWithId = await supabase
        .from('teams')
        .insert([
          {
            ...teamPayload,
            banner_brawler_id: selectedBrawlerId ? String(selectedBrawlerId) : null
          }
        ])
        .select()
        .single()

      if (resWithId.error && resWithId.error.code === '42703') {
        // Column does not exist on db yet, fallback to standard payload
        const resFallback = await supabase
          .from('teams')
          .insert([teamPayload])
          .select()
          .single()
        teamData = resFallback.data
        teamError = resFallback.error
      } else {
        teamData = resWithId.data
        teamError = resWithId.error
      }

      if (teamError) throw teamError

      const newTeamId = teamData.id

      const { error: memberError } = await supabase
        .from('team_members')
        .insert([
          {
            team_id: newTeamId,
            profile_id: session.user.id,
            role: 'owner'
          }
        ])

      // Ignore 23505 (unique violation) if owner membership was already auto-inserted by database trigger
      if (memberError && memberError.code !== '23505') throw memberError

      navigate(`/team/${newTeamId}`)
    } catch (err) {
      console.error('Error creating team:', err)
      const formatted = formatActionError(err, null)
      if (formatted === 'Your account has been restricted.') {
        setError(formatted)
      } else {
        const msg = (err.message || '').toLowerCase()
        const isLimitErr =
          msg.includes('limit') ||
          msg.includes('maximum') ||
          (err.code === 'P0001' && msg.includes('3'))
        setError(isLimitErr ? "You've reached the 3-team limit." : (err.message || 'Failed to create team.'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const previewTag = formatTag(tag) || '[TAG]'

  return (
    <div className="min-h-screen text-ink-black flex flex-col font-body-md overflow-x-hidden selection:bg-scream-yellow selection:text-ink-black relative">
      {/* Shared Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-12">
        {/* Title */}
        <div className="mb-10 relative rotate-[-1deg]">
          <div className="bg-scream-yellow text-ink-black border-2 border-ink-black px-3.5 py-1 font-headline-sm text-xs uppercase -rotate-2 w-max shadow-tape mb-3 flex items-center gap-1.5 font-bold">
            <span className="text-battle-red font-bold">⚡</span>
            <span>TEAM SQUAD CREATION</span>
          </div>

          <h1
            className="font-display-xl text-5xl sm:text-7xl md:text-8xl uppercase tracking-tighter text-battle-red leading-none"
            style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0px #181716' }}
          >
            MAKE IT <span className="text-scream-yellow">OFFICIAL.</span>
          </h1>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-[#FFE5E7] border-2 border-ink-black shadow-hard text-battle-red font-label-bold text-xs uppercase font-bold">
            ⚠ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Form Area (Left) */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 flex flex-col gap-8">
            {/* Name & Tag */}
            <div
              className="bg-white p-6 shadow-hard border-2 border-ink-black rotate-[1deg] relative z-10"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, 100% calc(100% - 10px), 95% 100%, 90% calc(100% - 5px), 85% 100%, 80% calc(100% - 8px), 75% 100%, 70% calc(100% - 6px), 65% 100%, 60% calc(100% - 4px), 55% 100%, 50% calc(100% - 9px), 45% 100%, 40% calc(100% - 5px), 35% 100%, 30% calc(100% - 7px), 25% 100%, 20% calc(100% - 4px), 15% 100%, 10% calc(100% - 8px), 5% 100%, 0 calc(100% - 5px))'
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-headline-sm text-sm uppercase mb-2 text-ink-black font-bold">
                    TEAM NAME <span className="text-battle-red">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NOVA"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#FAF5EA] border-2 border-ink-black font-body-md text-sm p-3 focus:bg-scream-yellow/20 focus:outline-none transition-colors font-bold text-ink-black"
                  />
                </div>
                <div>
                  <label className="block font-headline-sm text-sm uppercase mb-2 text-ink-black font-bold">
                    TAG <span className="text-battle-red">*</span> <span className="text-xs font-normal text-on-surface-variant font-medium">(Max 5 chars)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NVA"
                    maxLength={5}
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="w-full bg-[#FAF5EA] border-2 border-ink-black font-body-md text-sm p-3 focus:bg-scream-yellow/20 focus:outline-none transition-colors font-bold text-ink-black uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Brawler Landscape Artwork Banner Selection */}
            <div
              className="bg-scream-yellow p-6 shadow-hard border-2 border-ink-black rotate-[-1deg] relative z-10"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, 100% calc(100% - 10px), 95% 100%, 90% calc(100% - 5px), 85% 100%, 80% calc(100% - 8px), 75% 100%, 70% calc(100% - 6px), 65% 100%, 60% calc(100% - 4px), 55% 100%, 50% calc(100% - 9px), 45% 100%, 40% calc(100% - 5px), 35% 100%, 30% calc(100% - 7px), 25% 100%, 20% calc(100% - 4px), 15% 100%, 10% calc(100% - 8px), 5% 100%, 0 calc(100% - 5px))'
              }}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                <label className="block font-headline-sm text-sm uppercase text-ink-black font-bold">
                  CHOOSE SQUAD BANNER
                </label>
                <input
                  type="text"
                  placeholder="Filter brawlers (e.g. Mortis, Shelly, Fang)..."
                  value={brawlerSearch}
                  onChange={(e) => setBrawlerSearch(e.target.value)}
                  className="bg-white border-2 border-ink-black px-2.5 py-1 text-xs font-body-md text-ink-black focus:outline-none w-full sm:w-64 font-bold"
                />
              </div>

              {loadingBrawlers ? (
                <div className="py-8 text-center font-headline-sm text-sm uppercase animate-pulse text-ink-black font-bold">
                  LOADING BRAWLERS...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto p-2 bg-[#FAF5EA] border-2 border-ink-black shadow-hard-sm">
                  {brawlers
                    .filter((b) =>
                      b.name.toLowerCase().includes(brawlerSearch.toLowerCase())
                    )
                    .map((brawler) => {
                      const isSelected = String(selectedBrawlerId) === String(brawler.id)
                      const portraitUrl = getBrawlerBannerUrl(brawler.id)

                      return (
                        <button
                          key={brawler.id}
                          type="button"
                          onClick={() => setSelectedBrawlerId(brawler.id)}
                          className={`h-24 border-2 border-ink-black relative overflow-hidden transition-all cursor-pointer flex flex-col justify-end p-2 bg-ink-black ${
                            isSelected
                              ? 'ring-4 ring-ink-black shadow-hard scale-105 z-10'
                              : 'opacity-85 hover:opacity-100 shadow-tape'
                          }`}
                        >
                          <img
                            src={portraitUrl}
                            alt={brawler.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />

                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>

                          <div className="relative z-10 flex flex-col items-start leading-none">
                            <span
                              className="text-white text-[12px] font-headline-sm uppercase leading-tight truncate w-full text-left font-bold"
                              style={{ textShadow: '1px 1px 0 #181716' }}
                            >
                              {brawler.name}
                            </span>
                          </div>

                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-battle-red text-white text-xs font-bold px-1.5 border border-ink-black z-20 shadow-tape">
                              ✓
                            </div>
                          )}
                        </button>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Description */}
            <div
              className="bg-white p-6 shadow-hard border-2 border-ink-black rotate-[1.5deg] relative z-10"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, 100% calc(100% - 10px), 95% 100%, 90% calc(100% - 5px), 85% 100%, 80% calc(100% - 8px), 75% 100%, 70% calc(100% - 6px), 65% 100%, 60% calc(100% - 4px), 55% 100%, 50% calc(100% - 9px), 45% 100%, 40% calc(100% - 5px), 35% 100%, 30% calc(100% - 7px), 25% 100%, 20% calc(100% - 4px), 15% 100%, 10% calc(100% - 8px), 5% 100%, 0 calc(100% - 5px))'
              }}
            >
              <label className="block font-headline-sm text-sm uppercase mb-2 text-ink-black font-bold">
                DESCRIPTION / RULES
              </label>
              <textarea
                rows="3"
                placeholder="e.g. Competitive 3v3 squad looking for regular Friendly and Power League sets. Power 11 required."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#FAF5EA] border-2 border-ink-black font-body-md text-sm p-3 focus:bg-scream-yellow/20 focus:outline-none transition-colors resize-none font-medium text-ink-black"
              />
            </div>

            {/* Limit Warning banner if 3 or more teams */}
            {userTeamCount >= 3 && (
              <div className="p-4 bg-battle-red text-white border-2 border-ink-black shadow-hard font-label-bold text-xs uppercase font-bold flex items-center gap-2">
                <span>⚠</span>
                <span>YOU'VE REACHED THE 3-TEAM LIMIT. LEAVE A TEAM BEFORE CREATING A NEW ONE.</span>
              </div>
            )}

            {/* Primary Submit Button or Limit Notice */}
            {userTeamCount >= 3 ? (
              <div className="bg-[#FAF5EA] text-on-surface-variant font-headline-lg text-lg uppercase py-4 px-8 border-2 border-ink-black shadow-tape rotate-[-1deg] text-center font-bold tracking-wider cursor-not-allowed opacity-80">
                YOU'VE REACHED THE 3-TEAM LIMIT
              </div>
            ) : (
              <button
                type="submit"
                disabled={submitting || checkingLimit}
                className="bg-battle-red text-white font-headline-lg text-lg uppercase py-4 px-8 border-2 border-ink-black shadow-hard rotate-[-1deg] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none hover:rotate-0 transition-all active:scale-95 cursor-pointer disabled:opacity-50 font-bold tracking-wider"
              >
                {submitting ? 'CREATING SQUAD...' : 'FOUND SQUAD ⚡'}
              </button>
            )}
          </form>

          {/* Live Preview Card (Right) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <span className="font-label-bold text-xs uppercase text-on-surface-variant tracking-wider font-bold">
              LIVE PREVIEW
            </span>

            <article
              className="bg-white border-2 border-ink-black shadow-hard p-6 flex flex-col gap-4 relative transform rotate-1"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, 100% 95%, 98% 100%, 96% 96%, 94% 99%, 92% 95%, 90% 100%, 88% 94%, 86% 98%, 84% 95%, 82% 100%, 80% 96%, 78% 99%, 76% 95%, 74% 100%, 72% 96%, 70% 99%, 68% 94%, 66% 98%, 64% 95%, 62% 100%, 60% 96%, 58% 99%, 56% 95%, 54% 100%, 52% 96%, 50% 99%, 48% 95%, 46% 100%, 44% 96%, 42% 99%, 40% 94%, 38% 98%, 36% 95%, 34% 100%, 32% 96%, 30% 99%, 28% 95%, 26% 100%, 24% 96%, 22% 99%, 20% 95%, 18% 100%, 16% 96%, 14% 99%, 12% 94%, 10% 98%, 8% 95%, 6% 100%, 4% 96%, 2% 99%, 0 95%)'
              }}
            >
              <div className="w-full h-32 border-b-2 border-ink-black border-dashed relative overflow-hidden flex items-end p-3 bg-ink-black">
                {selectedBrawlerId && (
                  <img
                    src={getBrawlerBannerUrl(selectedBrawlerId)}
                    alt="Preview Banner"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-ink-black/30"></div>
                <span className="relative z-10 font-label-bold text-[10px] uppercase text-white bg-ink-black/80 px-2 py-0.5 border border-white/30 backdrop-blur-sm font-bold">
                  PREVIEW CARD
                </span>
              </div>

              <div className="flex justify-between items-start mt-1">
                <div>
                  <h2 className="font-headline-lg text-2xl uppercase leading-none m-0 p-0 text-ink-black truncate font-bold">
                    {name || 'TEAM NAME'}
                  </h2>
                  <span className="font-body-md text-xs text-on-surface-variant font-bold">
                    {previewTag}
                  </span>
                </div>

                <div className="p-1 border-2 border-ink-black rounded-full w-11 h-11 flex items-center justify-center bg-paper-cream shadow-tape">
                  <span className="font-headline-sm text-base leading-none font-bold text-ink-black">1/6</span>
                </div>
              </div>

              <p className="font-body-md text-xs text-ink-black italic font-medium">
                "{description || 'Competitive squad ready for scrims and matchmaking.'}"
              </p>

              <div className="bg-electric-blue text-white border-2 border-ink-black px-3 py-1 text-xs font-label-bold uppercase text-center w-full mt-auto font-bold shadow-tape">
                LOOKING FOR PLAYERS
              </div>
            </article>
          </div>
        </div>
      </main>
    </div>
  )
}
