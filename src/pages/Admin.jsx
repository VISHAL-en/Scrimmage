import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import Navigation from '../components/Navigation'
import UserAvatar from '../components/UserAvatar'
import { getTeamBannerUrl } from '../lib/brawlers'
import dayjs from 'dayjs'

export default function Admin() {
  const { session, profile } = useAuth()
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'moderation' | 'users' | 'content'

  // Overview Stats
  const [stats, setStats] = useState({
    usersCount: 0,
    lobbiesTotal: 0,
    lobbiesOpen: 0,
    lobbiesClosed: 0,
    teamsCount: 0,
    matchesCount: 0,
    messagesCount: 0,
    reportsCount: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)

  // Moderation Data
  const [reports, setReports] = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)

  // Users Data
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userFilter, setUserFilter] = useState('ALL') // 'ALL' | 'ACTIVE' | 'BANNED' | 'ADMINS'

  // Content Data
  const [contentSubTab, setContentSubTab] = useState('lobbies') // 'lobbies' | 'teams'
  const [allLobbies, setAllLobbies] = useState([])
  const [allTeams, setAllTeams] = useState([])
  const [contentLoading, setContentLoading] = useState(false)

  // Feedback Notifications
  const [actionSuccess, setActionSuccess] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionInProgress, setActionInProgress] = useState(false)

  const showSuccess = (msg) => {
    setActionSuccess(msg)
    setTimeout(() => setActionSuccess(''), 4000)
  }

  const showError = (msg) => {
    setActionError(msg)
    setTimeout(() => setActionError(''), 5000)
  }

  // 1. Fetch Overview Stats
  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      const [
        { count: usersCount },
        { count: lobbiesTotal },
        { count: lobbiesOpen },
        { count: teamsCount },
        { count: matchesCount },
        { count: messagesCount },
        { count: reportsCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('lobbies').select('*', { count: 'exact', head: true }),
        supabase.from('lobbies').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('teams').select('*', { count: 'exact', head: true }),
        supabase.from('matches').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('message_reports').select('*', { count: 'exact', head: true })
      ])

      const totalLobs = lobbiesTotal || 0
      const openLobs = lobbiesOpen || 0

      setStats({
        usersCount: usersCount || 0,
        lobbiesTotal: totalLobs,
        lobbiesOpen: openLobs,
        lobbiesClosed: Math.max(0, totalLobs - openLobs),
        teamsCount: teamsCount || 0,
        matchesCount: matchesCount || 0,
        messagesCount: messagesCount || 0,
        reportsCount: reportsCount || 0
      })
    } catch (err) {
      console.error('Error fetching admin stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }

  // 2. Fetch Moderation Reports
  const fetchReports = async () => {
    setReportsLoading(true)
    try {
      const { data, error } = await supabase
        .from('message_reports')
        .select(`
          id,
          message_id,
          reported_by,
          reason,
          created_at,
          messages:message_id (
            id,
            content,
            created_at,
            sender_id,
            profiles:sender_id ( id, display_name, is_banned, main_brawler_icon_url )
          ),
          reporter:reported_by ( id, display_name )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReports(data || [])
    } catch (err) {
      console.error('Error fetching reports:', err)
      showError(err.message || 'Failed to fetch reports.')
    } finally {
      setReportsLoading(false)
    }
  }

  // 3. Fetch Users
  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      showError(err.message || 'Failed to fetch users.')
    } finally {
      setUsersLoading(false)
    }
  }

  // 4. Fetch Content (Lobbies & Teams)
  const fetchContent = async () => {
    setContentLoading(true)
    try {
      const [lobbiesRes, teamsRes] = await Promise.all([
        supabase
          .from('lobbies')
          .select(`
            id,
            type,
            status,
            slot_count,
            scheduled_time,
            notes,
            host_id,
            created_at,
            profiles:host_id ( display_name ),
            lobby_participants ( count )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('teams')
          .select(`
            id,
            name,
            tag,
            banner_url,
            banner_brawler_id,
            created_at,
            owner_id,
            profiles:owner_id ( display_name ),
            team_members ( count )
          `)
          .order('created_at', { ascending: false })
      ])

      if (lobbiesRes.error) throw lobbiesRes.error
      if (teamsRes.error) throw teamsRes.error

      setAllLobbies(lobbiesRes.data || [])
      setAllTeams(teamsRes.data || [])
    } catch (err) {
      console.error('Error fetching content:', err)
      showError(err.message || 'Failed to fetch lobbies/teams.')
    } finally {
      setContentLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    if (activeTab === 'moderation') fetchReports()
    if (activeTab === 'users') fetchUsers()
    if (activeTab === 'content') fetchContent()
  }, [activeTab])

  // --- ACTIONS ---

  // Delete message (and dismiss report)
  const handleDeleteReportedMessage = async (messageId, reportId) => {
    if (!window.confirm('Delete this message from the database?')) return
    setActionInProgress(true)
    try {
      const { error: msgDelErr } = await supabase.from('messages').delete().eq('id', messageId)
      if (msgDelErr) throw msgDelErr

      // Also clean up report row if needed
      if (reportId) {
        await supabase.from('message_reports').delete().eq('id', reportId)
      }

      showSuccess('Message deleted successfully.')
      await fetchReports()
      await fetchStats()
    } catch (err) {
      console.error('Error deleting message:', err)
      showError(err.message || 'Failed to delete message.')
    } finally {
      setActionInProgress(false)
    }
  }

  // Dismiss report without deleting message
  const handleDismissReport = async (reportId) => {
    setActionInProgress(true)
    try {
      const { error } = await supabase.from('message_reports').delete().eq('id', reportId)
      if (error) throw error
      showSuccess('Report dismissed.')
      setReports((prev) => prev.filter((r) => r.id !== reportId))
      await fetchStats()
    } catch (err) {
      console.error('Error dismissing report:', err)
      showError(err.message || 'Failed to dismiss report.')
    } finally {
      setActionInProgress(false)
    }
  }

  // Toggle user ban status
  const handleToggleUserBan = async (userId, currentBanStatus, userName = 'User') => {
    const action = currentBanStatus ? 'unban' : 'ban'
    if (!window.confirm(`Are you sure you want to ${action} ${userName}?`)) return
    setActionInProgress(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: !currentBanStatus })
        .eq('id', userId)

      if (error) throw error
      showSuccess(`${userName} has been ${action}ned.`)
      
      // Refresh user list and reports
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_banned: !currentBanStatus } : u))
      )
      if (activeTab === 'moderation') fetchReports()
    } catch (err) {
      console.error('Error updating user ban status:', err)
      showError(err.message || `Failed to ${action} user.`)
    } finally {
      setActionInProgress(false)
    }
  }

  // Delete Lobby
  const handleDeleteLobby = async (lobbyId) => {
    if (!window.confirm('Are you sure you want to delete this lobby? All related messages and map records will be removed.')) return
    setActionInProgress(true)
    try {
      const { error } = await supabase.from('lobbies').delete().eq('id', lobbyId)
      if (error) throw error
      showSuccess('Lobby deleted.')
      setAllLobbies((prev) => prev.filter((l) => l.id !== lobbyId))
      await fetchStats()
    } catch (err) {
      console.error('Error deleting lobby:', err)
      showError(err.message || 'Failed to delete lobby.')
    } finally {
      setActionInProgress(false)
    }
  }

  // Delete Team
  const handleDeleteTeam = async (teamId, teamName) => {
    if (!window.confirm(`Are you sure you want to delete team "${teamName}"? This will disband the squad and remove all roster records.`)) return
    setActionInProgress(true)
    try {
      const { error } = await supabase.from('teams').delete().eq('id', teamId)
      if (error) throw error
      showSuccess(`Team "${teamName}" deleted.`)
      setAllTeams((prev) => prev.filter((t) => t.id !== teamId))
      await fetchStats()
    } catch (err) {
      console.error('Error deleting team:', err)
      showError(err.message || 'Failed to delete team.')
    } finally {
      setActionInProgress(false)
    }
  }

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase().trim()
    const matchesQuery =
      !q ||
      (u.display_name || '').toLowerCase().includes(q) ||
      (u.brawl_tag || '').toLowerCase().includes(q)

    if (!matchesQuery) return false

    if (userFilter === 'BANNED') return u.is_banned === true
    if (userFilter === 'ACTIVE') return !u.is_banned
    if (userFilter === 'ADMINS') return u.is_admin === true
    return true
  })

  return (
    <div className="min-h-screen text-ink-black font-body-md flex flex-col relative overflow-x-hidden selection:bg-scream-yellow selection:text-ink-black">
      {/* Shared Navigation */}
      <Navigation />

      {/* Toast Feedback */}
      {actionSuccess && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div className="bg-acid-green text-ink-black border-2 border-ink-black shadow-hard px-6 py-3 font-headline-sm text-sm uppercase flex items-center gap-2 transform rotate-1 font-bold">
            <span className="text-lg">✓</span>
            <span>{actionSuccess}</span>
          </div>
        </div>
      )}

      {actionError && (
        <div className="fixed top-20 right-6 z-50">
          <div className="bg-battle-red text-white border-2 border-ink-black shadow-hard px-6 py-3 font-headline-sm text-sm uppercase flex items-center gap-2 transform -rotate-1 font-bold">
            <span className="text-lg">⚠</span>
            <span>{actionError}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-grow max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-10 w-full relative z-10">
        {/* Title Header */}
        <div className="mb-8 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-4 border-ink-black pb-6">
          <div>
            <div className="bg-battle-red text-white border-2 border-ink-black px-3.5 py-1 font-headline-sm text-xs uppercase -rotate-2 w-max shadow-tape mb-3 flex items-center gap-1.5 font-bold">
              <span>⚡</span>
              <span>ADMINISTRATION & PLATFORM CONTROL</span>
            </div>

            <h1
              className="font-display-xl text-5xl sm:text-7xl uppercase tracking-tighter text-battle-red leading-none"
              style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0 #181716' }}
            >
              ADMIN <span className="text-scream-yellow">COMMAND.</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="bg-scream-yellow text-ink-black border-2 border-ink-black px-3 py-1 font-headline-sm text-xs uppercase shadow-tape rotate-1 font-bold">
              👑 {profile?.display_name || 'ADMIN'}
            </div>
            <button
              type="button"
              onClick={() => {
                fetchStats()
                if (activeTab === 'moderation') fetchReports()
                if (activeTab === 'users') fetchUsers()
                if (activeTab === 'content') fetchContent()
              }}
              className="bg-white border-2 border-ink-black px-3 py-1 font-headline-sm text-xs uppercase shadow-tape hover:bg-[#FAF5EA] font-bold cursor-pointer"
              title="Refresh data"
            >
              ⟳ REFRESH
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { id: 'overview', label: '📊 OVERVIEW', badge: null },
            { id: 'moderation', label: '🚩 MODERATION', badge: stats.reportsCount > 0 ? stats.reportsCount : null },
            { id: 'users', label: '👥 USERS', badge: stats.usersCount },
            { id: 'content', label: '📁 CONTENT', badge: null }
          ].map((tab, idx) => {
            const active = activeTab === tab.id
            const rot = idx % 2 === 0 ? '-rotate-1' : 'rotate-1'
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-2 border-ink-black px-5 py-2.5 font-headline-sm text-sm uppercase shadow-hard transition-all cursor-pointer font-bold flex items-center gap-2 ${rot} ${
                  active
                    ? 'bg-scream-yellow text-ink-black translate-x-0.5 translate-y-0.5 shadow-none'
                    : 'bg-white text-ink-black hover:bg-[#FAF5EA]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge !== undefined && (
                  <span
                    className={`text-[11px] px-1.5 py-0.2 border border-ink-black font-bold leading-none ${
                      tab.id === 'moderation' && stats.reportsCount > 0
                        ? 'bg-battle-red text-white animate-pulse'
                        : 'bg-ink-black text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-8">
            {statsLoading ? (
              <div className="py-20 text-center font-headline-lg text-3xl uppercase animate-pulse">
                LOADING STATS...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Total Users */}
                <div className="bg-white border-2 border-ink-black shadow-hard p-6 transform -rotate-1 relative flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-label-bold text-xs uppercase text-on-surface-variant font-bold">TOTAL REGISTERED</span>
                    <span className="text-2xl">👥</span>
                  </div>
                  <div className="font-display-xl text-5xl text-ink-black leading-none mb-1 font-bold">
                    {stats.usersCount}
                  </div>
                  <span className="font-headline-sm text-sm uppercase text-ink-black font-bold">PLAYERS ON PLATFORM</span>
                </div>

                {/* Total Lobbies & Breakdown */}
                <div className="bg-white border-2 border-ink-black shadow-hard p-6 transform rotate-1 relative flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-label-bold text-xs uppercase text-on-surface-variant font-bold">SCRIM LOBBIES</span>
                    <span className="text-2xl">⚡</span>
                  </div>
                  <div className="font-display-xl text-5xl text-battle-red leading-none mb-1 font-bold">
                    {stats.lobbiesTotal}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-acid-green text-ink-black border border-ink-black text-[11px] px-2 py-0.5 font-headline-sm uppercase font-bold">
                      {stats.lobbiesOpen} OPEN
                    </span>
                    <span className="bg-paper-cream text-ink-black border border-ink-black text-[11px] px-2 py-0.5 font-headline-sm uppercase font-bold">
                      {stats.lobbiesClosed} FINISHED / CLOSED
                    </span>
                  </div>
                </div>

                {/* Total Teams */}
                <div className="bg-white border-2 border-ink-black shadow-hard p-6 transform -rotate-1 relative flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-label-bold text-xs uppercase text-on-surface-variant font-bold">ACTIVE SQUADS</span>
                    <span className="text-2xl">🛡️</span>
                  </div>
                  <div className="font-display-xl text-5xl text-ink-black leading-none mb-1 font-bold">
                    {stats.teamsCount}
                  </div>
                  <span className="font-headline-sm text-sm uppercase text-ink-black font-bold">TEAMS CREATED</span>
                </div>

                {/* Matches Logged */}
                <div className="bg-white border-2 border-ink-black shadow-hard p-6 transform rotate-1 relative flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-label-bold text-xs uppercase text-on-surface-variant font-bold">COMPETITIVE MATCHES</span>
                    <span className="text-2xl">🏆</span>
                  </div>
                  <div className="font-display-xl text-5xl text-ink-black leading-none mb-1 font-bold">
                    {stats.matchesCount}
                  </div>
                  <span className="font-headline-sm text-sm uppercase text-ink-black font-bold">MATCH RESULTS RECORDED</span>
                </div>

                {/* Messages Sent */}
                <div className="bg-white border-2 border-ink-black shadow-hard p-6 transform -rotate-1 relative flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-label-bold text-xs uppercase text-on-surface-variant font-bold">COMMUNITY CHAT</span>
                    <span className="text-2xl">💬</span>
                  </div>
                  <div className="font-display-xl text-5xl text-ink-black leading-none mb-1 font-bold">
                    {stats.messagesCount}
                  </div>
                  <span className="font-headline-sm text-sm uppercase text-ink-black font-bold">MESSAGES TRANSMITTED</span>
                </div>

                {/* Flagged Reports */}
                <div className={`border-2 border-ink-black shadow-hard p-6 transform rotate-1 relative flex flex-col justify-between ${
                  stats.reportsCount > 0 ? 'bg-[#FFE5E7]' : 'bg-white'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-label-bold text-xs uppercase text-on-surface-variant font-bold">MODERATION QUEUE</span>
                    <span className="text-2xl">🚩</span>
                  </div>
                  <div className={`font-display-xl text-5xl leading-none mb-1 font-bold ${
                    stats.reportsCount > 0 ? 'text-battle-red' : 'text-ink-black'
                  }`}>
                    {stats.reportsCount}
                  </div>
                  <span className="font-headline-sm text-sm uppercase text-ink-black font-bold">
                    {stats.reportsCount > 0 ? 'PENDING USER REPORTS' : 'NO ACTIVE REPORTS'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MODERATION */}
        {activeTab === 'moderation' && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h2 className="font-headline-lg text-2xl uppercase tracking-tight font-bold">
                FLAGGED MESSAGE REPORTS ({reports.length})
              </h2>
            </div>

            {reportsLoading ? (
              <div className="py-20 text-center font-headline-lg text-3xl uppercase animate-pulse">
                LOADING REPORTS...
              </div>
            ) : reports.length === 0 ? (
              <div className="bg-white border-2 border-ink-black shadow-hard p-12 text-center transform rotate-1">
                <div className="text-4xl mb-2">🛡️</div>
                <h3 className="font-headline-md text-2xl uppercase text-acid-green font-bold">
                  MODERATION QUEUE IS CLEAN
                </h3>
                <p className="font-body-md text-sm text-on-surface-variant mt-1 font-medium">
                  No chat messages are currently flagged for review.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {reports.map((rep) => {
                  const msg = rep.messages
                  const sender = msg?.profiles
                  const reporter = rep.reporter
                  const isSenderBanned = sender?.is_banned

                  return (
                    <div
                      key={rep.id}
                      className="bg-white border-2 border-ink-black shadow-hard p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transform rotate-[0.3deg]"
                    >
                      <div className="flex flex-col gap-2 flex-grow">
                        {/* Report Reason Header */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-battle-red text-white text-[11px] font-headline-sm uppercase px-2 py-0.5 border border-ink-black font-bold shadow-tape">
                            🚩 REPORT
                          </span>
                          <span className="font-body-md text-xs text-ink-black font-bold">
                            Reason: <span className="italic font-medium">"{rep.reason || 'Inappropriate content'}"</span>
                          </span>
                          <span className="text-[11px] text-on-surface-variant font-medium">
                            • Reported by <strong className="text-ink-black">{reporter?.display_name || 'Anonymous'}</strong> on{' '}
                            {dayjs(rep.created_at).format('MMM D, YYYY h:mm A')}
                          </span>
                        </div>

                        {/* Reported Content Box */}
                        {msg ? (
                          <div className="bg-[#FAF5EA] border-2 border-ink-black p-3 my-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-5 h-5 border border-ink-black bg-white flex items-center justify-center overflow-hidden">
                                <UserAvatar
                                  src={sender?.main_brawler_icon_url}
                                  alt={sender?.display_name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <span className="font-headline-sm text-xs uppercase text-ink-black font-bold">
                                {sender?.display_name || 'UNKNOWN SENDER'}
                              </span>
                              {isSenderBanned && (
                                <span className="bg-battle-red text-white text-[9px] px-1 font-bold border border-ink-black">
                                  BANNED
                                </span>
                              )}
                            </div>
                            <p className="font-body-md text-sm text-ink-black font-bold break-words">
                              "{msg.content}"
                            </p>
                          </div>
                        ) : (
                          <div className="bg-paper-cream border border-dashed border-ink-black p-2 italic text-xs text-on-surface-variant font-medium">
                            [Original message has already been deleted]
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap md:flex-col items-stretch gap-2 flex-shrink-0">
                        {msg && (
                          <button
                            type="button"
                            disabled={actionInProgress}
                            onClick={() => handleDeleteReportedMessage(msg.id, rep.id)}
                            className="bg-battle-red text-white border-2 border-ink-black px-4 py-2 font-headline-sm text-xs uppercase shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 font-bold cursor-pointer disabled:opacity-50"
                          >
                            🗑 DELETE MESSAGE
                          </button>
                        )}

                        {sender?.id && (
                          <button
                            type="button"
                            disabled={actionInProgress}
                            onClick={() => handleToggleUserBan(sender.id, isSenderBanned, sender.display_name)}
                            className={`border-2 border-ink-black px-4 py-2 font-headline-sm text-xs uppercase shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 font-bold cursor-pointer disabled:opacity-50 ${
                              isSenderBanned
                                ? 'bg-acid-green text-ink-black'
                                : 'bg-ink-black text-white'
                            }`}
                          >
                            {isSenderBanned ? '✓ UNBAN SENDER' : '🚫 BAN SENDER'}
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={actionInProgress}
                          onClick={() => handleDismissReport(rep.id)}
                          className="bg-white text-ink-black border-2 border-ink-black px-4 py-2 font-headline-sm text-xs uppercase shadow-tape hover:bg-paper-cream font-bold cursor-pointer disabled:opacity-50"
                        >
                          DISMISS REPORT
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: USERS */}
        {activeTab === 'users' && (
          <div className="flex flex-col gap-6">
            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <input
                type="text"
                placeholder="Search players by name or tag (#)..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full md:w-80 bg-white border-2 border-ink-black p-3 font-body-md text-sm text-ink-black focus:outline-none focus:bg-scream-yellow/20 font-bold shadow-tape"
              />

              <div className="flex flex-wrap gap-2">
                {['ALL', 'ACTIVE', 'BANNED', 'ADMINS'].map((filterName) => (
                  <button
                    key={filterName}
                    type="button"
                    onClick={() => setUserFilter(filterName)}
                    className={`border-2 border-ink-black px-3 py-1.5 font-headline-sm text-xs uppercase shadow-tape cursor-pointer font-bold ${
                      userFilter === filterName
                        ? 'bg-scream-yellow text-ink-black'
                        : 'bg-white text-on-surface-variant hover:bg-[#FAF5EA]'
                    }`}
                  >
                    {filterName}
                  </button>
                ))}
              </div>
            </div>

            {usersLoading ? (
              <div className="py-20 text-center font-headline-lg text-3xl uppercase animate-pulse">
                LOADING USERS...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-white border-2 border-ink-black shadow-hard p-12 text-center">
                <h3 className="font-headline-sm text-xl uppercase font-bold text-ink-black">
                  NO MATCHING USERS FOUND
                </h3>
              </div>
            ) : (
              <div className="bg-white border-2 border-ink-black shadow-hard overflow-x-auto">
                <table className="w-full text-left border-collapse font-body-md text-sm">
                  <thead>
                    <tr className="border-b-2 border-ink-black bg-paper-cream font-headline-sm text-xs uppercase">
                      <th className="p-3.5 border-r border-ink-black">Player</th>
                      <th className="p-3.5 border-r border-ink-black">Tag / Main</th>
                      <th className="p-3.5 border-r border-ink-black">Joined Date</th>
                      <th className="p-3.5 border-r border-ink-black">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, idx) => {
                      const isBanned = u.is_banned
                      const isAdmin = u.is_admin

                      return (
                        <tr
                          key={u.id}
                          className={`border-b border-ink-black/20 hover:bg-[#FAF5EA] transition-colors ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-[#FDFAF2]'
                          }`}
                        >
                          {/* Player */}
                          <td className="p-3.5 border-r border-ink-black/20">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 border border-ink-black bg-paper-cream flex items-center justify-center overflow-hidden flex-shrink-0">
                                <UserAvatar
                                  src={u.main_brawler_icon_url}
                                  alt={u.display_name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <Link
                                to={`/player/${u.id}`}
                                className="font-headline-sm text-sm uppercase text-ink-black hover:underline font-bold"
                              >
                                {u.display_name || 'NO NAME'}
                              </Link>
                            </div>
                          </td>

                          {/* Tag & Main */}
                          <td className="p-3.5 border-r border-ink-black/20">
                            <span className="font-headline-sm text-xs uppercase text-ink-black font-bold block">
                              {u.brawl_tag || '—'}
                            </span>
                            <span className="text-[11px] text-on-surface-variant font-medium">
                              {u.main_brawler_name ? `Main: ${u.main_brawler_name}` : 'No main brawler'}
                            </span>
                          </td>

                          {/* Joined */}
                          <td className="p-3.5 border-r border-ink-black/20 font-medium text-xs">
                            {dayjs(u.created_at).format('MMM D, YYYY')}
                          </td>

                          {/* Status */}
                          <td className="p-3.5 border-r border-ink-black/20">
                            <div className="flex flex-wrap gap-1">
                              {isAdmin && (
                                <span className="bg-scream-yellow text-ink-black border border-ink-black text-[10px] px-2 py-0.5 font-headline-sm uppercase font-bold shadow-tape">
                                  ADMIN
                                </span>
                              )}
                              {isBanned ? (
                                <span className="bg-battle-red text-white border border-ink-black text-[10px] px-2 py-0.5 font-headline-sm uppercase font-bold shadow-tape">
                                  BANNED
                                </span>
                              ) : (
                                <span className="bg-acid-green text-ink-black border border-ink-black text-[10px] px-2 py-0.5 font-headline-sm uppercase font-bold shadow-tape">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              disabled={actionInProgress || u.id === session?.user?.id}
                              onClick={() => handleToggleUserBan(u.id, isBanned, u.display_name)}
                              className={`border-2 border-ink-black px-3 py-1.5 font-headline-sm text-xs uppercase shadow-tape hover:translate-x-0.5 hover:translate-y-0.5 font-bold cursor-pointer disabled:opacity-40 ${
                                isBanned
                                  ? 'bg-acid-green text-ink-black'
                                  : 'bg-battle-red text-white'
                              }`}
                            >
                              {isBanned ? 'UNBAN' : 'BAN'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CONTENT (Lobbies & Teams) */}
        {activeTab === 'content' && (
          <div className="flex flex-col gap-6">
            {/* Sub-tab Switch */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setContentSubTab('lobbies')}
                className={`border-2 border-ink-black px-4 py-2 font-headline-sm text-xs uppercase shadow-hard font-bold cursor-pointer ${
                  contentSubTab === 'lobbies'
                    ? 'bg-scream-yellow text-ink-black -rotate-1'
                    : 'bg-white text-ink-black hover:bg-paper-cream'
                }`}
              >
                ⚡ LOBBIES ({allLobbies.length})
              </button>
              <button
                type="button"
                onClick={() => setContentSubTab('teams')}
                className={`border-2 border-ink-black px-4 py-2 font-headline-sm text-xs uppercase shadow-hard font-bold cursor-pointer ${
                  contentSubTab === 'teams'
                    ? 'bg-scream-yellow text-ink-black rotate-1'
                    : 'bg-white text-ink-black hover:bg-paper-cream'
                }`}
              >
                🛡️ TEAMS ({allTeams.length})
              </button>
            </div>

            {contentLoading ? (
              <div className="py-20 text-center font-headline-lg text-3xl uppercase animate-pulse">
                LOADING CONTENT...
              </div>
            ) : contentSubTab === 'lobbies' ? (
              /* Lobbies Content Table */
              <div className="bg-white border-2 border-ink-black shadow-hard overflow-x-auto">
                <table className="w-full text-left border-collapse font-body-md text-sm">
                  <thead>
                    <tr className="border-b-2 border-ink-black bg-paper-cream font-headline-sm text-xs uppercase">
                      <th className="p-3.5 border-r border-ink-black">Host</th>
                      <th className="p-3.5 border-r border-ink-black">Format</th>
                      <th className="p-3.5 border-r border-ink-black">Slots</th>
                      <th className="p-3.5 border-r border-ink-black">Status</th>
                      <th className="p-3.5 border-r border-ink-black">Scheduled</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLobbies.map((lob, idx) => (
                      <tr
                        key={lob.id}
                        className={`border-b border-ink-black/20 hover:bg-[#FAF5EA] transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-[#FDFAF2]'
                        }`}
                      >
                        <td className="p-3.5 border-r border-ink-black/20 font-bold uppercase font-headline-sm text-xs">
                          <Link to={`/lobby/${lob.id}`} className="hover:underline text-ink-black">
                            {lob.profiles?.display_name || 'ANONYMOUS'}
                          </Link>
                          {lob.notes && (
                            <p className="font-body-md text-[11px] text-on-surface-variant font-medium normal-case italic line-clamp-1">
                              "{lob.notes}"
                            </p>
                          )}
                        </td>
                        <td className="p-3.5 border-r border-ink-black/20 font-headline-sm text-xs uppercase">
                          {lob.type === 'power_league' ? 'POWER LEAGUE' : 'FRIENDLY'}
                        </td>
                        <td className="p-3.5 border-r border-ink-black/20 font-bold text-xs">
                          {lob.lobby_participants?.[0]?.count || 1} / {lob.slot_count}
                        </td>
                        <td className="p-3.5 border-r border-ink-black/20">
                          <span
                            className={`text-[10px] px-2 py-0.5 font-headline-sm uppercase border border-ink-black font-bold ${
                              lob.status === 'open'
                                ? 'bg-acid-green text-ink-black'
                                : lob.status === 'cancelled'
                                ? 'bg-battle-red text-white'
                                : 'bg-paper-cream text-ink-black'
                            }`}
                          >
                            {lob.status}
                          </span>
                        </td>
                        <td className="p-3.5 border-r border-ink-black/20 text-xs font-medium">
                          {dayjs(lob.scheduled_time).format('MMM D, h:mm A')}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            disabled={actionInProgress}
                            onClick={() => handleDeleteLobby(lob.id)}
                            className="bg-battle-red text-white border-2 border-ink-black px-3 py-1.5 font-headline-sm text-xs uppercase shadow-tape hover:translate-x-0.5 hover:translate-y-0.5 font-bold cursor-pointer disabled:opacity-50"
                          >
                            DELETE LOBBY
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Teams Content Table */
              <div className="bg-white border-2 border-ink-black shadow-hard overflow-x-auto">
                <table className="w-full text-left border-collapse font-body-md text-sm">
                  <thead>
                    <tr className="border-b-2 border-ink-black bg-paper-cream font-headline-sm text-xs uppercase">
                      <th className="p-3.5 border-r border-ink-black">Team</th>
                      <th className="p-3.5 border-r border-ink-black">Captain</th>
                      <th className="p-3.5 border-r border-ink-black">Members</th>
                      <th className="p-3.5 border-r border-ink-black">Created</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTeams.map((teamItem, idx) => (
                      <tr
                        key={teamItem.id}
                        className={`border-b border-ink-black/20 hover:bg-[#FAF5EA] transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-[#FDFAF2]'
                        }`}
                      >
                        <td className="p-3.5 border-r border-ink-black/20 font-bold uppercase font-headline-sm text-xs">
                          <Link to={`/team/${teamItem.id}`} className="hover:underline text-ink-black">
                            {teamItem.name} {teamItem.tag ? `[${teamItem.tag}]` : ''}
                          </Link>
                        </td>
                        <td className="p-3.5 border-r border-ink-black/20 font-headline-sm text-xs uppercase">
                          {teamItem.profiles?.display_name || 'OWNER'}
                        </td>
                        <td className="p-3.5 border-r border-ink-black/20 font-bold text-xs">
                          {teamItem.team_members?.[0]?.count || 1} / 6
                        </td>
                        <td className="p-3.5 border-r border-ink-black/20 text-xs font-medium">
                          {dayjs(teamItem.created_at).format('MMM D, YYYY')}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            disabled={actionInProgress}
                            onClick={() => handleDeleteTeam(teamItem.id, teamItem.name)}
                            className="bg-battle-red text-white border-2 border-ink-black px-3 py-1.5 font-headline-sm text-xs uppercase shadow-tape hover:translate-x-0.5 hover:translate-y-0.5 font-bold cursor-pointer disabled:opacity-50"
                          >
                            DELETE TEAM
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
