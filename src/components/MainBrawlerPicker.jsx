import { useState, useEffect } from 'react'
import { getBrawlers } from '../lib/brawlers'
import UserAvatar from './UserAvatar'

export default function MainBrawlerPicker({ selectedBrawlerId, onSelect }) {
  const [brawlers, setBrawlers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getBrawlers().then((list) => {
      setBrawlers(list || [])
      setLoading(false)
    })
  }, [])

  const filtered = brawlers.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search brawlers (e.g. Mortis, Fang, Colt)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-paper-cream border-0 border-b-4 border-ink-black py-3 px-3 font-body-md text-sm text-ink-black focus:bg-scream-yellow/20 focus:outline-none placeholder-ink-black/50 font-bold"
        />
      </div>

      {/* Grid of Brawler Cards */}
      {loading ? (
        <div className="py-12 text-center font-headline-sm text-lg uppercase animate-pulse text-ink-black font-bold">
          LOADING BRAWLERS...
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-[360px] overflow-y-auto p-2 bg-paper-cream border-2 border-ink-black shadow-hard">
          {filtered.map((brawler) => {
            const isSelected = String(selectedBrawlerId) === String(brawler.id)

            return (
              <button
                key={brawler.id}
                type="button"
                onClick={() => onSelect(brawler)}
                className={`flex flex-col items-center justify-between p-2 border-2 border-ink-black transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'bg-scream-yellow scale-105 shadow-hard z-10 -rotate-1'
                    : 'bg-white hover:bg-paper-cream hover:-translate-y-0.5 shadow-tape'
                }`}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 bg-battle-red text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-ink-black shadow-tape z-20">
                    ✓
                  </div>
                )}

                <div className="w-12 h-12 flex items-center justify-center overflow-hidden my-1">
                  <UserAvatar
                    src={brawler.imageUrl}
                    alt={brawler.name}
                    className="w-full h-full object-contain drop-shadow"
                  />
                </div>

                <span className="font-headline-sm text-[11px] uppercase text-ink-black truncate w-full text-center leading-tight font-bold">
                  {brawler.name}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
