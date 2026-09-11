import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import Navigation from '../components/Navigation'
import UserAvatar from '../components/UserAvatar'
import LobbyCard from '../components/LobbyCard'
import NotFoundCard from '../components/NotFoundCard'
import { getTeamBannerUrl } from '../lib/brawlers'
import { formatActionError } from '../lib/authErrors'

export default function TeamProfile() {
  const { id } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()

  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [teamLobbies, setTeamLobbies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [userTeamCount, setUserTeamCount] = useState(0)

  // Add Member by Tag State
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
  const [searchTag, setSearchTag] = useState('')
  const [searchingPlayer, setSearchingPlayer] = useState(false)
  const [searchResult, setSearchResult] = useState(null)
  const [searchError, setSearchError] = useState(null)
  const [addingMember, setAddingMember] = useState(false)

  const fetchTeamData = async () => {
    if (!id) return
    setLoading(true)
    setError(null)

    try {
      if (session?.user?.id) {
        const { count: userCount } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', session.user.id)
          .in('role', ['owner', 'member'])
        setUserTeamCount(userCount || 0)
      }

      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single()

      if (teamErr) throw teamErr
      setTeam(teamData)

      // Fetch team members
      const { data: membersData, error: membersErr } = await supabase
        .from('team_members')
        .select('team_id, profile_id, role')
        .eq('team_id', id)

      if (membersErr) throw membersErr

      // Fetch member profiles from public_profiles view (accessible by everyone)
      const profileIds = (membersData || []).map((m) => m.profile_id)
      let profilesMap = {}
      if (profileIds.length > 0) {
        const { data: profs } = await supabase
          .from('public_profiles')
          .select('id, display_name, brawl_tag, main_brawler_id, main_brawler_name, main_brawler_icon_url')
          .in('id', profileIds)

        if (profs) {
          profs.forEach((p) => {
            profilesMap[p.id] = p
          })
        }
      }

      const mergedMembers = (membersData || []).map((m) => ({
        ...m,
        profiles: profilesMap[m.profile_id] || {
          id: m.profile_id,
          display_name: 'BRAWLER',
          brawl_tag: null,
          main_brawler_name: null,
          main_brawler_icon_url: null
        }
      }))

      setMembers(mergedMembers)

      const { data: lobbiesData } = await supabase
        .from('lobbies')
        .select(`
          id,
          type,
          scheduled_time,
          slot_count,
          status,
          notes,
          host_id,
          profiles:host_id ( display_name, main_brawler_name, main_brawler_icon_url ),
          lobby_maps ( map_name, mode, order_index ),
          lobby_participants ( count )
        `)
        .eq('team_id', id)
        .eq('status', 'open')
        .order('scheduled_time', { ascending: true })

      setTeamLobbies(lobbiesData || [])
    } catch (err) {
      console.error('Error loading team profile:', err)
      setError('Team not found or could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeamData()
  }, [id, session])

  const currentUserId = session?.user?.id
  const currentUserMemberRecord = members.find((m) => m.profile_id === currentUserId)
  const isOwner = team?.owner_id === currentUserId || currentUserMemberRecord?.role === 'owner'
  const isApprovedMember = currentUserMemberRecord?.role === 'member'
  const isPending = currentUserMemberRecord?.role === 'pending'
  const isInvited = currentUserMemberRecord?.role === 'invited'

  const approvedRoster = members.filter((m) => m.role === 'owner' || m.role === 'member')
  const pendingRequests = members.filter((m) => m.role === 'pending')
  const pendingInvites = members.filter((m) => m.role === 'invited')

  const handleAcceptInvite = async () => {
    if (!currentUserId || !team) return
    if (userTeamCount >= 3) {
      alert("You've reached the 3-team limit.")
      return
    }
    if (approvedRoster.length >= 3) {
      alert('This squad is already full (3/3 members).')
      return
    }
    setActionLoading(true)
    try {
      const { error: acceptErr } = await supabase
        .from('team_members')
        .update({ role: 'member' })
        .eq('team_id', team.id)
        .eq('profile_id', currentUserId)

      if (acceptErr) throw acceptErr
      await fetchTeamData()
    } catch (err) {
      console.error('Error accepting squad invitation:', err)
      alert(err.message || 'Failed to accept invitation.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeclineInvite = async () => {
    if (!currentUserId || !team) return
    if (!window.confirm('Decline this squad invitation?')) return
    setActionLoading(true)
    try {
      const { error: declineErr } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', team.id)
        .eq('profile_id', currentUserId)

      if (declineErr) throw declineErr
      await fetchTeamData()
    } catch (err) {
      console.error('Error declining invitation:', err)
      alert(err.message || 'Failed to decline invitation.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRequestJoin = async () => {
    if (!currentUserId || !team) return
    if (userTeamCount >= 3) {
      alert("You've reached the 3-team limit.")
      return
    }

    setActionLoading(true)
    try {
      const { error: joinErr } = await supabase.from('team_members').insert([
        {
          team_id: team.id,
          profile_id: currentUserId,
          role: 'pending'
        }
      ])

      if (joinErr) throw joinErr
      await fetchTeamData()
    } catch (err) {
      console.error('Error requesting to join team:', err)
      const formatted = formatActionError(err, null)
      if (formatted === 'Your account has been restricted.') {
        alert(formatted)
      } else {
        const msg = (err.message || '').toLowerCase()
        const isLimitErr =
          msg.includes('limit') ||
          msg.includes('maximum') ||
          (err.code === 'P0001' && msg.includes('3'))
        alert(isLimitErr ? "You've reached the 3-team limit." : (err.message || 'Failed to request join.'))
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeaveTeam = async () => {
    if (!currentUserId || !team) return
    if (!window.confirm('Are you sure you want to leave this squad?')) return
    setActionLoading(true)
    try {
      const { error: leaveErr } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', team.id)
        .eq('profile_id', currentUserId)

      if (leaveErr) throw leaveErr
      await fetchTeamData()
    } catch (err) {
      console.error('Error leaving team:', err)
      alert(err.message || 'Failed to leave team.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAcceptMember = async (memberProfileId) => {
    setActionLoading(true)
    try {
      const { error: acceptErr } = await supabase
        .from('team_members')
        .update({ role: 'member' })
        .eq('team_id', team.id)
        .eq('profile_id', memberProfileId)

      if (acceptErr) throw acceptErr
      await fetchTeamData()
    } catch (err) {
      console.error('Error accepting member:', err)
      const msg = (err.message || '').toLowerCase()
      const isLimitErr =
        msg.includes('limit') ||
        msg.includes('maximum') ||
        (err.code === 'P0001' && msg.includes('3'))
      alert(isLimitErr ? "This player has reached the 3-team limit." : (err.message || 'Failed to accept member.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveMember = async (memberProfileId, isPendingAction = false, isInviteAction = false) => {
    const confirmMsg = isInviteAction
      ? 'Cancel this squad invitation?'
      : isPendingAction
      ? 'Decline this join request?'
      : 'Remove this player from the team roster?'

    if (!window.confirm(confirmMsg)) return

    setActionLoading(true)
    try {
      const { error: removeErr } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', team.id)
        .eq('profile_id', memberProfileId)

      if (removeErr) throw removeErr
      await fetchTeamData()
    } catch (err) {
      console.error('Error removing member:', err)
      alert(err.message || 'Failed to update roster.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSearchPlayer = async (e) => {
    if (e) e.preventDefault()
    const cleanTag = searchTag.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    if (!cleanTag) return

    setSearchingPlayer(true)
    setSearchError(null)
    setSearchResult(null)

    try {
      const { data: candidates, error: searchErr } = await supabase
        .from('public_profiles')
        .select('id, display_name, brawl_tag, main_brawler_id, main_brawler_name, main_brawler_icon_url')
        .or(`brawl_tag.ilike.${cleanTag},brawl_tag.ilike.%23${cleanTag},brawl_tag.ilike.#${cleanTag}`)

      if (searchErr) throw searchErr

      const list = candidates || []
      if (list.length === 0) {
        setSearchError(`No registered player found with tag "#${cleanTag}". Make sure the player has signed up on Scrimmage.`)
        return
      }

      // Find candidate who is not already in the squad and not the current captain
      const availableCandidate = list.find(
        (c) => !members.some((m) => m.profile_id === c.id) && c.id !== session?.user?.id
      )

      if (!availableCandidate) {
        const firstMatch = list[0]
        if (firstMatch.id === session?.user?.id) {
          setSearchError('You are the captain of this squad.')
        } else {
          setSearchError(`Player "${firstMatch.display_name}" is already in this squad roster.`)
        }
        return
      }

      setSearchResult(availableCandidate)
    } catch (err) {
      console.error('Error searching player by tag:', err)
      setSearchError(err.message || 'Failed to search player.')
    } finally {
      setSearchingPlayer(false)
    }
  }

  const handleAddPlayerToTeam = async () => {
    if (!searchResult || !team || !isOwner) return
    if (approvedRoster.length >= 3) {
      alert('Squad has already reached the maximum limit of 3 players.')
      return
    }

    setAddingMember(true)
    try {
      const { error: insertErr } = await supabase
        .from('team_members')
        .insert([
          {
            team_id: team.id,
            profile_id: searchResult.id,
            role: 'invited'
          }
        ])

      if (insertErr) throw insertErr

      // Success: close modal, reset state, and refresh roster
      setIsAddMemberModalOpen(false)
      setSearchTag('')
      setSearchResult(null)
      setSearchError(null)
      await fetchTeamData()
    } catch (err) {
      console.error('Error sending squad invitation:', err)
      const msg = (err.message || '').toLowerCase()
      const isLimitErr =
        msg.includes('limit') ||
        msg.includes('maximum') ||
        (err.code === 'P0001' && msg.includes('3'))
      setSearchError(
        isLimitErr
          ? `This player has already reached the 3-team limit.`
          : (err.message || 'Failed to send squad invitation.')
      )
    } finally {
      setAddingMember(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-cream">
        <div className="font-headline-lg text-4xl uppercase animate-pulse">
          Loading Team...
        </div>
      </div>
    )
  }

  if (error || !team) {
    return (
      <NotFoundCard
        badgeText="SQUAD NOT FOUND"
        title="TEAM DISBANDED OR MISSING."
        description="This squad might have disbanded, changed their name, or the link is invalid."
        primaryActionText="BROWSE TEAM DIRECTORY ⚡"
        primaryActionLink="/teams"
        secondaryActionText="CREATE A SQUAD"
        secondaryActionLink="/teams/new"
      />
    )
  }

  const bannerStyle = team.banner_url
    ? {
        backgroundImage: `url(${team.banner_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : { backgroundColor: '#181716' }

  return (
    <div className="min-h-screen text-ink-black flex flex-col font-body-md overflow-x-hidden selection:bg-scream-yellow selection:text-ink-black relative">
      {/* Shared Navigation */}
      <Navigation />

      {/* Main Container */}
      <main className="flex-grow max-w-6xl mx-auto px-margin-mobile md:px-margin-desktop py-10 w-full">
        {/* Banner & Hero Section */}
        <section className="relative mb-12">
          {/* Scrim Tape Top Left */}
          <div className="absolute -top-4 -left-4 z-20 bg-scream-yellow border-2 border-ink-black shadow-tape px-4 py-1.5 transform -rotate-6 flex items-center gap-2 font-bold text-ink-black">
            <span className="text-battle-red font-bold text-sm">⚡</span>
            <span className="font-headline-sm text-sm uppercase text-ink-black">
              SQUAD PROFILE
            </span>
          </div>

          {/* Banner Box */}
          <div
            className="relative w-full h-64 md:h-80 border-2 border-ink-black shadow-hard overflow-hidden transform rotate-1 bg-ink-black"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% 95%, 98% 100%, 96% 96%, 94% 99%, 92% 95%, 90% 100%, 88% 94%, 86% 98%, 84% 95%, 82% 100%, 80% 96%, 78% 99%, 76% 95%, 74% 100%, 72% 96%, 70% 99%, 68% 94%, 66% 98%, 64% 95%, 62% 100%, 60% 96%, 58% 99%, 56% 95%, 54% 100%, 52% 96%, 50% 99%, 48% 95%, 46% 100%, 44% 96%, 42% 99%, 40% 94%, 38% 98%, 36% 95%, 34% 100%, 32% 96%, 30% 99%, 28% 95%, 26% 100%, 24% 96%, 22% 99%, 20% 95%, 18% 100%, 16% 96%, 14% 99%, 12% 94%, 10% 98%, 8% 95%, 6% 100%, 4% 96%, 2% 99%, 0 95%)'
            }}
          >
            {getTeamBannerUrl(team) && (
              <img
                src={getTeamBannerUrl(team)}
                alt={team.name}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-8">
              <div className="flex flex-wrap items-baseline gap-3 transform -rotate-1">
                <h1
                  className="font-display-xl text-5xl md:text-7xl uppercase text-scream-yellow leading-none"
                  style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0px #181716' }}
                >
                  {team.name}
                </h1>
                {team.tag && (
                  <span className="font-headline-md text-2xl md:text-3xl text-white bg-black/60 px-3 py-1 border border-white/40 font-bold shadow-tape">
                    {team.tag.startsWith('[') ? team.tag : `[${team.tag}]`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Subheader: Bio & Action Button */}
          <div className="mt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
            <p className="font-body-lg text-body-lg text-ink-black max-w-2xl transform rotate-1 border-l-4 border-ink-black pl-4 italic font-bold">
              {team.description ||
                'Competitive Brawl Stars team running scrim sets and tournament prep.'}
            </p>

            {/* Action State Buttons */}
            <div className="self-end md:self-auto flex items-center gap-3">
              {isOwner ? (
                <div className="bg-scream-yellow text-ink-black border-2 border-ink-black shadow-hard px-6 py-3 font-headline-sm text-sm uppercase transform -rotate-2 font-bold">
                  👑 SQUAD OWNER
                </div>
              ) : isInvited ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleAcceptInvite}
                    className="bg-acid-green text-ink-black border-2 border-ink-black shadow-hard px-6 py-3 font-headline-sm text-sm uppercase transform -rotate-1 hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer font-bold tracking-wider flex items-center gap-2"
                  >
                    <span>⚡</span>
                    <span>{actionLoading ? 'JOINING...' : 'ACCEPT INVITATION ✓'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleDeclineInvite}
                    className="bg-battle-red text-white border-2 border-ink-black shadow-hard px-5 py-3 font-headline-sm text-sm uppercase transform rotate-1 hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer font-bold tracking-wider flex items-center gap-1.5"
                  >
                    <span>✕</span>
                    <span>DECLINE</span>
                  </button>
                </div>
              ) : isApprovedMember ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleLeaveTeam}
                  className="bg-battle-red text-white border-2 border-ink-black shadow-hard px-6 py-3 font-headline-sm text-sm uppercase transform rotate-1 hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer font-bold tracking-wider"
                >
                  {actionLoading ? 'PROCESSING...' : 'LEAVE TEAM'}
                </button>
              ) : isPending ? (
                <div className="bg-[#FAF5EA] text-on-surface-variant border-2 border-ink-black shadow-tape px-6 py-3 font-headline-sm text-sm uppercase transform rotate-1 cursor-not-allowed opacity-80 font-bold">
                  ⏳ REQUEST PENDING
                </div>
              ) : userTeamCount >= 3 ? (
                <div className="bg-[#FAF5EA] text-on-surface-variant border-2 border-ink-black shadow-tape px-6 py-3 font-headline-sm text-sm uppercase transform rotate-1 cursor-not-allowed font-bold opacity-80">
                  YOU'VE REACHED THE 3-TEAM LIMIT
                </div>
              ) : (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleRequestJoin}
                  className="bg-battle-red text-white border-2 border-ink-black shadow-hard px-8 py-3.5 font-headline-md text-xl uppercase transform -rotate-2 hover:rotate-0 hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer font-bold tracking-wider"
                >
                  {actionLoading ? 'SENDING...' : 'REQUEST TO JOIN ⚡'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Two Column Layout: Roster & Upcoming Scrims */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Roster & Pending Requests */}
          <section className="lg:col-span-7 space-y-8">
            <div className="flex justify-between items-center border-b-4 border-ink-black pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <h2 className="font-headline-lg text-headline-lg uppercase text-ink-black font-bold tracking-tight">
                  ROSTER
                </h2>
                <span className="font-headline-sm text-sm bg-ink-black text-white px-2.5 py-0.5 border border-ink-black font-bold shadow-tape">
                  {approvedRoster.length} / 3
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isOwner && approvedRoster.length < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddMemberModalOpen(true)
                      setSearchTag('')
                      setSearchResult(null)
                      setSearchError(null)
                    }}
                    className="bg-scream-yellow text-ink-black border-2 border-ink-black px-3 py-1 font-headline-sm text-xs uppercase shadow-tape hover:translate-x-0.5 hover:translate-y-0.5 transition-all font-bold cursor-pointer flex items-center gap-1"
                  >
                    <span className="text-battle-red font-bold">⚡</span>
                    <span>+ ADD PLAYER BY TAG</span>
                  </button>
                )}

                {isOwner && (
                  <Link
                    to="/create-lobby"
                    className="text-xs font-headline-sm uppercase underline hover:text-battle-red font-bold"
                  >
                    + Host Scrim
                  </Link>
                )}
              </div>
            </div>

            {/* Roster Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {approvedRoster.map((member, idx) => {
                const isMemberOwner = member.role === 'owner'
                const profileObj = member.profiles || {}
                const avatarUrl = profileObj.main_brawler_icon_url
                const rotation = idx % 2 === 0 ? 'rotate-1' : '-rotate-1'

                return (
                  <div
                    key={member.profile_id}
                    className={`bg-white border-2 border-ink-black shadow-hard p-4 transform ${rotation} relative`}
                  >
                    <div
                      className={`absolute -top-3 right-2 px-2 py-0.5 border border-ink-black text-[11px] font-headline-sm uppercase font-bold ${
                        isMemberOwner
                          ? 'bg-scream-yellow text-ink-black shadow-tape rotate-3'
                          : 'bg-electric-blue text-white shadow-tape -rotate-2'
                      }`}
                    >
                      {isMemberOwner ? 'CAPTAIN' : 'MEMBER'}
                    </div>

                    <div className="flex items-center gap-3 mt-1">
                      <div className="w-12 h-12 bg-paper-cream border-2 border-ink-black p-1 shadow-tape flex items-center justify-center overflow-hidden flex-shrink-0">
                        <UserAvatar
                          src={avatarUrl}
                          alt={profileObj.display_name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="truncate">
                        <Link
                          to={`/player/${member.profile_id}`}
                          className="font-headline-sm text-base uppercase text-ink-black hover:underline truncate block font-bold"
                        >
                          {profileObj.display_name || 'BRAWLER'}
                        </Link>
                        <span className="font-body-md text-xs text-on-surface-variant block font-bold">
                          {profileObj.main_brawler_name
                            ? `Main: ${profileObj.main_brawler_name}`
                            : profileObj.brawl_tag || 'MEMBER'}
                        </span>
                      </div>
                    </div>

                    {isOwner && !isMemberOwner && (
                      <div className="mt-3 pt-2 border-t border-dashed border-ink-black/30 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.profile_id)}
                          className="text-[11px] font-label-bold text-battle-red hover:underline uppercase font-bold cursor-pointer"
                        >
                          Kick Player
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Empty Slots up to 3 */}
              {Array.from({ length: Math.max(0, 3 - approvedRoster.length) }).map((_, slotIdx) => (
                <button
                  key={`empty-slot-${slotIdx}`}
                  type="button"
                  onClick={() => {
                    if (isOwner) {
                      setIsAddMemberModalOpen(true)
                      setSearchTag('')
                      setSearchResult(null)
                      setSearchError(null)
                    }
                  }}
                  className={`border-2 border-ink-black border-dashed p-4 flex flex-col items-center justify-center min-h-[110px] transform ${
                    slotIdx % 2 === 0 ? '-rotate-1' : 'rotate-1'
                  } ${
                    isOwner
                      ? 'bg-paper-cream/60 hover:bg-scream-yellow/20 hover:border-solid transition-all cursor-pointer'
                      : 'bg-paper-cream/30 opacity-60 cursor-default'
                  }`}
                >
                  <span className="font-headline-sm text-sm uppercase text-ink-black/70 font-bold">
                    + OPEN SQUAD SLOT
                  </span>
                  {isOwner && (
                    <span className="text-[10px] font-label-bold uppercase text-battle-red font-bold mt-1">
                      Click to add player by tag
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Pending Requests (Owner Only) */}
            {isOwner && pendingRequests.length > 0 && (
              <div className="mt-8 bg-paper-cream border-2 border-ink-black p-6 shadow-hard transform rotate-1">
                <h3 className="font-headline-sm text-lg text-battle-red uppercase mb-4 font-bold">
                  PENDING JOIN REQUESTS ({pendingRequests.length})
                </h3>

                <div className="flex flex-col gap-3">
                  {pendingRequests.map((req) => {
                    const prof = req.profiles || {}
                    return (
                      <div
                        key={req.profile_id}
                        className="bg-white border-2 border-ink-black p-3 flex items-center justify-between shadow-tape"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 border border-ink-black bg-paper-cream overflow-hidden">
                            <UserAvatar
                              src={prof.main_brawler_icon_url}
                              alt={prof.display_name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <span className="font-headline-sm text-sm uppercase block text-ink-black font-bold">
                              {prof.display_name || 'APPLICANT'}
                            </span>
                            <span className="font-body-md text-xs text-on-surface-variant font-bold">
                              {prof.brawl_tag || 'NO TAG'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAcceptMember(req.profile_id)}
                            className="bg-acid-green text-ink-black border border-ink-black px-3 py-1 font-headline-sm text-xs uppercase shadow-tape hover:translate-x-0.5 hover:translate-y-0.5 font-bold cursor-pointer"
                          >
                            ACCEPT
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(req.profile_id, true, false)}
                            className="bg-battle-red text-white border border-ink-black px-3 py-1 font-headline-sm text-xs uppercase shadow-tape hover:translate-x-0.5 hover:translate-y-0.5 font-bold cursor-pointer"
                          >
                            DECLINE
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Pending Invitations Sent by Captain (Owner Only) */}
            {isOwner && pendingInvites.length > 0 && (
              <div className="mt-8 bg-paper-cream border-2 border-ink-black p-6 shadow-hard transform -rotate-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-headline-sm text-lg text-ink-black uppercase font-bold flex items-center gap-2">
                    <span className="text-battle-red">⚡</span>
                    <span>OUTGOING SQUAD INVITATIONS ({pendingInvites.length})</span>
                  </h3>
                  <span className="bg-scream-yellow text-ink-black border border-ink-black text-[10px] font-headline-sm uppercase px-2 py-0.5 shadow-tape font-bold">
                    WAITING FOR ACCEPTANCE
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {pendingInvites.map((inv) => {
                    const prof = inv.profiles || {}
                    return (
                      <div
                        key={inv.profile_id}
                        className="bg-white border-2 border-ink-black p-3 flex items-center justify-between shadow-tape"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 border border-ink-black bg-paper-cream overflow-hidden">
                            <UserAvatar
                              src={prof.main_brawler_icon_url}
                              alt={prof.display_name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <span className="font-headline-sm text-sm uppercase block text-ink-black font-bold">
                              {prof.display_name || 'INVITED PLAYER'}
                            </span>
                            <span className="font-body-md text-xs text-on-surface-variant font-bold">
                              {prof.brawl_tag || 'NO TAG'} {prof.main_brawler_name ? `· Main: ${prof.main_brawler_name}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(inv.profile_id, false, true)}
                            className="bg-[#FFE5E7] text-battle-red border border-ink-black px-3 py-1 font-headline-sm text-xs uppercase shadow-tape hover:bg-battle-red hover:text-white transition-all font-bold cursor-pointer"
                          >
                            CANCEL INVITE ✕
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Right Column: Upcoming Team Scrims */}
          <section className="lg:col-span-5 space-y-6">
            <div className="flex justify-between items-center border-b-4 border-ink-black pb-3">
              <h2 className="font-headline-lg text-headline-lg uppercase text-ink-black font-bold tracking-tight">
                TEAM SCRIMS
              </h2>
              <span className="font-headline-sm text-xs bg-acid-green text-ink-black px-2.5 py-0.5 border border-ink-black font-bold shadow-tape">
                {teamLobbies.length}
              </span>
            </div>

            {teamLobbies.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-ink-black p-8 text-center text-ink-black font-label-bold uppercase text-xs font-bold">
                No active lobbies scheduled for this team.
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {teamLobbies.map((lobby, idx) => (
                  <LobbyCard key={lobby.id} lobby={lobby} index={idx} actionText="VIEW" />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Add Player by Tag Modal (Captain Only) */}
      {isAddMemberModalOpen && (
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
                  <span>CAPTAIN ROSTER TOOL</span>
                </div>
                <h2 className="font-headline-md text-2xl uppercase tracking-tight text-ink-black font-bold">
                  ADD PLAYER BY TAG
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(false)}
                className="text-ink-black hover:text-battle-red font-bold text-xl px-2 py-1 cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p className="font-body-md text-xs text-on-surface-variant font-bold">
              Enter the Brawl Stars player tag of a player registered on Scrimmage:
            </p>

            {/* Search Input Form */}
            <form onSubmit={handleSearchPlayer} className="flex gap-2">
              <input
                type="text"
                value={searchTag}
                onChange={(e) => setSearchTag(e.target.value)}
                placeholder="e.g. #8YUU98QP or 8YUU98QP"
                className="flex-grow bg-[#FAF5EA] border-2 border-ink-black px-3.5 py-2 text-sm font-headline-sm uppercase tracking-wider text-ink-black focus:outline-none focus:bg-scream-yellow/20 font-bold"
                autoFocus
              />
              <button
                type="submit"
                disabled={searchingPlayer || !searchTag.trim()}
                className="bg-ink-black text-white border-2 border-ink-black px-4 py-2 font-headline-sm text-xs uppercase shadow-tape hover:bg-battle-red transition-all cursor-pointer font-bold disabled:opacity-50"
              >
                {searchingPlayer ? 'SEARCHING...' : 'SEARCH 🔍'}
              </button>
            </form>

            {/* Error Message */}
            {searchError && (
              <div className="p-3 bg-[#FFE5E7] text-battle-red border-2 border-ink-black font-label-bold text-xs uppercase font-bold flex items-center gap-2">
                <span>⚠</span>
                <span>{searchError}</span>
              </div>
            )}

            {/* Player Found Result Card */}
            {searchResult && (
              <div className="bg-[#FAF5EA] border-2 border-ink-black p-4 shadow-tape flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-label-bold text-[10px] uppercase text-on-surface-variant font-bold">
                    PLAYER FOUND ✓
                  </span>
                  <span className="text-[10px] bg-acid-green border border-ink-black px-2 py-0.5 font-headline-sm uppercase font-bold">
                    REGISTERED
                  </span>
                </div>

                <div className="flex items-center gap-3 bg-white border border-ink-black p-3 shadow-xs">
                  <div className="w-12 h-12 bg-paper-cream border border-ink-black p-0.5 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    <UserAvatar
                      src={searchResult.main_brawler_icon_url}
                      alt={searchResult.display_name}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="truncate">
                    <span className="font-headline-sm text-base uppercase text-ink-black block truncate font-bold">
                      {searchResult.display_name}
                    </span>
                    <span className="font-body-md text-xs text-on-surface-variant block font-bold">
                      {searchResult.brawl_tag || 'NO TAG'} {searchResult.main_brawler_name ? `· Main: ${searchResult.main_brawler_name}` : ''}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddPlayerToTeam}
                  disabled={addingMember}
                  className="w-full bg-primary-container text-ink-black border-2 border-ink-black py-2.5 px-4 font-headline-sm text-xs uppercase shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer font-bold disabled:opacity-50"
                >
                  {addingMember ? 'SENDING INVITATION...' : 'SEND SQUAD INVITATION ⚡'}
                </button>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(false)}
                className="bg-paper-cream border border-ink-black px-4 py-2 text-xs font-headline-sm uppercase text-ink-black hover:bg-white transition-all cursor-pointer font-bold"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
