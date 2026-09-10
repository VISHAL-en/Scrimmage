let cachedBrawlers = null
let fetchPromise = null

export function getBrawlerBannerUrl(brawlerId) {
  if (!brawlerId) return ''
  const str = String(brawlerId).trim()
  if (!str) return ''
  if (str.startsWith('http')) {
    const match = str.match(/(16\d{6})/g)
    if (match && match.length > 0) {
      return `https://cdn.brawlify.com/brawlers/portraits/${match[match.length - 1]}.png`
    }
    return str.replace(/cdn-misc\.brawlify\.com/g, 'cdn.brawlify.com')
  }
  return `https://cdn.brawlify.com/brawlers/portraits/${str}.png`
}

export function getTeamBannerUrl(team) {
  if (!team) return ''
  if (team.banner_brawler_id) {
    return getBrawlerBannerUrl(team.banner_brawler_id)
  }
  if (team.banner_url) {
    return getBrawlerBannerUrl(team.banner_url)
  }
  return ''
}

export async function getBrawlers() {
  if (cachedBrawlers) {
    return cachedBrawlers
  }

  if (fetchPromise) {
    return fetchPromise
  }

  fetchPromise = (async () => {
    try {
      const res = await fetch('https://api.brawlapi.com/v1/brawlers')
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const data = await res.json()
      const list = Array.isArray(data?.list) ? data.list : []
      
      cachedBrawlers = list.map(b => ({
        id: String(b.id),
        name: b.name,
        imageUrl: b.imageUrl || b.imageUrl2 || b.imageUrl3,
        rarity: b.rarity?.name || 'Common',
        color: b.rarity?.color || '#FFD23F'
      })).sort((a, b) => a.name.localeCompare(b.name))

      return cachedBrawlers
    } catch (err) {
      console.error('Failed to fetch brawlers list:', err)
      // Return a basic fallback list if API fails
      return [
        { id: '16000000', name: 'Shelly', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000000.png', rarity: 'Starter', color: '#8BCF21' },
        { id: '16000001', name: 'Colt', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000001.png', rarity: 'Rare', color: '#246BFD' },
        { id: '16000002', name: 'Bull', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000002.png', rarity: 'Rare', color: '#246BFD' },
        { id: '16000003', name: 'Brock', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000003.png', rarity: 'Rare', color: '#246BFD' },
        { id: '16000004', name: 'Rico', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000004.png', rarity: 'Super Rare', color: '#246BFD' },
        { id: '16000005', name: 'Spike', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000005.png', rarity: 'Legendary', color: '#FFD23F' },
        { id: '16000006', name: 'Barley', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000006.png', rarity: 'Rare', color: '#246BFD' },
        { id: '16000007', name: 'Jessie', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000007.png', rarity: 'Super Rare', color: '#246BFD' },
        { id: '16000008', name: 'Nita', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000008.png', rarity: 'Rare', color: '#246BFD' },
        { id: '16000009', name: 'Dynamike', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000009.png', rarity: 'Super Rare', color: '#246BFD' },
        { id: '16000010', name: 'El Primo', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000010.png', rarity: 'Rare', color: '#246BFD' },
        { id: '16000011', name: 'Mortis', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000011.png', rarity: 'Mythic', color: '#E63946' },
        { id: '16000012', name: 'Crow', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000012.png', rarity: 'Legendary', color: '#FFD23F' },
        { id: '16000013', name: 'Poco', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000013.png', rarity: 'Rare', color: '#246BFD' },
        { id: '16000014', name: 'Bo', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000014.png', rarity: 'Super Rare', color: '#246BFD' },
        { id: '16000015', name: 'Piper', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000015.png', rarity: 'Epic', color: '#8BCF21' },
        { id: '16000016', name: 'Pam', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000016.png', rarity: 'Epic', color: '#8BCF21' },
        { id: '16000017', name: 'Tara', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000017.png', rarity: 'Mythic', color: '#E63946' },
        { id: '16000018', name: 'Darryl', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000018.png', rarity: 'Super Rare', color: '#246BFD' },
        { id: '16000019', name: 'Penny', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000019.png', rarity: 'Super Rare', color: '#246BFD' },
        { id: '16000020', name: 'Frank', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000020.png', rarity: 'Epic', color: '#8BCF21' },
        { id: '16000021', name: 'Gene', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000021.png', rarity: 'Mythic', color: '#E63946' },
        { id: '16000022', name: 'Tick', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000022.png', rarity: 'Super Rare', color: '#246BFD' },
        { id: '16000023', name: 'Leon', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000023.png', rarity: 'Legendary', color: '#FFD23F' },
        { id: '16000024', name: 'Rosa', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000024.png', rarity: 'Rare', color: '#246BFD' },
        { id: '16000025', name: 'Carl', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000025.png', rarity: 'Super Rare', color: '#246BFD' },
        { id: '16000026', name: 'Bibi', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000026.png', rarity: 'Epic', color: '#8BCF21' },
        { id: '16000027', name: '8-Bit', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000027.png', rarity: 'Super Rare', color: '#246BFD' },
        { id: '16000028', name: 'Sandy', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000028.png', rarity: 'Legendary', color: '#FFD23F' },
        { id: '16000029', name: 'Bea', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000029.png', rarity: 'Epic', color: '#8BCF21' },
        { id: '16000030', name: 'Emz', imageUrl: 'https://cdn.brawlify.com/brawlers/borders/16000030.png', rarity: 'Super Rare', color: '#246BFD' }
      ]
    } finally {
      fetchPromise = null
    }
  })()

  return fetchPromise
}
