import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import Navigation from '../components/Navigation'
import UserAvatar from '../components/UserAvatar'
import LogResultsModal from '../components/LogResultsModal'
import NotFoundCard from '../components/NotFoundCard'
import dayjs from 'dayjs'

export default function MatchDetail() {
  const { id } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()

  const [match, setMatch] = useState(null)
  const [matchMaps, setMatchMaps] = useState([])
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const fetchMatchDetails = async () => {
    if (!id) return
    setLoading(true)
    setError(null)

    try {
      const { data: matchData, error: matchErr } = await supabase
        .from('matches')
        .select(`
          id,
          lobby_id,
          logged_by,
          created_at,
          result,
          profiles:logged_by ( id, display_name, main_brawler_name, main_brawler_icon_url ),
          lobbies:lobby_id (
            id,
            type,
            scheduled_time,
            slot_count,
            notes,
            host_id,
            team_id,
            profiles:host_id ( id, display_name, main_brawler_name, main_brawler_icon_url, brawl_tag ),
            teams:team_id ( id, name, tag ),
            lobby_maps ( id, map_id, map_name, mode, order_index )
          )
        `)
        .eq('id', id)
        .single()

      if (matchErr) throw matchErr
      setMatch(matchData)

      const { data: mmData, error: mmErr } = await supabase
        .from('match_maps')
        .select('*')
        .eq('match_id', id)
        .order('order_index', { ascending: true })

      if (mmErr) throw mmErr
      setMatchMaps(mmData || [])

      if (matchData?.lobby_id) {
        const { data: partData } = await supabase
          .from('lobby_participants')
          .select(`
            profile_id,
            joined_at,
            profiles:profile_id ( id, display_name, main_brawler_name, main_brawler_icon_url, brawl_tag )
          `)
          .eq('lobby_id', matchData.lobby_id)
          .order('joined_at', { ascending: true })

        setParticipants(partData || [])
      }
    } catch (err) {
      console.error('Error fetching match details:', err)
      setError('Match result not found or could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatchDetails()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-cream">
        <div className="font-headline-lg text-4xl uppercase animate-pulse">
          LOADING MATCH REPORT...
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <NotFoundCard
        badgeText="MATCH LOG NOT FOUND"
        title="RECORD PURGED OR INVALID."
        description="This combat match report could not be found, was deleted, or the match ID is invalid."
        primaryActionText="VIEW MATCH HISTORY ⚡"
        primaryActionLink="/matches"
        secondaryActionText="SCRIM BOARD"
        secondaryActionLink="/board"
      />
    )
  }

  const lobby = match.lobbies || {}
  const hostProfile = lobby.profiles || {}
  const loggedByProfile = match.profiles || {}
  const sortedLobbyMaps = [...(lobby.lobby_maps || [])].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  )

  const isHost = session?.user?.id === lobby.host_id
  const isParticipant = participants.some((p) => p.profile_id === session?.user?.id)
  const canEdit = isHost || isParticipant || session?.user?.id === match.logged_by

  const dateFormatted = dayjs(lobby.scheduled_time || match.created_at).format(
    'MMM D, YYYY · h:mm A'
  )
  const matchType = lobby.type === 'friendly' ? 'FRIENDLY' : 'POWER LEAGUE'
  const mapFormat = sortedLobbyMaps.length >= 5 ? 'BO5' : 'BO3'

  const combinedMaps = sortedLobbyMaps.map((lm, idx) => {
    const matchMapRow = matchMaps.find(
      (mm) => mm.lobby_map_id === lm.id || mm.order_index === (lm.order_index ?? idx)
    )
    return {
      ...lm,
      winner_label: matchMapRow?.winner_label || 'Unspecified',
      match_map_id: matchMapRow?.id
    }
  })

  const winnerCounts = {}
  combinedMaps.forEach((m) => {
    const winner = m.winner_label || 'Other'
    winnerCounts[winner] = (winnerCounts[winner] || 0) + 1
  })
  const winnerEntries = Object.entries(winnerCounts)

  return (
    <div className="min-h-screen text-ink-black flex flex-col font-body-md overflow-x-hidden selection:bg-scream-yellow selection:text-ink-black relative">
      {/* Shared Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="flex-grow max-w-6xl mx-auto px-margin-mobile md:px-margin-desktop py-10 w-full relative z-10">
        {/* Top Breadcrumb & Action Row */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/matches"
              className="font-headline-sm text-xs uppercase px-3 py-1.5 bg-white border-2 border-ink-black shadow-tape hover:translate-x-0.5 hover:translate-y-0.5 transition-all font-bold text-ink-black"
            >
              ← MATCH HISTORY
            </Link>
            <Link
              to={`/lobby/${lobby.id}`}
              className="font-headline-sm text-xs uppercase px-3 py-1.5 bg-[#FAF5EA] border-2 border-ink-black shadow-tape hover:translate-x-0.5 hover:translate-y-0.5 transition-all font-bold text-ink-black"
            >
              LOBBY ROOM ⚔
            </Link>
          </div>

          {canEdit && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="bg-scream-yellow text-ink-black border-2 border-ink-black px-4 py-1.5 font-headline-sm text-xs uppercase shadow-tape hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer font-bold"
            >
              EDIT RESULTS ⚙
            </button>
          )}
        </div>

        {/* Hero Section */}
        <header className="mb-12 relative">
          <div className="mb-3">
            <span className="font-label-bold text-ink-black uppercase tracking-widest text-xs inline-block bg-scream-yellow border-2 border-ink-black px-3 py-1 -rotate-1 shadow-tape font-bold">
              {matchType} · {mapFormat} · {dateFormatted}
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
            <div>
              <h1
                className="text-5xl md:text-7xl font-display-xl uppercase tracking-tighter text-battle-red leading-none"
                style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0px #181716' }}
              >
                {lobby.teams?.name || hostProfile.display_name || 'SCRIM'}{' '}
                <span className="text-scream-yellow">MATCH RESULTS.</span>
              </h1>
            </div>

            {/* Outcome Badges */}
            <div className="flex items-center gap-3">
              {winnerEntries.map(([name, count], i) => (
                <div
                  key={name}
                  className={`border-2 border-ink-black p-4 shadow-hard text-center transform font-bold ${
                    i % 2 === 0 ? '-rotate-2' : 'rotate-2'
                  } ${i === 0 ? 'bg-acid-green text-ink-black' : 'bg-scream-yellow text-ink-black'}`}
                >
                  <span className="font-label-bold text-xs uppercase block text-ink-black font-bold">
                    {name}
                  </span>
                  <span className="font-headline-lg text-3xl uppercase leading-none font-bold">
                    {count} {count === 1 ? 'WIN' : 'WINS'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Map Breakdown Section */}
        <section className="mb-14">
          <div className="flex items-center gap-4 mb-6 border-b-4 border-ink-black pb-3">
            <h2 className="font-headline-lg text-headline-lg uppercase text-ink-black font-bold tracking-tight">
              MAP BREAKDOWN
            </h2>
            <div className="flex-grow"></div>
            <span className="font-headline-sm text-sm bg-scream-yellow text-ink-black px-3 py-1 border-2 border-ink-black shadow-tape font-bold">
              {combinedMaps.length} MAPS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {combinedMaps.map((mapItem, idx) => {
              const rotation =
                idx % 3 === 0 ? '-rotate-1' : idx % 3 === 1 ? 'rotate-1' : '-rotate-2'
              const fallbackImg = `https://cdn.brawlify.com/maps/regular/${mapItem.map_id || 15000007}.png`
              const mapImage = mapItem.map_image_url || fallbackImg

              return (
                <div
                  key={mapItem.id || idx}
                  className={`bg-white border-2 border-ink-black shadow-hard flex flex-col min-h-[300px] transform ${rotation} hover:rotate-0 transition-transform relative`}
                  style={{
                    clipPath:
                      'polygon(0 0, 100% 0, 100% 97%, 95% 100%, 90% 98%, 85% 100%, 80% 97%, 75% 100%, 70% 98%, 65% 100%, 60% 97%, 55% 100%, 50% 98%, 45% 100%, 40% 97%, 35% 100%, 30% 98%, 25% 100%, 20% 97%, 15% 100%, 10% 98%, 5% 100%, 0 97%)'
                  }}
                >
                  <div className="p-4 border-b-2 border-ink-black bg-paper-cream flex justify-between items-start">
                    <div>
                      <span className="font-headline-sm text-xs bg-ink-black text-white px-2 py-0.5 uppercase font-bold">
                        SET {idx + 1}
                      </span>
                      <h3 className="font-headline-md text-2xl uppercase mt-1 truncate text-ink-black font-bold">
                        {mapItem.map_name || 'UNKNOWN MAP'}
                      </h3>
                      <p className="font-label-bold text-xs text-on-surface-variant uppercase font-bold">
                        {mapItem.mode || 'Brawl Stars'}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-center items-center relative text-center">
                    <div
                      className="absolute inset-0 opacity-10 bg-cover bg-center"
                      style={{ backgroundImage: `url(${mapImage})` }}
                    />

                    <div className="relative z-10">
                      <span className="font-label-bold text-xs uppercase text-on-surface-variant block mb-1 font-bold">
                        MAP WINNER
                      </span>
                      <div className="bg-acid-green text-ink-black font-headline-lg text-3xl uppercase px-4 py-2 border-2 border-ink-black shadow-hard inline-block font-bold">
                        🏆 {mapItem.winner_label}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Participants & Logger Footer Details */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-16">
          <div className="md:col-span-8 bg-white border-2 border-ink-black p-6 shadow-hard transform -rotate-1 relative">
            <h3 className="font-headline-sm text-xl uppercase mb-4 border-b-2 border-dashed border-ink-black/30 pb-2 text-ink-black font-bold">
              ⚔ SCRIM ROSTER
            </h3>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-3 bg-paper-cream p-2.5 border-2 border-ink-black shadow-tape">
                <div className="w-8 h-8 border border-ink-black overflow-hidden bg-white">
                  <UserAvatar
                    src={hostProfile.main_brawler_icon_url}
                    alt={hostProfile.display_name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <Link
                    to={`/player/${hostProfile.id}`}
                    className="font-headline-sm text-sm uppercase hover:underline truncate block text-ink-black font-bold"
                  >
                    {hostProfile.display_name || 'HOST'}
                  </Link>
                  <span className="text-[10px] font-label-bold bg-battle-red text-white px-1 uppercase font-bold">
                    HOST
                  </span>
                </div>
              </div>

              {participants
                .filter((p) => p.profile_id !== lobby.host_id)
                .map((p) => {
                  const prof = p.profiles || {}
                  return (
                    <div
                      key={p.profile_id}
                      className="flex items-center gap-3 bg-paper-cream p-2.5 border-2 border-ink-black shadow-tape"
                    >
                      <div className="w-8 h-8 border border-ink-black overflow-hidden bg-white">
                        <UserAvatar
                          src={prof.main_brawler_icon_url}
                          alt={prof.display_name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <Link
                          to={`/player/${p.profile_id}`}
                          className="font-headline-sm text-sm uppercase hover:underline truncate block text-ink-black font-bold"
                        >
                          {prof.display_name || 'PLAYER'}
                        </Link>
                        <span className="text-[10px] font-label-bold text-on-surface-variant block uppercase font-bold">
                          {prof.main_brawler_name || 'PLAYER'}
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          <div className="md:col-span-4 bg-paper-cream border-2 border-ink-black p-6 shadow-hard transform rotate-2 relative">
            <span className="font-headline-sm text-sm uppercase text-battle-red block mb-2 font-bold">
              MATCH LOG VERIFICATION
            </span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-2 border-ink-black bg-white overflow-hidden shadow-tape">
                <UserAvatar
                  src={loggedByProfile.main_brawler_icon_url}
                  alt={loggedByProfile.display_name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-headline-sm text-base uppercase block leading-tight text-ink-black font-bold">
                  LOGGED BY {loggedByProfile.display_name || 'BRAWLER'}
                </span>
                <span className="font-body-md text-xs text-on-surface-variant font-bold">
                  {dayjs(match.created_at).format('MMM D, YYYY')}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LogResultsModal
        lobby={lobby}
        existingMatch={match}
        existingMatchMaps={matchMaps}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          setIsEditModalOpen(false)
          fetchMatchDetails()
        }}
      />
    </div>
  )
}
