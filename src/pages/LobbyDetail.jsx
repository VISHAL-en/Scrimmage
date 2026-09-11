import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import Navigation from '../components/Navigation'
import UserAvatar from '../components/UserAvatar'
import LogResultsModal from '../components/LogResultsModal'
import NotFoundCard from '../components/NotFoundCard'
import { isProfane } from '../lib/profanity'
import { formatActionError } from '../lib/authErrors'
import dayjs from 'dayjs'
import isToday from 'dayjs/plugin/isToday'

dayjs.extend(isToday)

export default function LobbyDetail() {
  const { id } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()

  const [lobby, setLobby] = useState(null)
  const [participants, setParticipants] = useState([])
  const [maps, setMaps] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Chat Moderation & Errors
  const [chatWarning, setChatWarning] = useState('')
  const [chatError, setChatError] = useState('')
  const [reportSuccess, setReportSuccess] = useState('')
  const [openMenuMsgId, setOpenMenuMsgId] = useState(null)
  const [reportingMsgId, setReportingMsgId] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)

  // Matches State
  const [existingMatch, setExistingMatch] = useState(null)
  const [existingMatchMaps, setExistingMatchMaps] = useState([])
  const [isLogResultsOpen, setIsLogResultsOpen] = useState(false)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)

  // Join As Team State
  const [isJoinTeamModalOpen, setIsJoinTeamModalOpen] = useState(false)
  const [captainTeams, setCaptainTeams] = useState([])
  const [captainTeamsLoading, setCaptainTeamsLoading] = useState(false)
  const [captainTeamsError, setCaptainTeamsError] = useState(null)
  const [selectedTeamId, setSelectedTeamId] = useState(null)

  // Team Code State
  const [teamCode, setTeamCode] = useState(null)
  const [teamCodeInput, setTeamCodeInput] = useState('')
  const [isEditingCode, setIsEditingCode] = useState(false)
  const [savingCode, setSavingCode] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [codeError, setCodeError] = useState(null)
  const [copiedJoinCode, setCopiedJoinCode] = useState(false)

  const handleCopyJoinCode = () => {
    if (!lobby?.join_code) return
    navigator.clipboard.writeText(lobby.join_code)
    setCopiedJoinCode(true)
    setTimeout(() => setCopiedJoinCode(false), 2000)
  }

  const chatEndRef = useRef(null)

  const fetchTeamCode = async () => {
    if (!id || !session?.user?.id) {
      setTeamCode(null)
      return
    }
    try {
      const { data, error: rpcErr } = await supabase.rpc('get_team_code', {
        lobby_id_param: id
      })
      if (!rpcErr && data !== undefined) {
        setTeamCode(data)
        if (data) {
          setTeamCodeInput(data)
        }
      }
    } catch (err) {
      console.error('Error fetching team code via RPC:', err)
    }
  }

  const fetchCaptainTeams = async () => {
    if (!session?.user?.id) return
    setCaptainTeamsLoading(true)
    setCaptainTeamsError(null)
    try {
      const { data, error: err } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          teams:team_id (
            id,
            name,
            tag,
            banner_url,
            owner_id,
            team_members (
              profile_id,
              role,
              profiles:profile_id (
                id,
                display_name,
                main_brawler_name,
                main_brawler_icon_url,
                brawl_tag
              )
            )
          )
        `)
        .eq('profile_id', session.user.id)
        .eq('role', 'owner')

      if (err) throw err

      const teamsList = (data || [])
        .map((item) => item.teams)
        .filter(Boolean)
        .map((t) => {
          const approvedMembers = (t.team_members || []).filter(
            (m) => m.role === 'owner' || m.role === 'member'
          )
          return {
            ...t,
            approvedMembers
          }
        })

      setCaptainTeams(teamsList)
      if (teamsList.length > 0) {
        setSelectedTeamId(teamsList[0].id)
      }
    } catch (err) {
      console.error('Error fetching captain teams:', err)
      setCaptainTeamsError(err.message || 'Failed to load your squads.')
    } finally {
      setCaptainTeamsLoading(false)
    }
  }

  const fetchLobbyData = async () => {
    if (!id) return
    try {
      // 1. Fetch lobby details (team_code is intentionally omitted for security)
      const { data: lobbyData, error: lobbyErr } = await supabase
        .from('lobbies')
        .select(`
          id,
          type,
          scheduled_time,
          slot_count,
          status,
          notes,
          host_id,
          team_id,
          join_code,
          profiles:host_id ( id, display_name, main_brawler_name, main_brawler_icon_url, brawl_tag ),
          teams:team_id ( id, name, tag )
        `)
        .eq('id', id)
        .single()

      if (lobbyErr) throw lobbyErr
      setLobby(lobbyData)

      // 2. Fetch lobby maps
      const { data: mapsData, error: mapsErr } = await supabase
        .from('lobby_maps')
        .select('*')
        .eq('lobby_id', id)
        .order('order_index', { ascending: true })

      if (mapsErr) throw mapsErr
      setMaps(mapsData || [])

      // 3. Fetch participants
      const { data: partData, error: partErr } = await supabase
        .from('lobby_participants')
        .select(`
          profile_id,
          joined_at,
          team_id,
          profiles:profile_id ( id, display_name, main_brawler_name, main_brawler_icon_url, brawl_tag ),
          teams:team_id ( id, name, tag )
        `)
        .eq('lobby_id', id)
        .order('joined_at', { ascending: true })

      if (partErr) throw partErr
      setParticipants(partData || [])

      // 4. Fetch existing match results if any
      const { data: matchData } = await supabase
        .from('matches')
        .select(`
          id,
          lobby_id,
          logged_by,
          created_at,
          profiles:logged_by ( display_name )
        `)
        .eq('lobby_id', id)
        .maybeSingle()

      if (matchData) {
        setExistingMatch(matchData)
        const { data: mmData } = await supabase
          .from('match_maps')
          .select('*')
          .eq('match_id', matchData.id)
          .order('order_index', { ascending: true })

        setExistingMatchMaps(mmData || [])
      } else {
        setExistingMatch(null)
        setExistingMatchMaps([])
      }
    } catch (err) {
      console.error('Error fetching lobby detail:', err)
      setError('Lobby not found or failed to load.')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    if (!id) return
    try {
      const { data, error: msgErr } = await supabase
        .from('messages')
        .select(`
          id,
          lobby_id,
          sender_id,
          content,
          created_at,
          profiles:sender_id ( display_name, main_brawler_icon_url )
        `)
        .eq('lobby_id', id)
        .order('created_at', { ascending: true })

      if (msgErr) throw msgErr
      setMessages(data || [])
    } catch (err) {
      console.error('Error fetching messages:', err)
    }
  }

  useEffect(() => {
    fetchLobbyData()
    fetchMessages()
    fetchTeamCode()

    const lobbyChannel = supabase
      .channel(`lobby-room-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lobbies', filter: `id=eq.${id}` },
        () => {
          fetchLobbyData()
          fetchTeamCode()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lobby_participants', filter: `lobby_id=eq.${id}` },
        () => {
          fetchLobbyData()
          fetchTeamCode()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `lobby_id=eq.${id}` },
        () => fetchMessages()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `lobby_id=eq.${id}` },
        () => fetchLobbyData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(lobbyChannel)
    }
  }, [id, session?.user?.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleJoin = async () => {
    if (!session?.user?.id || !lobby) return
    setActionLoading(true)
    try {
      const { error: joinErr } = await supabase.from('lobby_participants').insert([
        {
          lobby_id: lobby.id,
          profile_id: session.user.id
        }
      ])
      if (joinErr) throw joinErr
      await fetchLobbyData()
    } catch (err) {
      console.error('Error joining lobby:', err)
      alert(formatActionError(err, 'Could not join lobby'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenJoinAsTeam = () => {
    setIsJoinModalOpen(false)
    setIsJoinTeamModalOpen(true)
    fetchCaptainTeams()
  }

  const handleJoinAsTeam = async () => {
    const selectedTeam = captainTeams.find((t) => t.id === selectedTeamId) || captainTeams[0]
    if (!session?.user?.id || !lobby || !selectedTeam) return
    const memberIds = (selectedTeam.approvedMembers || []).map((m) => m.profile_id)
    if (memberIds.length === 0) {
      alert('This squad has no approved members.')
      return
    }
    if (memberIds.length > openSlotsCount) {
      alert(`This lobby only has ${openSlotsCount} open slots, but your squad has ${memberIds.length} members.`)
      return
    }

    setActionLoading(true)
    try {
      const { data, error: rpcErr } = await supabase.rpc('join_lobby_as_team', {
        target_lobby_id: lobby.id,
        target_team_id: selectedTeam.id,
        selected_member_ids: memberIds
      })

      if (rpcErr) throw rpcErr
      setIsJoinTeamModalOpen(false)
      await fetchLobbyData()
    } catch (err) {
      console.error('Error joining as team:', err)
      alert(formatActionError(err, 'Could not join lobby as team.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeave = async () => {
    if (!session?.user?.id || !lobby) return
    if (!window.confirm('Are you sure you want to leave this scrim?')) return
    setActionLoading(true)
    try {
      const { error: leaveErr } = await supabase
        .from('lobby_participants')
        .delete()
        .eq('lobby_id', lobby.id)
        .eq('profile_id', session.user.id)

      if (leaveErr) throw leaveErr
      await fetchLobbyData()
    } catch (err) {
      console.error('Error leaving lobby:', err)
      alert(err.message || 'Could not leave lobby')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelLobby = async () => {
    if (!session?.user?.id || !lobby || lobby.host_id !== session.user.id) return
    if (!window.confirm('Are you sure you want to cancel this entire scrim lobby?')) return
    setActionLoading(true)
    try {
      const { error: cancelErr } = await supabase
        .from('lobbies')
        .update({ status: 'cancelled' })
        .eq('id', lobby.id)

      if (cancelErr) throw cancelErr
      await fetchLobbyData()
    } catch (err) {
      console.error('Error cancelling lobby:', err)
      alert(err.message || 'Could not cancel lobby')
    } finally {
      setActionLoading(false)
    }
  }

  const handleKickParticipant = async (participantProfileId, participantName) => {
    if (!session?.user?.id || !lobby || lobby.host_id !== session.user.id) return
    if (!participantProfileId || participantProfileId === lobby.host_id) return

    const confirmMsg = `Remove ${participantName || 'this player'} from this lobby?`
    if (!window.confirm(confirmMsg)) return

    setActionLoading(true)
    try {
      const { error: kickErr } = await supabase
        .from('lobby_participants')
        .delete()
        .eq('lobby_id', lobby.id)
        .eq('profile_id', participantProfileId)

      if (kickErr) throw kickErr

      // Immediate local state update for snappy UI feedback
      setParticipants((prev) => prev.filter((p) => p.profile_id !== participantProfileId))
      await fetchLobbyData()
    } catch (err) {
      console.error('Error kicking participant:', err)
      alert(formatActionError(err, 'Failed to remove participant.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !session?.user?.id || !lobby) return

    const content = newMessage.trim()

    // 1. Client-side profanity check
    if (isProfane(content)) {
      setChatWarning('Message contains prohibited language and cannot be sent.')
      setTimeout(() => setChatWarning(''), 5000)
      return
    }

    setChatWarning('')
    setChatError('')
    setNewMessage('')

    try {
      const { error: sendErr } = await supabase.from('messages').insert([
        {
          lobby_id: lobby.id,
          sender_id: session.user.id,
          content
        }
      ])

      if (sendErr) throw sendErr
    } catch (err) {
      console.error('Error sending message:', err)
      const exactMsg = formatActionError(err, 'Could not send message.')
      setChatError(exactMsg)
      setTimeout(() => setChatError(''), 6000)
    }
  }

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return
    setOpenMenuMsgId(null)
    try {
      const { error: delErr } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)

      if (delErr) throw delErr
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    } catch (err) {
      console.error('Error deleting message:', err)
      setChatError(err.message || 'Failed to delete message.')
      setTimeout(() => setChatError(''), 5000)
    }
  }

  const handleOpenReportModal = (messageId) => {
    setOpenMenuMsgId(null)
    setReportingMsgId(messageId)
    setReportReason('')
  }

  const handleSubmitReport = async (e) => {
    if (e) e.preventDefault()
    if (!reportingMsgId || !session?.user?.id) return

    setSubmittingReport(true)
    try {
      const { error: repErr } = await supabase.from('message_reports').insert([
        {
          message_id: reportingMsgId,
          reported_by: session.user.id,
          reason: reportReason.trim() || 'Inappropriate message content'
        }
      ])

      if (repErr) throw repErr
      setReportSuccess('Message reported. Thank you for helping keep chat clean!')
      setReportingMsgId(null)
      setReportReason('')
      setTimeout(() => setReportSuccess(''), 4000)
    } catch (err) {
      console.error('Error reporting message:', err)
      setChatError(err.message || 'Failed to submit report.')
      setTimeout(() => setChatError(''), 5000)
    } finally {
      setSubmittingReport(false)
    }
  }

  const handleSaveTeamCode = async (e) => {
    if (e) e.preventDefault()
    if (!lobby || session?.user?.id !== lobby.host_id) return
    setSavingCode(true)
    setCodeError(null)

    try {
      const cleanedCode = teamCodeInput.trim().toUpperCase()
      const { error: updateErr } = await supabase
        .from('lobbies')
        .update({ team_code: cleanedCode || null })
        .eq('id', lobby.id)

      if (updateErr) throw updateErr
      setTeamCode(cleanedCode || null)
      setIsEditingCode(false)
    } catch (err) {
      console.error('Error saving team code:', err)
      setCodeError(err.message || 'Failed to save team code.')
    } finally {
      setSavingCode(false)
    }
  }

  const handleCopyTeamCode = async () => {
    if (!teamCode) return
    try {
      await navigator.clipboard.writeText(teamCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch (err) {
      console.error('Failed to copy team code:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-cream">
        <div className="font-headline-lg text-4xl uppercase animate-pulse">
          LOADING LOBBY...
        </div>
      </div>
    )
  }

  if (error || !lobby) {
    return (
      <NotFoundCard
        badgeText="LOBBY NOT FOUND"
        title="SCRIM LOBBY VANISHED."
        description="This scrim lobby does not exist, was cancelled by the host, or has expired."
        primaryActionText="BROWSE OPEN SCRIMS ⚡"
        primaryActionLink="/board"
        secondaryActionText="MY LOBBIES"
        secondaryActionLink="/my-lobbies"
      />
    )
  }

  const isHost = session?.user?.id === lobby.host_id
  const isParticipant = participants.some((p) => p.profile_id === session?.user?.id)
  const isFull = participants.length >= lobby.slot_count
  const isCancelled = lobby.status === 'cancelled'
  const isExpired = new Date(lobby.scheduled_time).getTime() + 15 * 60 * 1000 < Date.now()
  const isPastLobby =
    new Date(lobby.scheduled_time).getTime() < Date.now() || lobby.status === 'completed'
  const canLogResults = isHost || isParticipant

  const hostName = lobby.profiles?.display_name || 'UNKNOWN HOST'
  const hostAvatar = lobby.profiles?.main_brawler_icon_url
  const isFriendly = lobby.type === 'friendly'
  const dateStr = dayjs(lobby.scheduled_time).isToday()
    ? 'TONIGHT'
    : dayjs(lobby.scheduled_time).format('ddd, MMM D')
  const timeStr = dayjs(lobby.scheduled_time).format('h:mm A')

  const openSlotsCount = Math.max(0, lobby.slot_count - participants.length)

  return (
    <div className="min-h-screen text-ink-black overflow-x-hidden font-body-md selection:bg-scream-yellow selection:text-ink-black">
      {/* Shared Navigation */}
      <Navigation />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left Column: Lobby Info & Map Set */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Header Section */}
          <header className="relative -rotate-1 mb-2">
            {/* Status Sticker */}
            <div
              className={`absolute -top-6 -left-4 ${
                isCancelled
                  ? 'bg-battle-red text-white'
                  : existingMatch
                  ? 'bg-acid-green text-ink-black'
                  : isExpired
                  ? 'bg-[#EFE6D8] text-ink-black'
                  : isFull
                  ? 'bg-battle-red text-white'
                  : 'bg-scream-yellow text-ink-black'
              } border-2 border-ink-black px-3.5 py-1 -rotate-6 shadow-tape z-20 font-bold`}
            >
              <span className="font-headline-sm text-headline-sm uppercase">
                {isCancelled
                  ? 'CANCELLED'
                  : existingMatch
                  ? 'MATCH COMPLETED'
                  : isExpired
                  ? 'EXPIRED SCRIM'
                  : isFull
                  ? 'FULL LOBBY'
                  : 'OPEN SCRIM'}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-4 pt-4">
              <h1
                className="font-display-xl text-5xl md:text-7xl uppercase text-battle-red leading-none"
                style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0px #181716' }}
              >
                SCRIM <span className="text-scream-yellow">DETAILS.</span>
              </h1>
            </div>
          </header>

          {/* Results Banner / Log Results Section */}
          {existingMatch ? (
            <div className="bg-white border-2 border-ink-black shadow-hard p-6 transform rotate-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-battle-red font-bold text-lg">⚡</span>
                  <span className="font-headline-sm text-lg uppercase text-ink-black font-bold">
                    RESULTS HAVE BEEN LOGGED
                  </span>
                </div>
                <p className="font-body-md text-xs text-on-surface-variant font-bold mt-1">
                  View full map-by-map winner breakdowns, player statistics, and match log.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  to={`/match/${existingMatch.id}`}
                  className="flex-1 sm:flex-initial bg-scream-yellow text-ink-black border-2 border-ink-black px-5 py-2.5 font-headline-sm text-sm uppercase shadow-tape hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-center font-bold"
                >
                  VIEW MATCH RESULTS →
                </Link>
                {canLogResults && (
                  <button
                    type="button"
                    onClick={() => setIsLogResultsOpen(true)}
                    className="bg-[#FAF5EA] text-ink-black border-2 border-ink-black px-3.5 py-2.5 font-headline-sm text-xs uppercase shadow-tape hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer font-bold"
                  >
                    EDIT ⚙
                  </button>
                )}
              </div>
            </div>
          ) : isPastLobby && canLogResults ? (
            <div className="bg-scream-yellow border-2 border-ink-black shadow-hard p-6 transform -rotate-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="font-headline-sm text-lg uppercase text-ink-black block font-bold">
                  ⚡ THIS SCRIM HAS ENDED — LOG THE RESULTS!
                </span>
                <p className="font-body-md text-xs text-ink-black font-bold mt-1">
                  Record who won each map in this match set to preserve your match history.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsLogResultsOpen(true)}
                className="w-full sm:w-auto bg-battle-red text-white border-2 border-ink-black px-6 py-3 font-headline-sm text-sm uppercase shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer font-bold tracking-wider"
              >
                LOG RESULTS ⚡
              </button>
            </div>
          ) : null}

          {/* Lobby Details Card */}
          <div
            className="bg-white border-2 border-ink-black shadow-hard p-6 md:p-8 flex flex-col gap-6 relative transform rotate-1"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% 97%, 95% 100%, 90% 98%, 85% 100%, 80% 97%, 75% 100%, 70% 98%, 65% 100%, 60% 97%, 55% 100%, 50% 98%, 45% 100%, 40% 97%, 35% 100%, 30% 98%, 25% 100%, 20% 97%, 15% 100%, 10% 98%, 5% 100%, 0 97%)'
            }}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 border-2 border-ink-black bg-paper-cream flex items-center justify-center overflow-hidden shadow-tape">
                  <UserAvatar src={hostAvatar} alt={hostName} className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="font-headline-md text-2xl uppercase leading-none">
                    {hostName} {lobby.teams ? `| [${lobby.teams.tag || 'TEAM'}]` : ''}
                  </div>
                  {lobby.profiles?.main_brawler_name && (
                    <span className="text-xs font-label-bold uppercase text-on-surface-variant">
                      Main: {lobby.profiles.main_brawler_name}
                    </span>
                  )}
                </div>
              </div>

              <div className="h-0.5 w-full bg-ink-black/20 my-1"></div>

              {lobby.join_code && (
                <div className="bg-[#FAF5EA] border-2 border-ink-black px-4 py-3 shadow-tape flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-battle-red font-bold text-base">⚡</span>
                    <span className="font-label-bold text-xs uppercase text-on-surface-variant font-bold">
                      JOIN CODE:
                    </span>
                    <span className="font-headline-sm text-xl uppercase tracking-widest text-ink-black font-bold select-all bg-white px-3 py-1 border-2 border-ink-black shadow-tape">
                      {lobby.join_code}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyJoinCode}
                    className="bg-scream-yellow hover:bg-white text-ink-black border-2 border-ink-black px-4 py-1.5 font-headline-sm text-xs uppercase shadow-tape hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer font-bold tracking-wider"
                  >
                    {copiedJoinCode ? 'COPIED! ✓' : 'COPY CODE'}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-4 font-label-bold text-label-bold uppercase text-on-surface-variant text-sm">
                <span className="bg-scream-yellow text-ink-black px-2 py-0.5 border border-ink-black">
                  {isFriendly ? 'FRIENDLY · 3V3' : 'POWER LEAGUE · RANKED'}
                </span>
                <span>{dateStr} · {timeStr}</span>
                <span>{participants.length} / {lobby.slot_count} SLOTS</span>
              </div>

              {lobby.notes && (
                <div className="mt-2 p-3 bg-surface-container-low border border-dashed border-ink-black text-sm font-body-md italic text-ink-black/80">
                  "{lobby.notes}"
                </div>
              )}
            </div>
          </div>

          {/* Map Set Collage */}
          <section className="mt-6 relative">
            {/* Scrim Tape Marker */}
            <div className="absolute -top-4 -left-4 bg-paper-cream border-2 border-ink-black px-4 py-1 -rotate-3 z-30 shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] flex items-center gap-2">
              <span className="text-battle-red font-bold text-xl">⚡</span>
              <span className="font-headline-sm text-headline-sm uppercase tracking-wider">
                MAP ROTATION
              </span>
            </div>

            <div className="flex flex-col gap-4 relative pt-8">
              {maps.length === 0 ? (
                <div className="p-6 bg-white border-2 border-ink-black shadow-hard uppercase font-label-bold">
                  No map set configured for this lobby.
                </div>
              ) : (
                maps.map((mapItem, idx) => {
                  const mapNumber = idx + 1
                  const rotation =
                    idx % 3 === 0 ? '-rotate-1' : idx % 3 === 1 ? 'rotate-1' : '-rotate-2'
                  const fallbackImg = `https://cdn.brawlify.com/maps/regular/${mapItem.map_id}.png`
                  const mapImage = mapItem.map_image_url || fallbackImg

                  const matchMapRec = existingMatchMaps.find(
                    (mm) =>
                      mm.lobby_map_id === mapItem.id ||
                      mm.order_index === (mapItem.order_index ?? idx)
                  )

                  return (
                    <div
                      key={mapItem.id || idx}
                      className={`bg-white border-2 border-ink-black p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-hard w-full max-w-xl transform ${rotation} hover:rotate-0 transition-transform`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-ink-black/10 border-2 border-ink-black flex-shrink-0 overflow-hidden relative">
                          <img
                            src={mapImage}
                            alt={mapItem.map_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = 'https://cdn.brawlify.com/maps/regular/15000007.png'
                            }}
                          />
                        </div>

                        <div>
                          <div className="bg-scream-yellow px-2 py-0.5 border border-ink-black font-label-bold text-[10px] uppercase w-max mb-1">
                            {mapItem.mode || '3V3'}
                          </div>
                          <span className="font-headline-sm text-xl uppercase leading-tight">
                            MAP {mapNumber} · {mapItem.map_name}
                          </span>
                        </div>
                      </div>

                      {matchMapRec?.winner_label && (
                        <div className="bg-acid-green text-ink-black border border-on-background px-3 py-1 font-headline-sm text-xs uppercase shadow-tape self-end sm:self-auto">
                          🏆 {matchMapRec.winner_label}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* Team Code Section (Authorized Host & Participants Only) */}
          {(isHost || isParticipant) && (
            <section className="relative mt-2">
              {/* Scrim Tape Marker */}
              <div className="absolute -top-4 -left-3 bg-scream-yellow border-2 border-ink-black px-4 py-1 -rotate-2 z-20 shadow-tape flex items-center gap-2">
                <span className="text-battle-red font-bold text-sm">⚡</span>
                <span className="font-headline-sm text-xs uppercase tracking-wider text-ink-black font-bold">
                  TEAM CODE // FRIENDLY BATTLE
                </span>
              </div>

              <div
                className="bg-white border-2 border-ink-black shadow-hard p-6 pt-7 relative transform rotate-1"
                style={{
                  clipPath:
                    'polygon(0 0, 100% 0, 100% 97%, 95% 100%, 90% 98%, 85% 100%, 80% 97%, 75% 100%, 70% 98%, 65% 100%, 60% 97%, 55% 100%, 50% 98%, 45% 100%, 40% 97%, 35% 100%, 30% 98%, 25% 100%, 20% 97%, 15% 100%, 10% 98%, 5% 100%, 0 97%)'
                }}
              >
                {codeError && (
                  <div className="mb-4 p-2.5 bg-[#FFE5E7] text-battle-red font-label-bold text-xs uppercase border-2 border-ink-black shadow-tape font-bold">
                    ⚠ {codeError}
                  </div>
                )}

                {/* Case 1: Code is present & not in edit mode */}
                {teamCode && !isEditingCode ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <span className="font-label-bold text-xs uppercase text-on-surface-variant block font-bold">
                        In-Game Friendly Room Code
                      </span>
                      <div className="font-headline-lg text-3xl sm:text-4xl text-ink-black tracking-widest uppercase font-bold mt-0.5">
                        {teamCode}
                      </div>
                      <p className="font-body-md text-xs text-on-surface-variant font-bold mt-1">
                        Use this code to join the friendly room in Brawl Stars.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleCopyTeamCode}
                        className={`flex-1 sm:flex-initial border-2 border-ink-black px-6 py-3 font-headline-sm text-sm uppercase shadow-hard hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer font-bold ${
                          copiedCode
                            ? 'bg-acid-green text-ink-black'
                            : 'bg-battle-red text-white'
                        }`}
                      >
                        {copiedCode ? 'COPIED! ✓' : 'COPY CODE 📋'}
                      </button>

                      {isHost && (
                        <button
                          type="button"
                          onClick={() => {
                            setTeamCodeInput(teamCode)
                            setIsEditingCode(true)
                          }}
                          className="bg-paper-cream text-ink-black border-2 border-ink-black px-4 py-3 font-headline-sm text-xs uppercase shadow-tape hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer font-bold"
                        >
                          EDIT ✏
                        </button>
                      )}
                    </div>
                  </div>
                ) : isHost ? (
                  /* Case 2: Host input/edit form */
                  <form onSubmit={handleSaveTeamCode} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="font-label-bold text-xs uppercase text-ink-black font-bold">
                        {teamCode ? 'Update Friendly Team Code' : 'Share Friendly Battle Team Code'}
                      </label>
                      {teamCode && isEditingCode && (
                        <button
                          type="button"
                          onClick={() => {
                            setTeamCodeInput(teamCode)
                            setIsEditingCode(false)
                          }}
                          className="text-xs font-label-bold uppercase text-battle-red underline hover:font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="e.g. X1Y2Z3"
                        value={teamCodeInput}
                        onChange={(e) => setTeamCodeInput(e.target.value.toUpperCase())}
                        className="flex-grow bg-paper-cream border-2 border-ink-black font-headline-md text-xl uppercase px-4 py-2.5 text-ink-black tracking-wider placeholder-ink-black/40 focus:bg-scream-yellow/20 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={savingCode}
                        className="bg-battle-red text-white border-2 border-ink-black px-6 py-2.5 font-headline-sm text-sm uppercase shadow-hard hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer font-bold disabled:opacity-50"
                      >
                        {savingCode ? 'SAVING...' : 'SAVE CODE ⚡'}
                      </button>
                    </div>
                    <p className="font-body-md text-xs text-on-surface-variant font-bold">
                      Participants in this lobby will be able to see and copy this code to join in Brawl Stars.
                    </p>
                  </form>
                ) : (
                  /* Case 3: Participant waiting state */
                  <div className="p-4 bg-paper-cream border-2 border-dashed border-ink-black/40 flex items-center justify-center gap-3 text-center">
                    <span className="text-battle-red animate-pulse text-lg font-bold">⏳</span>
                    <span className="font-headline-sm text-sm uppercase text-ink-black font-bold">
                      Waiting for host to share the code.
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

        </div>

        {/* Right Column: Participants & Chat */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Participants Section */}
          <section className="flex flex-col gap-4">
            <div className="bg-ink-black text-scream-yellow px-4 py-2 border-2 border-ink-black -rotate-1 w-max shadow-hard">
              <h2 className="font-headline-sm text-headline-sm uppercase tracking-wide">
                {participants.length} / {lobby.slot_count} PLAYERS
              </h2>
            </div>

            <div className="flex flex-col gap-3 pl-4 border-l-4 border-ink-black border-dashed">
              {participants.map((p, idx) => {
                const isUser = p.profile_id === session?.user?.id
                const isHostRow = p.profile_id === lobby.host_id
                const pName = p.profiles?.display_name || 'BRAWLER'
                const pMain = p.profiles?.main_brawler_name
                const pAvatar = p.profiles?.main_brawler_icon_url
                const rotation =
                  idx % 4 === 0
                    ? 'rotate-1'
                    : idx % 4 === 1
                    ? '-rotate-1'
                    : idx % 4 === 2
                    ? 'rotate-2'
                    : '-rotate-2'

                return (
                  <div
                    key={p.profile_id || idx}
                    className={`bg-white border-2 border-ink-black p-3 flex items-center justify-between w-full max-w-xs transform ${rotation} shadow-hard ${
                      isUser ? 'ring-2 ring-battle-red' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 border border-ink-black bg-paper-cream flex-shrink-0 flex items-center justify-center overflow-hidden">
                        <UserAvatar src={pAvatar} alt={pName} className="w-full h-full object-contain" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 flex-wrap truncate">
                          <span className="font-headline-sm text-sm uppercase block truncate">{pName}</span>
                          {p.teams?.tag && (
                            <span className="text-[10px] font-label-bold uppercase bg-paper-cream border border-ink-black px-1.5 py-0.5 text-ink-black font-bold flex-shrink-0">
                              {p.teams.tag}
                            </span>
                          )}
                        </div>
                        {pMain && (
                          <span className="font-label-bold text-[10px] text-on-surface-variant block uppercase">
                            {pMain}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isHostRow ? (
                        <span className="text-[10px] bg-battle-red text-white px-1.5 py-0.5 uppercase font-label-bold flex-shrink-0">
                          HOST
                        </span>
                      ) : isHost ? (
                        <button
                          type="button"
                          onClick={() => handleKickParticipant(p.profile_id, pName)}
                          disabled={actionLoading}
                          className="bg-paper-cream hover:bg-battle-red text-ink-black hover:text-white border-2 border-ink-black px-2 py-0.5 font-headline-sm text-[10px] uppercase shadow-tape hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer font-bold flex items-center gap-1"
                          title={`Remove ${pName} from this lobby`}
                          aria-label={`Kick ${pName}`}
                        >
                          <span className="text-xs">✕</span>
                          <span>KICK</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}

              {/* Open Slots */}
              {Array.from({ length: openSlotsCount }).map((_, idx) => (
                <div
                  key={`open-${idx}`}
                  className="border-2 border-ink-black border-dashed p-2.5 flex items-center justify-center w-full max-w-xs bg-transparent rotate-1 opacity-60"
                >
                  <span className="font-label-bold text-label-bold text-xs uppercase tracking-wider">
                    + OPEN SLOT
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Action CTA Button */}
          <div className="w-full">
            {isHost ? (
              <button
                type="button"
                onClick={handleCancelLobby}
                disabled={actionLoading || isCancelled}
                className="w-full bg-ink-black text-white border-2 border-ink-black py-4 px-6 font-headline-sm text-headline-sm uppercase -rotate-1 shadow-hard hover:bg-battle-red hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isCancelled ? 'LOBBY CANCELLED' : actionLoading ? 'UPDATING...' : 'CANCEL LOBBY ✕'}
              </button>
            ) : isParticipant ? (
              <button
                type="button"
                onClick={handleLeave}
                disabled={actionLoading}
                className="w-full bg-battle-red text-white border-2 border-ink-black py-4 px-6 font-headline-lg text-headline-lg uppercase rotate-1 shadow-hard hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'LEAVING...' : 'LEAVE SCRIM'}
              </button>
            ) : isCancelled ? (
              <button
                disabled
                className="w-full bg-surface-container border-2 border-ink-black py-4 px-6 font-headline-sm text-headline-sm uppercase text-on-surface-variant opacity-60 cursor-not-allowed"
              >
                LOBBY CANCELLED
              </button>
            ) : isExpired ? (
              <button
                disabled
                className="w-full bg-[#EFE6D8] border-2 border-ink-black py-4 px-6 font-headline-sm text-headline-sm uppercase text-on-surface-variant opacity-70 cursor-not-allowed font-bold"
              >
                LOBBY EXPIRED
              </button>
            ) : isFull ? (
              <button
                disabled
                className="w-full bg-surface-container border-2 border-ink-black py-4 px-6 font-headline-sm text-headline-sm uppercase text-on-surface-variant opacity-60 cursor-not-allowed"
              >
                LOBBY FULL
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(true)}
                disabled={actionLoading}
                className="w-full bg-primary-container text-ink-black border-2 border-ink-black py-4 px-6 font-headline-lg text-headline-lg uppercase -rotate-2 shadow-hard hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'JOINING...' : 'JOIN SCRIM ⚡'}
              </button>
            )}
          </div>

          {/* Lobby Live Chat Section */}
          <section className="bg-white border-2 border-ink-black shadow-hard flex flex-col h-[420px] relative transform -rotate-1">
            <div className="p-3 border-b-2 border-ink-black bg-surface-container flex items-center justify-between">
              <span className="font-headline-sm text-sm uppercase tracking-wide">
                SCRIM CHAT 💬
              </span>
              <span className="text-[10px] font-label-bold uppercase bg-acid-green px-1.5 py-0.5 border border-ink-black font-bold">
                LIVE
              </span>
            </div>

            {/* Chat Warning Banner (Profanity Filter) */}
            {chatWarning && (
              <div className="bg-[#FFE5E7] text-battle-red border-b-2 border-ink-black px-3 py-1.5 text-xs font-label-bold uppercase flex items-center justify-between font-bold animate-pulse">
                <span>⚠ {chatWarning}</span>
                <button
                  type="button"
                  onClick={() => setChatWarning('')}
                  className="font-bold hover:text-ink-black ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Chat Error Banner (Rate Limit Trigger / Supabase Error) */}
            {chatError && (
              <div className="bg-battle-red text-white border-b-2 border-ink-black px-3 py-1.5 text-xs font-label-bold uppercase flex items-center justify-between font-bold">
                <span>⚠ {chatError}</span>
                <button
                  type="button"
                  onClick={() => setChatError('')}
                  className="font-bold hover:text-ink-black ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Report Success Notification */}
            {reportSuccess && (
              <div className="bg-acid-green text-ink-black border-b-2 border-ink-black px-3 py-1.5 text-xs font-headline-sm uppercase flex items-center justify-between font-bold">
                <span>✓ {reportSuccess}</span>
                <button
                  type="button"
                  onClick={() => setReportSuccess('')}
                  className="font-bold hover:text-white ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Chat message feed */}
            <div
              onClick={() => setOpenMenuMsgId(null)}
              className="flex-grow p-4 overflow-y-auto flex flex-col gap-3 font-body-md text-sm relative"
            >
              {messages.length === 0 ? (
                <div className="text-center text-on-surface-variant my-auto italic text-xs uppercase font-label-bold">
                  No messages yet. Say hi to your team!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === session?.user?.id
                  const isHost = lobby?.host_id === session?.user?.id
                  const canDelete = isMe || isHost
                  const senderName = msg.profiles?.display_name || 'BRAWLER'
                  const senderAvatar = msg.profiles?.main_brawler_icon_url
                  const isMenuOpen = openMenuMsgId === msg.id

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 items-start relative ${isMe ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="w-6 h-6 border border-ink-black bg-paper-cream flex-shrink-0 flex items-center justify-center overflow-hidden">
                        <UserAvatar src={senderAvatar} alt={senderName} className="w-full h-full object-contain" />
                      </div>

                      <div className="relative max-w-[80%] flex flex-col">
                        <div
                          className={`p-2.5 border border-ink-black ${
                            isMe ? 'bg-scream-yellow text-ink-black rotate-1' : 'bg-surface text-ink-black -rotate-1'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 leading-none mb-1">
                            <span className="font-label-bold text-[10px] uppercase block text-on-surface-variant font-bold">
                              {isMe ? 'YOU' : senderName}
                            </span>

                            {/* Options Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuMsgId(isMenuOpen ? null : msg.id)
                              }}
                              className="text-[10px] font-bold text-ink-black/60 hover:text-ink-black px-1 rounded hover:bg-black/10 cursor-pointer"
                              title="Message options"
                            >
                              •••
                            </button>
                          </div>

                          <p className="font-body-md text-xs break-words">{msg.content}</p>
                        </div>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute z-30 top-full mt-1 bg-white border-2 border-ink-black shadow-hard p-1 flex flex-col gap-1 min-w-[120px] ${
                              isMe ? 'right-0' : 'left-0'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenReportModal(msg.id)}
                              className="px-2 py-1 text-[11px] font-headline-sm uppercase text-left hover:bg-scream-yellow flex items-center gap-1.5 cursor-pointer font-bold text-ink-black"
                            >
                              <span>🚩</span>
                              <span>Report</span>
                            </button>

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="px-2 py-1 text-[11px] font-headline-sm uppercase text-left hover:bg-battle-red hover:text-white flex items-center gap-1.5 cursor-pointer font-bold text-battle-red"
                              >
                                <span>🗑</span>
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input form */}
            <form onSubmit={handleSendMessage} className="p-2 border-t-2 border-ink-black bg-paper-cream flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-grow bg-white border-2 border-ink-black px-3 py-1.5 text-xs font-body-md focus:bg-scream-yellow/20 focus:outline-none font-medium text-ink-black"
              />
              <button
                type="submit"
                className="bg-ink-black text-white px-3.5 py-1.5 font-headline-sm text-xs uppercase border-2 border-ink-black hover:bg-battle-red transition-colors cursor-pointer font-bold"
              >
                SEND
              </button>
            </form>
          </section>

        </div>
      </main>

      {/* Report Message Modal */}
      {reportingMsgId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white border-2 border-ink-black shadow-hard max-w-sm w-full p-6 relative transform rotate-1"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% calc(100% - 10px), 95% 100%, 90% calc(100% - 5px), 85% 100%, 80% calc(100% - 8px), 75% 100%, 70% calc(100% - 6px), 65% 100%, 60% calc(100% - 4px), 55% 100%, 50% calc(100% - 9px), 45% 100%, 40% calc(100% - 5px), 35% 100%, 30% calc(100% - 7px), 25% 100%, 20% calc(100% - 4px), 15% 100%, 10% calc(100% - 8px), 5% 100%, 0 calc(100% - 5px))'
            }}
          >
            <div className="bg-battle-red text-white border-2 border-ink-black px-3 py-1 font-headline-sm text-xs uppercase -rotate-2 w-max shadow-tape mb-3 font-bold">
              🚩 REPORT MESSAGE
            </div>

            <h3 className="font-headline-sm text-lg uppercase text-ink-black mb-1 font-bold">
              Report this message
            </h3>

            <p className="font-body-md text-xs text-on-surface-variant mb-4 font-medium">
              Help keep Scrimmage friendly and fair. Please state an optional reason for reporting.
            </p>

            <form onSubmit={handleSubmitReport} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Reason (e.g. Offensive language, harassment, spam)..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="bg-[#FAF5EA] border-2 border-ink-black p-2.5 text-xs font-body-md text-ink-black focus:outline-none focus:bg-scream-yellow/20 font-bold"
              />

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setReportingMsgId(null)}
                  className="bg-paper-cream border-2 border-ink-black px-4 py-2 font-headline-sm text-xs uppercase shadow-tape hover:bg-white font-bold cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="bg-battle-red text-white border-2 border-ink-black px-4 py-2 font-headline-sm text-xs uppercase shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 font-bold cursor-pointer disabled:opacity-50"
                >
                  {submittingReport ? 'SUBMITTING...' : 'SUBMIT REPORT ⚡'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log / Edit Results Modal */}
      <LogResultsModal
        lobby={lobby}
        existingMatch={existingMatch}
        existingMatchMaps={existingMatchMaps}
        isOpen={isLogResultsOpen}
        onClose={() => setIsLogResultsOpen(false)}
        onSuccess={(matchId) => {
          setIsLogResultsOpen(false)
          fetchLobbyData()
          navigate(`/match/${matchId}`)
        }}
      />

      {/* Join Scrim Options Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-black/60 backdrop-blur-xs">
          <div
            className="bg-white border-2 border-ink-black shadow-hard w-full max-w-md p-6 relative transform rotate-1 flex flex-col gap-5 animate-content-settle"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% 97%, 95% 100%, 90% 98%, 85% 100%, 80% 97%, 75% 100%, 70% 98%, 65% 100%, 60% 97%, 55% 100%, 50% 98%, 45% 100%, 40% 97%, 35% 100%, 30% 98%, 25% 100%, 20% 97%, 15% 100%, 10% 98%, 5% 100%, 0 97%)'
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-dashed border-ink-black pb-3">
              <div>
                <div className="bg-scream-yellow text-ink-black border border-ink-black px-2.5 py-0.5 font-headline-sm text-xs uppercase -rotate-2 w-max shadow-tape mb-1 flex items-center gap-1 font-bold">
                  <span className="text-battle-red font-bold">⚡</span>
                  <span>CHOOSE ENTRY TYPE</span>
                </div>
                <h2 className="font-headline-md text-2xl uppercase tracking-tight text-ink-black font-bold">
                  JOIN SCRIM
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(false)}
                className="text-ink-black hover:text-battle-red font-bold text-xl px-2 py-1 cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p className="font-body-md text-xs text-on-surface-variant font-bold">
              Select how you would like to enter this lobby:
            </p>

            {/* Options */}
            <div className="flex flex-col gap-3">
              {/* Option 1: Join as Player */}
              <button
                type="button"
                onClick={() => {
                  setIsJoinModalOpen(false)
                  handleJoin()
                }}
                disabled={actionLoading}
                className="bg-primary-container text-ink-black border-2 border-ink-black p-4 text-left shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer font-bold flex items-center justify-between group"
              >
                <div>
                  <div className="font-headline-sm text-base uppercase text-ink-black flex items-center gap-2">
                    <span>👤 JOIN AS PLAYER</span>
                  </div>
                  <p className="font-body-md text-xs text-on-surface-variant font-medium mt-0.5">
                    Enter this scrim individually as a solo player.
                  </p>
                </div>
                <span className="text-xl font-bold group-hover:translate-x-1 transition-transform">→</span>
              </button>

              {/* Option 2: Join as Team */}
              <button
                type="button"
                onClick={handleOpenJoinAsTeam}
                className="bg-[#FAF5EA] text-ink-black border-2 border-ink-black p-4 text-left shadow-hard hover:bg-scream-yellow hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer font-bold flex items-center justify-between group"
              >
                <div>
                  <div className="font-headline-sm text-base uppercase text-ink-black flex items-center gap-2">
                    <span>🛡️ JOIN AS TEAM</span>
                  </div>
                  <p className="font-body-md text-xs text-on-surface-variant font-medium mt-0.5">
                    Register your squad members together as a team.
                  </p>
                </div>
                <span className="text-xl font-bold group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>

            {/* Footer Cancel */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(false)}
                className="bg-paper-cream border border-ink-black px-4 py-2 text-xs font-headline-sm uppercase text-ink-black hover:bg-white transition-all cursor-pointer font-bold"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Scrim As Team Modal */}
      {isJoinTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-black/60 backdrop-blur-xs">
          <div
            className="bg-white border-2 border-ink-black shadow-hard w-full max-w-lg p-6 relative transform rotate-1 flex flex-col gap-5 animate-content-settle max-h-[90vh] overflow-y-auto"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% 97%, 95% 100%, 90% 98%, 85% 100%, 80% 97%, 75% 100%, 70% 98%, 65% 100%, 60% 97%, 55% 100%, 50% 98%, 45% 100%, 40% 97%, 35% 100%, 30% 98%, 25% 100%, 20% 97%, 15% 100%, 10% 98%, 5% 100%, 0 97%)'
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-dashed border-ink-black pb-3">
              <div>
                <div className="bg-scream-yellow text-ink-black border border-ink-black px-2.5 py-0.5 font-headline-sm text-xs uppercase -rotate-2 w-max shadow-tape mb-1 flex items-center gap-1 font-bold">
                  <span className="text-battle-red font-bold">🛡️</span>
                  <span>JOIN AS TEAM</span>
                </div>
                <h2 className="font-headline-md text-2xl uppercase tracking-tight text-ink-black font-bold">
                  SELECT YOUR SQUAD
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsJoinTeamModalOpen(false)}
                className="text-ink-black hover:text-battle-red font-bold text-xl px-2 py-1 cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            {captainTeamsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                <span className="text-battle-red font-bold text-3xl animate-bounce">⚡</span>
                <span className="font-headline-sm text-sm uppercase animate-pulse">
                  LOADING YOUR SQUADS...
                </span>
              </div>
            ) : captainTeamsError ? (
              <div className="p-4 bg-[#FFE5E7] text-battle-red border-2 border-ink-black font-headline-sm text-xs uppercase font-bold">
                ⚠ {captainTeamsError}
              </div>
            ) : captainTeams.length === 0 ? (
              /* Empty State: Not captain of any squad */
              <div className="flex flex-col gap-4 py-2">
                <div className="bg-[#FAF5EA] border-2 border-ink-black p-5 text-center flex flex-col items-center gap-2 shadow-tape">
                  <span className="text-3xl">🛡️</span>
                  <h3 className="font-headline-sm text-base uppercase text-ink-black font-bold">
                    NO CAPTAINED SQUADS FOUND
                  </h3>
                  <p className="font-body-md text-xs text-on-surface-variant font-medium max-w-xs">
                    Only team captains/owners can register a squad for scrims. Create a squad first or join individually as a solo player.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsJoinTeamModalOpen(false)
                      setIsJoinModalOpen(true)
                    }}
                    className="bg-paper-cream border-2 border-ink-black px-4 py-2.5 font-headline-sm text-xs uppercase text-ink-black hover:bg-white shadow-tape font-bold cursor-pointer"
                  >
                    ← BACK
                  </button>
                  <Link
                    to="/create-team"
                    className="bg-scream-yellow text-ink-black border-2 border-ink-black px-5 py-2.5 font-headline-sm text-xs uppercase shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 text-center font-bold"
                  >
                    CREATE A SQUAD ⚡
                  </Link>
                </div>
              </div>
            ) : (
              /* Populated State: Squad(s) Found */
              (() => {
                const selectedTeam = captainTeams.find((t) => t.id === selectedTeamId) || captainTeams[0]
                const roster = selectedTeam?.approvedMembers || []
                const slotsNeeded = roster.length
                const notEnoughSlots = openSlotsCount < slotsNeeded
                const alreadyJoinedMembers = roster.filter((m) =>
                  participants.some((p) => p.profile_id === m.profile_id)
                )
                const hasAlreadyJoined = alreadyJoinedMembers.length > 0
                const isOverLimit = roster.length > 3
                const isEmptyRoster = roster.length === 0
                const cannotConfirm =
                  actionLoading || notEnoughSlots || hasAlreadyJoined || isOverLimit || isEmptyRoster

                return (
                  <div className="flex flex-col gap-4">
                    {/* Multi-Team Selector if user captains > 1 team */}
                    {captainTeams.length > 1 && (
                      <div>
                        <span className="font-label-bold text-xs uppercase text-on-surface-variant block font-bold mb-2">
                          Select Squad to Join With:
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {captainTeams.map((t) => {
                            const isSelected = t.id === selectedTeam?.id
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setSelectedTeamId(t.id)}
                                className={`px-3 py-2 border-2 border-ink-black text-xs font-headline-sm uppercase transition-all cursor-pointer font-bold ${
                                  isSelected
                                    ? 'bg-scream-yellow text-ink-black shadow-hard translate-x-0.5 translate-y-0.5'
                                    : 'bg-paper-cream text-ink-black hover:bg-white shadow-tape'
                                }`}
                              >
                                {t.tag ? `${t.tag} ` : ''}{t.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Selected Squad Card */}
                    <div className="bg-[#FAF5EA] border-2 border-ink-black p-4 shadow-tape flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-ink-black/20 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-headline-md text-lg uppercase text-ink-black font-bold">
                            {selectedTeam.tag ? `${selectedTeam.tag} ` : ''}{selectedTeam.name}
                          </span>
                          <span className="bg-scream-yellow text-ink-black text-[10px] font-label-bold uppercase border border-ink-black px-1.5 py-0.2 font-bold">
                            👑 CAPTAIN
                          </span>
                        </div>
                        <span className="font-label-bold text-xs uppercase bg-white border border-ink-black px-2 py-0.5 font-bold">
                          {roster.length} / 3 MEMBERS
                        </span>
                      </div>

                      {/* Roster Members List */}
                      <div>
                        <span className="font-label-bold text-[11px] uppercase text-on-surface-variant block font-bold mb-1.5">
                          SQUAD ROSTER:
                        </span>
                        <div className="flex flex-col gap-2">
                          {roster.map((m) => {
                            const mName = m.profiles?.display_name || 'BRAWLER'
                            const mAvatar = m.profiles?.main_brawler_icon_url
                            const mMain = m.profiles?.main_brawler_name
                            const mTag = m.profiles?.brawl_tag
                            const isCaptain = m.role === 'owner' || m.profile_id === selectedTeam.owner_id
                            const isAlreadyInLobby = participants.some((p) => p.profile_id === m.profile_id)

                            return (
                              <div
                                key={m.profile_id}
                                className={`bg-white border border-ink-black p-2 flex items-center justify-between shadow-xs ${
                                  isAlreadyInLobby ? 'bg-battle-red/10 border-battle-red' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  <div className="w-7 h-7 border border-ink-black bg-paper-cream flex-shrink-0 flex items-center justify-center overflow-hidden">
                                    <UserAvatar src={mAvatar} alt={mName} className="w-full h-full object-contain" />
                                  </div>
                                  <div className="truncate">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className="font-headline-sm text-xs uppercase truncate block font-bold">
                                        {mName}
                                      </span>
                                      {isAlreadyInLobby && (
                                        <span className="text-[9px] bg-battle-red text-white font-label-bold uppercase px-1 py-0.2">
                                          ALREADY JOINED
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-label-bold text-[10px] text-on-surface-variant block uppercase">
                                      {mTag || (mMain ? `Main: ${mMain}` : '')}
                                    </span>
                                  </div>
                                </div>

                                <span className={`text-[10px] font-label-bold uppercase px-1.5 py-0.5 border ${
                                  isCaptain
                                    ? 'bg-scream-yellow border-ink-black text-ink-black font-bold'
                                    : 'bg-paper-cream border-ink-black text-ink-black/70'
                                }`}>
                                  {isCaptain ? 'CAPTAIN' : 'MEMBER'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Warnings & Alerts */}
                    {notEnoughSlots && (
                      <div className="p-3 bg-[#FFE5E7] text-battle-red border-2 border-ink-black font-label-bold text-xs uppercase font-bold flex items-center gap-2">
                        <span>⚠</span>
                        <span>
                          NOT ENOUGH SLOTS: Scrim has only {openSlotsCount} open slot(s), but your squad has {slotsNeeded} members.
                        </span>
                      </div>
                    )}

                    {hasAlreadyJoined && (
                      <div className="p-3 bg-[#FFE5E7] text-battle-red border-2 border-ink-black font-label-bold text-xs uppercase font-bold flex items-center gap-2">
                        <span>⚠</span>
                        <span>
                          MEMBER ALREADY JOINED: {alreadyJoinedMembers.map((m) => m.profiles?.display_name || 'Member').join(', ')} is already in this lobby.
                        </span>
                      </div>
                    )}

                    {isOverLimit && (
                      <div className="p-3 bg-[#FFE5E7] text-battle-red border-2 border-ink-black font-label-bold text-xs uppercase font-bold flex items-center gap-2">
                        <span>⚠</span>
                        <span>Squad exceeds the maximum 3-member tournament limit.</span>
                      </div>
                    )}

                    {isEmptyRoster && (
                      <div className="p-3 bg-[#FFE5E7] text-battle-red border-2 border-ink-black font-label-bold text-xs uppercase font-bold flex items-center gap-2">
                        <span>⚠</span>
                        <span>This squad has no approved members.</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 justify-between items-center pt-2 border-t border-dashed border-ink-black">
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setIsJoinTeamModalOpen(false)
                            setIsJoinModalOpen(true)
                          }}
                          className="flex-1 sm:flex-initial bg-paper-cream border border-ink-black px-3.5 py-2 font-headline-sm text-xs uppercase text-ink-black hover:bg-white transition-all cursor-pointer font-bold"
                        >
                          ← BACK
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsJoinTeamModalOpen(false)}
                          className="flex-1 sm:flex-initial bg-paper-cream border border-ink-black px-3.5 py-2 font-headline-sm text-xs uppercase text-ink-black hover:bg-white transition-all cursor-pointer font-bold"
                        >
                          CANCEL
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleJoinAsTeam}
                        disabled={cannotConfirm}
                        className="w-full sm:w-auto bg-primary-container text-ink-black border-2 border-ink-black px-6 py-2.5 font-headline-sm text-xs uppercase shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading ? 'REGISTERING SQUAD...' : 'CONFIRM TEAM JOIN ⚡'}
                      </button>
                    </div>
                  </div>
                )
              })()
            )}
          </div>
        </div>
      )}
    </div>
  )
}
