let cachedMaps = null
let cachedEnvironments = null
let fetchPromise = null

// Fallback pool in case network fails
const FALLBACK_MAP_LIST = [
  { id: '15000007', map_name: 'Hard Rock Mine', mode: 'Gem Grab', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000007.png' },
  { id: '15000008', map_name: 'Crystal Arcade', mode: 'Gem Grab', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000008.png' },
  { id: '15000024', map_name: 'Backyard Bowl', mode: 'Brawl Ball', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000024.png' },
  { id: '15000026', map_name: 'Pinhole Punt', mode: 'Brawl Ball', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000026.png' },
  { id: '15000050', map_name: 'Sneaky Fields', mode: 'Brawl Ball', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000050.png' },
  { id: '15000051', map_name: 'Super Beach', mode: 'Brawl Ball', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000051.png' },
  { id: '15000054', map_name: 'Canal Grande', mode: 'Bounty', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000054.png' },
  { id: '15000005', map_name: 'Shooting Star', mode: 'Bounty', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000005.png' },
  { id: '15000014', map_name: 'Layer Cake', mode: 'Bounty', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000014.png' },
  { id: '15000019', map_name: 'Safe Zone', mode: 'Heist', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000019.png' },
  { id: '15000053', map_name: 'Hot Potato', mode: 'Heist', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000053.png' },
  { id: '15000018', map_name: 'Kaboom Canyon', mode: 'Heist', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000018.png' },
  { id: '15000257', map_name: 'Goldarm Gulch', mode: 'Knockout', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000257.png' },
  { id: '15000262', map_name: 'Out of Bounds', mode: 'Knockout', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000262.png' },
  { id: '15000266', map_name: 'Belle\'s Rock', mode: 'Knockout', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000266.png' },
  { id: '15000260', map_name: 'Flaring Phoenix', mode: 'Knockout', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000260.png' },
  { id: '15000215', map_name: 'Dueling Beetles', mode: 'Hot Zone', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000215.png' },
  { id: '15000218', map_name: 'Ring of Fire', mode: 'Hot Zone', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000218.png' },
  { id: '15000224', map_name: 'Open Business', mode: 'Hot Zone', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000224.png' },
  { id: '15000301', map_name: 'Infinite Doom', mode: 'Wipeout', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000301.png' }
]

const FALLBACK_ENVIRONMENTS = [
  { id: '1', name: 'Classic Arena', imageUrl: 'https://cdn.brawlify.com/gamemode/header/Wipeout.png' },
  { id: '3', name: 'Retro Arcade', imageUrl: 'https://cdn.brawlify.com/gamemode/header/Duels.png' },
  { id: '4', name: 'Crystal Mine', imageUrl: 'https://cdn.brawlify.com/gamemode/header/Hot-Zone.png' },
  { id: '11', name: 'Grass Stadium', imageUrl: 'https://cdn.brawlify.com/gamemode/header/Brawl-Ball.png' },
  { id: '14', name: 'Brawlywood Studio', imageUrl: 'https://cdn.brawlify.com/gamemode/header/Gem-Grab.png' },
  { id: '16', name: 'Junk Scrapyard', imageUrl: 'https://cdn.brawlify.com/gamemode/header/Heist.png' },
  { id: '22', name: 'Graveyard Mortuary', imageUrl: 'https://cdn.brawlify.com/gamemode/header/Gem-Grab.png' },
  { id: '5', name: 'Starr Park Hub', imageUrl: 'https://cdn.brawlify.com/gamemode/header/Duels.png' },
  { id: '2', name: 'Ghost Metro', imageUrl: 'https://cdn.brawlify.com/gamemode/header/Bounty.png' },
  { id: '20', name: 'Rooftop Court', imageUrl: 'https://cdn.brawlify.com/gamemode/header/Basket-Brawl-2v2.png' }
]

export function fixBannerUrl(url) {
  if (!url || typeof url !== 'string') return ''
  return url.replace(/cdn-misc\.brawlify\.com/g, 'cdn.brawlify.com')
}

function formatEnvName(name) {
  if (!name) return 'Arena'
  const known = {
    Ghostmetro: 'Ghost Metro',
    Loveswampshowdown: 'Love Swamp',
    Mortuaryshowdownhw: 'Mortuary (Halloween)',
    Defaultshowdown: 'Classic Arena',
    Arcadeshowdown: 'Retro Arcade',
    Loveswamp: 'Love Swamp',
    Grassfield: 'Grass Field',
    Bbarena: 'Brawl Stadium',
    Islandshowdown: 'Island Arena',
    Brawlywood: 'Brawlywood Studio',
    Bandstandhw: 'Bandstand',
    Scrapyard: 'Junk Scrapyard',
    Minetraintracks: 'Mine Train Tracks',
    Windstock: 'Windstock Desert',
    Bbarenavolley: 'Volley Stadium',
    Rooftop: 'Rooftop Court',
    Tropicalislandshowdown: 'Tropical Island',
    Mortuaryhw: 'Graveyard Mortuary',
    Coinfactory: 'Coin Factory',
    Airhockey: 'Air Hockey Arena',
    Odditiesshop: 'Oddities Shop',
    Madevildungeonshowdown: 'Medieval Dungeon',
    Default: 'Classic Stadium',
    Arcade: 'Retro Arcade',
    Mine: 'Crystal Mine',
    Hub: 'Starr Park Hub'
  }
  if (known[name]) return known[name]
  return name.replace(/([A-Z])/g, ' $1').trim()
}

async function fetchRawMaps() {
  if (fetchPromise) return fetchPromise

  fetchPromise = (async () => {
    try {
      const res = await fetch('https://api.brawlapi.com/v1/maps')
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const data = await res.json()
      return Array.isArray(data?.list) ? data.list : []
    } catch (err) {
      console.warn('Failed to fetch from BrawlAPI:', err)
      return []
    } finally {
      fetchPromise = null
    }
  })()

  return fetchPromise
}

export async function getAllMaps() {
  if (cachedMaps && cachedMaps.length > 0) {
    return cachedMaps
  }

  const rawList = await fetchRawMaps()
  const extracted = rawList
    .filter(m => m && m.name && !m.disabled)
    .map(m => ({
      id: String(m.id),
      map_name: m.name,
      mode: m.gameMode?.name || 'Custom',
      imageUrl: m.imageUrl || `https://cdn.brawlify.com/maps/regular/${m.id}.png`
    }))

  if (extracted.length > 0) {
    cachedMaps = extracted
    return cachedMaps
  }

  cachedMaps = FALLBACK_MAP_LIST
  return cachedMaps
}

export async function getEnvironments() {
  if (cachedEnvironments && cachedEnvironments.length > 0) {
    return cachedEnvironments
  }

  const rawList = await fetchRawMaps()
  const envMap = new Map()

  if (rawList && rawList.length > 0) {
    console.log('[BrawlAPI] Sample environment objects:', rawList.slice(0, 5).map(m => ({
      mapName: m.name,
      environment: m.environment
    })))
  }

  rawList.forEach((m) => {
    if (m && m.environment && m.environment.id && m.environment.imageUrl) {
      const envId = String(m.environment.id)
      if (!envMap.has(envId)) {
        envMap.set(envId, {
          id: envId,
          name: formatEnvName(m.environment.name),
          imageUrl: fixBannerUrl(m.environment.imageUrl)
        })
      }
    }
  })

  const extracted = Array.from(envMap.values())

  if (extracted.length > 0) {
    cachedEnvironments = extracted
    return cachedEnvironments
  }

  cachedEnvironments = FALLBACK_ENVIRONMENTS
  return cachedEnvironments
}
