import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import isToday from 'dayjs/plugin/isToday'
import UserAvatar from './UserAvatar'

dayjs.extend(isToday)

export default function LobbyCard({
  lobby,
  index = 0,
  actionText = 'JOIN',
  showUnloggedResults = false,
  matchId = null
}) {
  const host = lobby.profiles || {}
  const maps = lobby.lobby_maps || []
  const participants = lobby.lobby_participants || []
  const team = lobby.teams || null

  const participantCount =
    typeof participants === 'number'
      ? participants
      : Array.isArray(participants)
      ? participants.length
      : participants.count ?? 0

  const isFull = participantCount >= lobby.slot_count
  const isCancelled = lobby.status === 'cancelled'
  const isFriendly = lobby.type === 'friendly'
  const isExpired = new Date(lobby.scheduled_time).getTime() + 15 * 60 * 1000 < Date.now()

  const dateStr = dayjs(lobby.scheduled_time).isToday()
    ? 'TONIGHT'
    : dayjs(lobby.scheduled_time).format('ddd, MMM D')
  const timeStr = dayjs(lobby.scheduled_time).format('h:mm A')

  const rotation =
    index % 3 === 0 ? '-rotate-1' : index % 3 === 1 ? 'rotate-1' : '-rotate-2'

  return (
    <article
      className={`bg-white border-2 border-ink-black shadow-hard p-6 flex flex-col justify-between gap-4 relative transform ${rotation} hover:-translate-y-2 hover:rotate-0 transition-all duration-200 z-10`}
      style={{
        clipPath:
          'polygon(0 0, 100% 0, 100% 95%, 98% 100%, 96% 96%, 94% 99%, 92% 95%, 90% 100%, 88% 94%, 86% 98%, 84% 95%, 82% 100%, 80% 96%, 78% 99%, 76% 95%, 74% 100%, 72% 96%, 70% 99%, 68% 94%, 66% 98%, 64% 95%, 62% 100%, 60% 96%, 58% 99%, 56% 95%, 54% 100%, 52% 96%, 50% 99%, 48% 95%, 46% 100%, 44% 96%, 42% 99%, 40% 94%, 38% 98%, 36% 95%, 34% 100%, 32% 96%, 30% 99%, 28% 95%, 26% 100%, 24% 96%, 22% 99%, 20% 95%, 18% 100%, 16% 96%, 14% 99%, 12% 94%, 10% 98%, 8% 95%, 6% 100%, 4% 96%, 2% 99%, 0 95%)'
      }}
    >
      {/* Scrim Tape Corner Tag */}
      <div
        className={`absolute -top-3 -left-3 ${
          isFriendly ? 'bg-scream-yellow text-ink-black' : 'bg-electric-blue text-white'
        } border-2 border-ink-black px-3 py-0.5 font-headline-sm text-xs uppercase -rotate-6 shadow-tape z-20 flex items-center gap-1.5`}
      >
        <span className={isFriendly ? 'text-battle-red font-bold' : 'text-scream-yellow font-bold'}>
          ⚡
        </span>
        <span className="font-bold tracking-wider">
          {isFriendly ? 'FRIENDLY' : 'POWER LEAGUE'}
        </span>
      </div>

      {/* Card Header: Host Info & Slot Count */}
      <div className="flex justify-between items-start pt-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-11 h-11 border-2 border-ink-black bg-[#FAF5EA] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-tape">
            <UserAvatar
              src={host.main_brawler_icon_url}
              alt={host.display_name}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="truncate">
            <h2 className="font-headline-sm text-lg uppercase text-ink-black truncate leading-tight">
              {team ? team.name : host.display_name || 'HOST'}
            </h2>
            <p className="font-label-bold text-xs text-on-surface-variant uppercase font-bold mt-0.5">
              {team
                ? `[${team.tag || 'TEAM'}]`
                : host.main_brawler_name
                ? `Main: ${host.main_brawler_name}`
                : 'HOST'}
            </p>
          </div>
        </div>

        {/* Slots Badge */}
        <div
          className={`border-2 border-ink-black px-2.5 py-1 font-headline-sm text-xs uppercase shadow-tape flex-shrink-0 font-bold ${
            isCancelled
              ? 'bg-battle-red text-white'
              : isExpired && !matchId
              ? 'bg-[#EFE6D8] text-ink-black'
              : isFull
              ? 'bg-ink-black text-white'
              : 'bg-scream-yellow text-ink-black'
          }`}
        >
          {isCancelled ? 'CANCELLED' : isExpired && !matchId ? 'EXPIRED' : `${participantCount} / ${lobby.slot_count}`}
        </div>
      </div>

      {/* Middle: Map Set Info & Schedule */}
      <div className="flex flex-col gap-2 py-1">
        <div className="flex items-center gap-2 text-xs font-label-bold uppercase text-ink-black font-bold">
          <span>📅 {dateStr} · {timeStr}</span>
        </div>

        {/* Map Rotation Pills */}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {maps.length > 0 ? (
            maps.slice(0, 3).map((m, idx) => (
              <span
                key={m.id || idx}
                className="bg-[#FAF5EA] border-2 border-ink-black px-2 py-0.5 text-[11px] font-label-bold uppercase text-ink-black font-bold truncate max-w-[140px]"
              >
                {m.map_name || `Map ${idx + 1}`}
              </span>
            ))
          ) : (
            <span className="text-xs font-label-bold text-on-surface-variant uppercase font-bold">
              Custom Map Set
            </span>
          )}
          {maps.length > 3 && (
            <span className="bg-scream-yellow text-ink-black border-2 border-ink-black px-1.5 py-0.5 text-[10px] font-bold">
              +{maps.length - 3}
            </span>
          )}
        </div>

        {/* Unlogged Result Warning Banner */}
        {showUnloggedResults && (
          <div className="mt-2 bg-[#FFE5E7] border-2 border-battle-red p-1.5 text-[11px] font-label-bold uppercase text-battle-red flex items-center gap-1 font-bold">
            <span>⚠</span>
            <span>Unlogged Results — Record Winners</span>
          </div>
        )}
      </div>

      {/* Footer: Action Button */}
      <div className="pt-2">
        {matchId ? (
          <Link
            to={`/match/${matchId}`}
            className="w-full bg-acid-green text-ink-black border-2 border-ink-black py-2.5 px-4 font-headline-sm text-sm uppercase text-center block shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all font-bold"
          >
            VIEW RESULTS 🏆
          </Link>
        ) : (
          <Link
            to={`/lobby/${lobby.id}`}
            className={`w-full border-2 border-ink-black py-2.5 px-4 font-headline-sm text-sm uppercase text-center block shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all font-bold tracking-wider ${
              isCancelled
                ? 'bg-[#EFE6D8] text-on-surface-variant pointer-events-none'
                : actionText === 'MANAGE'
                ? 'bg-scream-yellow text-ink-black'
                : 'bg-battle-red text-white'
            }`}
          >
            {isCancelled ? 'CANCELLED' : `${actionText} →`}
          </Link>
        )}
      </div>
    </article>
  )
}
