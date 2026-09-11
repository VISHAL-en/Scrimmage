import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import Navigation from '../components/Navigation'
import UserAvatar from '../components/UserAvatar'
import NotFoundCard from '../components/NotFoundCard'
import { getBrawlers } from '../lib/brawlers'

const statsCache = new Map()

export default function PlayerProfile() {
  const { id } = useParams()
  const { profile: currentProfile } = useAuth()
  const [profile, setProfile] = useState(null)
  const [playerTeam, setPlayerTeam] = useState(null)
  const [brawlerData, setBrawlerData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [playerStats, setPlayerStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState(null)

  const profileId = id || currentProfile?.id

  useEffect(() => {
    if (!profileId) return

    let isMounted = true
    setLoading(true)

    const loadProfileAndTeam = async () => {
      try {
        const { data: profData, error: profErr } = await supabase
          .from('public_profiles')
          .select('*')
          .eq('id', profileId)
          .single()

        if (!isMounted) return
        if (profErr) {
          setError('Player profile not found.')
          setLoading(false)
          return
        }

        setProfile(profData)

        if (profData?.main_brawler_id) {
          const brawlers = await getBrawlers()
          const found = brawlers.find((b) => String(b.id) === String(profData.main_brawler_id))
          if (found && isMounted) {
            setBrawlerData(found)
          }
        }

        const { data: teamMemberData } = await supabase
          .from('team_members')
          .select(`
            role,
            teams:team_id (
              id,
              name,
              tag,
              banner_url
            )
          `)
          .eq('profile_id', profileId)
          .in('role', ['member', 'owner'])
          .maybeSingle()

        if (isMounted && teamMemberData?.teams) {
          setPlayerTeam({
            ...teamMemberData.teams,
            role: teamMemberData.role
          })
        } else if (isMounted) {
          setPlayerTeam(null)
        }
      } catch (err) {
        console.error('Error fetching player profile data:', err)
        if (isMounted) setError('Player profile not found.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadProfileAndTeam()

    return () => {
      isMounted = false
    }
  }, [profileId])

  useEffect(() => {
    if (!profile?.brawl_tag) {
      setPlayerStats(null)
      setStatsLoading(false)
      setStatsError(null)
      return
    }

    const cleanTag = profile.brawl_tag.trim().replace(/^#+/, '').toUpperCase()
    if (!cleanTag) return

    if (statsCache.has(cleanTag)) {
      setPlayerStats(statsCache.get(cleanTag))
      setStatsLoading(false)
      setStatsError(null)
      return
    }

    let isMounted = true
    setStatsLoading(true)
    setStatsError(null)

    supabase.functions
      .invoke('get-player-stats', {
        body: { tag: cleanTag }
      })
      .then(({ data, error: funcError }) => {
        if (!isMounted) return

        if (funcError || data?.error) {
          console.warn('Could not fetch player stats:', funcError || data?.error)
          setStatsError(data?.error || "Couldn't find this player tag")
          setPlayerStats(null)
        } else if (data) {
          statsCache.set(cleanTag, data)
          setPlayerStats(data)
          setStatsError(null)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Network error invoking get-player-stats:', err)
          setStatsError("Couldn't find this player tag")
          setPlayerStats(null)
        }
      })
      .finally(() => {
        if (isMounted) setStatsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [profile?.brawl_tag])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-cream">
        <div className="font-headline-lg text-4xl uppercase animate-pulse">Loading Profile...</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <NotFoundCard
        badgeText="BRAWLER NOT FOUND"
        title="PLAYER RETIRED OR INVISIBLE."
        description="Could not locate this player's scrim profile. Check the player ID or search for teammates in the directory."
        primaryActionText="RETURN TO LOBBY BOARD ⚡"
        primaryActionLink="/board"
        secondaryActionText="TEAM DIRECTORY"
        secondaryActionLink="/teams"
      />
    )
  }

  const isOwner = currentProfile?.id === profile.id
  const avatarUrl = profile.main_brawler_icon_url || brawlerData?.imageUrl

  return (
    <div className="min-h-screen text-ink-black font-body-md overflow-x-hidden selection:bg-scream-yellow selection:text-ink-black relative">
      {/* Shared Navigation */}
      <Navigation />

      <main className="w-full max-w-5xl mx-auto px-margin-mobile md:px-margin-desktop py-12 flex flex-col md:flex-row gap-8 items-start justify-center">
        {/* Trading Card (Left) */}
        <div className="relative w-full md:w-1/2 flex justify-center pb-12">
          {/* Scrim Tape Top */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 w-36 h-9 bg-scream-yellow border-2 border-ink-black flex items-center justify-between px-2 shadow-tape rotate-2 font-bold text-ink-black">
            <span className="text-battle-red font-bold text-sm">⚡</span>
            <span className="font-headline-sm text-xs uppercase text-ink-black">SCRIM CARD</span>
            <span className="text-battle-red font-bold text-sm">⚡</span>
          </div>

          {/* Main Card */}
          <div
            className="relative bg-white border-2 border-ink-black shadow-hard w-full max-w-sm pb-8 -rotate-1 z-10 hover:rotate-0 transition-transform"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% 97%, 95% 100%, 90% 98%, 85% 100%, 80% 97%, 75% 100%, 70% 98%, 65% 100%, 60% 97%, 55% 100%, 50% 98%, 45% 100%, 40% 97%, 35% 100%, 30% 98%, 25% 100%, 20% 97%, 15% 100%, 10% 98%, 5% 100%, 0 97%)'
            }}
          >
            {/* Avatar Area */}
            <div className="w-full aspect-[4/3] bg-paper-cream border-b-2 border-ink-black relative overflow-hidden flex items-center justify-center p-4">
              <UserAvatar
                src={avatarUrl}
                alt={profile.display_name}
                className="w-full h-full object-contain drop-shadow-md"
              />

              {/* Status Badge */}
              <div className="absolute bottom-4 left-4 bg-scream-yellow border-2 border-ink-black px-3 py-1 text-label-bold font-label-bold uppercase shadow-tape -rotate-3 text-ink-black font-bold">
                {profile.main_brawler_name ? `MAIN: ${profile.main_brawler_name}` : 'NO MAIN SET'}
              </div>
            </div>

            {/* Info Area */}
            <div className="p-6 relative">
              <h1
                className="font-display-xl text-3xl sm:text-4xl uppercase mb-1 text-battle-red leading-none"
                style={{
                  WebkitTextStroke: '1.5px #181716',
                  textShadow: '2px 2px 0 #181716'
                }}
              >
                {profile.display_name || 'ANONYMOUS'}
              </h1>

              <p className="font-body-lg text-ink-black font-bold mb-4">
                {profile.brawl_tag || '#NO-TAG'}
              </p>

              {/* REAL TEAM BADGE */}
              {playerTeam ? (
                <Link
                  to={`/team/${playerTeam.id}`}
                  className="mb-3 p-3 bg-scream-yellow border-2 border-ink-black shadow-tape flex items-center justify-between transform -rotate-1 hover:rotate-0 transition-transform block text-ink-black font-bold"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-battle-red font-bold text-sm">⚡</span>
                    <div className="overflow-hidden">
                      <div className="font-label-bold text-[10px] uppercase text-ink-black leading-none font-bold">
                        TEAM · {playerTeam.role === 'owner' ? 'CAPTAIN' : 'MEMBER'}
                      </div>
                      <div className="font-headline-sm text-base uppercase leading-tight text-ink-black truncate font-bold">
                        {playerTeam.name}{' '}
                        {playerTeam.tag
                          ? playerTeam.tag.startsWith('[')
                            ? playerTeam.tag
                            : `[${playerTeam.tag}]`
                          : ''}
                      </div>
                    </div>
                  </div>
                  <span className="font-headline-sm text-xs uppercase underline text-ink-black font-bold">VIEW →</span>
                </Link>
              ) : isOwner ? (
                <Link
                  to="/teams"
                  className="mb-3 p-2.5 bg-[#FAF5EA] border-2 border-dashed border-ink-black flex items-center justify-between text-xs font-label-bold uppercase hover:bg-white transition-colors block font-bold"
                >
                  <span className="text-on-surface-variant font-bold">NO TEAM JOINED</span>
                  <span className="text-battle-red underline font-bold">+ FIND A SQUAD</span>
                </Link>
              ) : null}

              {/* MAIN BRAWLER BADGE */}
              {profile.main_brawler_name && (
                <div className="mt-2 p-3 bg-[#FAF5EA] border-2 border-ink-black shadow-tape flex items-center gap-3 transform rotate-1">
                  <div className="w-12 h-12 bg-white border border-ink-black p-1 shadow-tape flex items-center justify-center overflow-hidden flex-shrink-0">
                    <UserAvatar
                      src={avatarUrl}
                      alt={profile.main_brawler_name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="font-label-bold text-xs uppercase text-on-surface-variant font-bold">
                      Main Brawler
                    </div>
                    <div className="font-headline-sm text-lg uppercase leading-none text-battle-red font-bold">
                      {profile.main_brawler_name}
                    </div>
                  </div>
                </div>
              )}

              {/* Role Sticker */}
              <div className="absolute top-4 right-4 bg-battle-red text-white border-2 border-ink-black px-3 py-1 font-headline-sm text-xs uppercase shadow-tape rotate-3 font-bold">
                SET RUNNER
              </div>
            </div>
          </div>
        </div>

        {/* Stats & History Section (Right) */}
        <div className="w-full md:w-1/2 flex flex-col gap-6">
          {/* Section Title with Scrim Tape */}
          <div className="flex items-center justify-between border-b-4 border-ink-black pb-2">
            <h2 className="font-headline-md text-2xl uppercase text-ink-black font-bold tracking-tight">
              BRAWL STATS
            </h2>
            {profile.brawl_tag && (
              <span className="font-label-bold text-xs bg-scream-yellow text-ink-black px-2.5 py-0.5 border border-ink-black uppercase shadow-tape font-bold">
                {profile.brawl_tag}
              </span>
            )}
          </div>

          {/* Loading Skeleton */}
          {statsLoading && (
            <div className="grid grid-cols-2 gap-4 animate-pulse">
              <div className="bg-white/70 border-2 border-ink-black p-4 shadow-hard h-24"></div>
              <div className="bg-white/70 border-2 border-ink-black p-4 shadow-hard h-24"></div>
              <div className="bg-white/70 border-2 border-ink-black p-4 shadow-hard h-24"></div>
              <div className="bg-white/70 border-2 border-ink-black p-4 shadow-hard h-24"></div>
            </div>
          )}

          {/* Error Notice */}
          {!statsLoading && statsError && (
            <div className="p-4 bg-[#FFE5E7] border-2 border-ink-black shadow-tape text-battle-red font-label-bold text-xs uppercase flex items-center justify-between font-bold">
              <span>{statsError}</span>
              {isOwner && (
                <Link to="/settings" className="underline hover:font-bold">
                  Update Tag
                </Link>
              )}
            </div>
          )}

          {/* No Tag Linked Notice */}
          {!statsLoading && !profile.brawl_tag && (
            <div className="p-6 bg-white border-2 border-dashed border-ink-black text-center">
              <p className="font-headline-sm text-lg uppercase text-battle-red mb-2 font-bold">
                No Player Tag Linked
              </p>
              <p className="font-body-md text-xs text-ink-black mb-4 font-bold">
                Link your Brawl Stars tag to show live trophies, victories, and club stats on your profile.
              </p>
              {isOwner && (
                <Link
                  to="/settings"
                  className="inline-block bg-battle-red text-white font-headline-sm text-xs uppercase px-5 py-2.5 border-2 border-ink-black shadow-hard font-bold tracking-wider"
                >
                  + Link Player Tag
                </Link>
              )}
            </div>
          )}

          {/* Real Stats Cards Grid */}
          {!statsLoading && playerStats && (
            <div className="grid grid-cols-2 gap-4">
              {/* Trophies */}
              <div className="bg-white border-2 border-ink-black p-4 shadow-hard rotate-1 relative">
                <p className="font-label-bold text-xs text-on-surface-variant uppercase mb-1 font-bold">
                  Current Trophies
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-lg text-3xl text-ink-black font-bold">
                    {playerStats.trophies?.toLocaleString() || '0'}
                  </span>
                  <span className="text-sm">🏆</span>
                </div>
              </div>

              {/* Highest Trophies */}
              <div className="bg-white border-2 border-ink-black p-4 shadow-hard -rotate-2 relative">
                <p className="font-label-bold text-xs text-on-surface-variant uppercase mb-1 font-bold">
                  Highest Trophies
                </p>
                <p className="font-headline-lg text-3xl text-battle-red font-bold">
                  {playerStats.highestTrophies?.toLocaleString() || '0'}
                </p>
              </div>

              {/* 3v3 Victories */}
              <div className="bg-white border-2 border-ink-black p-4 shadow-hard rotate-2">
                <p className="font-label-bold text-xs text-on-surface-variant uppercase mb-1 font-bold">
                  3v3 Victories
                </p>
                <p className="font-headline-lg text-3xl text-electric-blue font-bold">
                  {(
                    playerStats['3vs3Victories'] ||
                    playerStats.threeVsThreeVictories ||
                    0
                  ).toLocaleString()}
                </p>
              </div>

              {/* Solo / Duo Victories */}
              <div className="bg-white border-2 border-ink-black p-4 shadow-hard -rotate-1">
                <p className="font-label-bold text-xs text-on-surface-variant uppercase mb-1 font-bold">
                  Solo / Duo Victories
                </p>
                <p className="font-headline-md text-2xl uppercase text-ink-black mt-1 font-bold">
                  {playerStats.soloVictories || 0} / {playerStats.duoVictories || 0}
                </p>
              </div>

              {/* Club & Exp Level Banner */}
              <div className="bg-paper-cream border-2 border-ink-black p-3 shadow-hard col-span-2 flex justify-between items-center transform rotate-1">
                <div>
                  <span className="font-label-bold text-[10px] text-on-surface-variant uppercase block font-bold">
                    Club
                  </span>
                  <span className="font-headline-sm text-sm uppercase text-battle-red font-bold">
                    {playerStats.club?.name ? `[${playerStats.club.name}]` : 'NO CLUB'}
                  </span>
                </div>
                <div>
                  <span className="font-label-bold text-[10px] text-on-surface-variant uppercase block text-right font-bold">
                    Experience
                  </span>
                  <span className="font-headline-sm text-sm uppercase text-ink-black font-bold">
                    LVL {playerStats.expLevel || '--'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Activity Placeholder */}
          <div
            className="bg-white border-2 border-ink-black p-6 shadow-hard relative -rotate-1 mt-2"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% calc(100% - 10px), 95% 100%, 90% calc(100% - 5px), 85% 100%, 80% calc(100% - 8px), 75% 100%, 70% calc(100% - 6px), 65% 100%, 60% calc(100% - 9px), 55% 100%, 50% calc(100% - 5px), 45% 100%, 40% calc(100% - 8px), 35% 100%, 30% calc(100% - 6px), 25% 100%, 20% calc(100% - 9px), 15% 100%, 10% calc(100% - 5px), 5% 100%, 0 calc(100% - 10px))'
            }}
          >
            <h2 className="font-headline-md text-xl text-ink-black mb-4 uppercase border-b-2 border-dashed border-ink-black/40 pb-2 font-bold">
              RECENT ACTIVITY
            </h2>
            <div className="py-6 text-center text-ink-black font-label-bold uppercase text-xs font-bold">
              No recorded match sets yet.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
