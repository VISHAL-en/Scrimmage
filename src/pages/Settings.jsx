import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import Navigation from '../components/Navigation'
import MainBrawlerPicker from '../components/MainBrawlerPicker'
import UserAvatar from '../components/UserAvatar'
import { getBrawlers } from '../lib/brawlers'

export default function Settings() {
  const { session, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [brawlTag, setBrawlTag] = useState('')
  const [selectedBrawlerId, setSelectedBrawlerId] = useState('')
  const [selectedBrawlerName, setSelectedBrawlerName] = useState('')
  const [selectedBrawlerObj, setSelectedBrawlerObj] = useState(null)

  const [displayNameError, setDisplayNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setBrawlTag(profile.brawl_tag || '')
      setSelectedBrawlerId(profile.main_brawler_id || '')
      setSelectedBrawlerName(profile.main_brawler_name || '')

      if (profile.main_brawler_id) {
        getBrawlers().then((list) => {
          const found = list.find((b) => String(b.id) === String(profile.main_brawler_id))
          if (found) {
            setSelectedBrawlerObj(found)
          } else if (profile.main_brawler_icon_url) {
            setSelectedBrawlerObj({
              id: profile.main_brawler_id,
              name: profile.main_brawler_name,
              imageUrl: profile.main_brawler_icon_url
            })
          }
        })
      } else if (profile.main_brawler_icon_url) {
        setSelectedBrawlerObj({
          id: profile.main_brawler_id,
          name: profile.main_brawler_name,
          imageUrl: profile.main_brawler_icon_url
        })
      }
    }
  }, [profile])

  const handleSelectBrawler = (brawler) => {
    if (String(selectedBrawlerId) === String(brawler.id)) {
      setSelectedBrawlerId('')
      setSelectedBrawlerName('')
      setSelectedBrawlerObj(null)
    } else {
      setSelectedBrawlerId(brawler.id)
      setSelectedBrawlerName(brawler.name)
      setSelectedBrawlerObj(brawler)
    }
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()

    const cleanName = displayName.trim()
    if (!cleanName) {
      setDisplayNameError('Display name is required.')
      return
    }
    setDisplayNameError('')

    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const {
        data: { session: activeSession }
      } = await supabase.auth.getSession()
      const userId = activeSession?.user?.id || session?.user?.id

      if (!userId) {
        throw new Error('No active authenticated session found. Please re-login.')
      }

      let formattedTag = brawlTag.trim().toUpperCase()
      if (formattedTag && !formattedTag.startsWith('#')) {
        formattedTag = `#${formattedTag}`
      }

      const updatePayload = {
        display_name: cleanName,
        brawl_tag: formattedTag || null,
        main_brawler_id: selectedBrawlerId || null,
        main_brawler_name: selectedBrawlerName || null,
        main_brawler_icon_url: selectedBrawlerObj?.imageUrl || null
      }

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)

      if (error) {
        console.error('[Settings] Supabase update error:', error)
        throw error
      }

      await refreshProfile()
      setSuccessMsg('Settings saved successfully!')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      console.error('Error updating settings:', err)
      setErrorMsg(err.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await supabase.auth.signOut()
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-body-md text-ink-black pb-24 md:pb-16 overflow-x-hidden selection:bg-scream-yellow selection:text-ink-black relative">
      {/* Unified Shared Navigation */}
      <Navigation />

      {/* Floating Success Notification Toast */}
      {successMsg && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div className="bg-acid-green text-ink-black border-2 border-ink-black shadow-hard px-6 py-3 font-headline-sm text-base uppercase flex items-center gap-3 transform rotate-2 font-bold">
            <span className="text-xl">✓</span>
            <span>{successMsg}</span>
            <button
              onClick={() => setSuccessMsg('')}
              className="ml-2 font-bold text-lg hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop py-12 w-full">
        {/* Header */}
        <div className="w-full mb-10 relative">
          <div className="bg-scream-yellow text-ink-black border-2 border-ink-black px-3.5 py-1 font-headline-sm text-xs uppercase -rotate-2 w-max shadow-tape mb-3 flex items-center gap-1.5 font-bold">
            <span className="text-battle-red font-bold">⚡</span>
            <span>PROFILE & ACCOUNT CONFIG</span>
          </div>

          <h1
            className="font-display-xl text-5xl sm:text-7xl md:text-8xl uppercase inline-block -rotate-1 relative z-10 leading-none text-battle-red"
            style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0 #181716' }}
          >
            YOUR <span className="text-scream-yellow">SETTINGS.</span>
          </h1>
          <p className="font-body-md text-ink-black max-w-lg mt-3 font-bold">
            Customize your player identity, main brawler avatar, and linked accounts.
          </p>
        </div>

        {errorMsg && (
          <div className="w-full mb-6 p-4 bg-[#FFE5E7] text-battle-red border-2 border-ink-black shadow-hard font-label-bold text-xs uppercase font-bold">
            ⚠ {errorMsg}
          </div>
        )}

        {/* Settings Stack */}
        <div className="w-full flex flex-col gap-10 relative z-10">
          {/* Section 1: Account Details */}
          <section
            className="bg-white p-6 md:p-8 w-full border-2 border-ink-black shadow-hard rotate-1 relative"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% calc(100% - 10px), 95% 100%, 90% calc(100% - 5px), 85% 100%, 80% calc(100% - 8px), 75% 100%, 70% calc(100% - 6px), 65% 100%, 60% calc(100% - 9px), 55% 100%, 50% calc(100% - 5px), 45% 100%, 40% calc(100% - 8px), 35% 100%, 30% calc(100% - 6px), 25% 100%, 20% calc(100% - 9px), 15% 100%, 10% calc(100% - 5px), 5% 100%, 0 calc(100% - 10px))'
            }}
          >
            <h3 className="font-headline-sm text-xl uppercase border-b-2 border-dashed border-ink-black/40 pb-2 mb-6 text-ink-black font-bold">
              Account Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-label-bold text-xs text-on-surface-variant uppercase flex justify-between items-center font-bold">
                    <span>Display Name *</span>
                    {displayNameError && (
                      <span className="text-battle-red font-bold text-xs lowercase">
                        {displayNameError}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value)
                      if (e.target.value.trim()) setDisplayNameError('')
                    }}
                    placeholder="e.g. Vex, Kai, Brawler99"
                    className={`bg-[#FAF5EA] border-2 ${
                      displayNameError
                        ? 'border-battle-red bg-battle-red/10'
                        : 'border-ink-black'
                    } font-body-md text-sm p-3 w-full text-ink-black font-bold focus:bg-scream-yellow/20 focus:outline-none transition-colors`}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-label-bold text-xs text-on-surface-variant uppercase font-bold">
                    Brawl Stars Player Tag
                  </label>
                  <input
                    type="text"
                    value={brawlTag}
                    onChange={(e) => setBrawlTag(e.target.value)}
                    placeholder="#8PQ2LJ9"
                    className="bg-[#FAF5EA] border-2 border-ink-black font-body-md text-sm p-3 w-full text-ink-black font-bold uppercase focus:bg-scream-yellow/20 focus:outline-none"
                  />
                  <span className="text-[11px] font-body-md text-on-surface-variant italic font-medium">
                    Used to fetch your trophies and live stats on your profile card.
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center md:items-start justify-center gap-3">
                <span className="font-label-bold text-xs text-on-surface-variant uppercase font-bold">
                  Current Scrim Avatar:
                </span>
                <div className="w-24 h-24 border-2 border-ink-black bg-paper-cream shadow-tape rotate-2 flex items-center justify-center overflow-hidden">
                  <UserAvatar
                    src={selectedBrawlerObj?.imageUrl || profile?.main_brawler_icon_url}
                    alt={selectedBrawlerName || 'Avatar'}
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <span className="font-headline-sm text-sm uppercase text-ink-black font-bold">
                  {selectedBrawlerName ? `Main: ${selectedBrawlerName}` : 'No Main Selected'}
                </span>
                <p className="font-body-md text-xs text-on-surface-variant max-w-[220px] text-center md:text-left font-medium">
                  Pick a brawler below to update your portrait across all scrim cards and chat.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Main Brawler Picker */}
          <section
            className="bg-white p-6 md:p-8 w-full border-2 border-ink-black shadow-hard -rotate-1 relative"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% calc(100% - 10px), 95% 100%, 90% calc(100% - 5px), 85% 100%, 80% calc(100% - 8px), 75% 100%, 70% calc(100% - 6px), 65% 100%, 60% calc(100% - 9px), 55% 100%, 50% calc(100% - 5px), 45% 100%, 40% calc(100% - 8px), 35% 100%, 30% calc(100% - 6px), 25% 100%, 20% calc(100% - 9px), 15% 100%, 10% calc(100% - 5px), 5% 100%, 0 calc(100% - 10px))'
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-dashed border-ink-black/40 pb-3 mb-6 gap-3">
              <div>
                <h3 className="font-headline-sm text-xl uppercase text-ink-black font-bold">
                  Main Brawler & Avatar
                </h3>
                <p className="font-body-md text-xs text-on-surface-variant font-bold">
                  Pick your main to set your portrait across all scrim cards & chat
                </p>
              </div>
              {selectedBrawlerName && (
                <div className="flex items-center gap-2 bg-scream-yellow text-ink-black px-3 py-1 border-2 border-ink-black shadow-tape self-start sm:self-auto font-bold">
                  {selectedBrawlerObj?.imageUrl && (
                    <img
                      src={selectedBrawlerObj.imageUrl}
                      alt={selectedBrawlerName}
                      className="w-6 h-6 object-contain"
                    />
                  )}
                  <span className="font-headline-sm text-sm uppercase">
                    Main: {selectedBrawlerName}
                  </span>
                </div>
              )}
            </div>

            <MainBrawlerPicker
              selectedBrawlerId={selectedBrawlerId}
              onSelect={handleSelectBrawler}
            />
          </section>

          {/* Primary Save CTA */}
          <div className="flex justify-center mt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-battle-red text-white font-headline-lg text-lg py-4 px-12 border-2 border-ink-black shadow-hard uppercase -rotate-1 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all active:scale-95 cursor-pointer disabled:opacity-50 font-bold tracking-wider"
            >
              {saving ? 'SAVING CHANGES...' : 'SAVE CHANGES ⚡'}
            </button>
          </div>

          {/* Section 3: Legal & Privacy */}
          <section className="bg-white p-6 md:p-8 w-full border-2 border-ink-black shadow-hard -rotate-[0.5deg] relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-headline-sm text-lg uppercase text-ink-black mb-1 font-bold">
                  Terms of Service & Privacy
                </h4>
                <p className="font-body-md text-xs text-on-surface-variant font-medium">
                  Review our platform usage terms, code of conduct, and privacy policy.
                </p>
              </div>

              <Link
                to="/terms"
                className="bg-scream-yellow text-ink-black border-2 border-ink-black px-6 py-2.5 font-headline-sm text-xs uppercase shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all font-bold tracking-wider text-center flex-shrink-0"
              >
                VIEW TERMS & PRIVACY →
              </Link>
            </div>
          </section>

          {/* Section 4: Danger Zone */}
          <section className="mt-2 bg-[#FFE5E7] border-2 border-battle-red p-6 md:p-8 shadow-hard rotate-1 relative">
            <div className="absolute -top-4 -left-3 bg-battle-red text-white px-4 py-1 font-headline-sm text-xs uppercase shadow-tape transform -rotate-3 border-2 border-ink-black font-bold">
              ⚠ DANGER ZONE
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-2">
              <div>
                <h4 className="font-headline-sm text-lg uppercase text-battle-red mb-1 font-bold">
                  Session & Authentication
                </h4>
                <p className="font-body-md text-xs text-ink-black font-bold">
                  Sign out of your active Scrimmage session on this browser.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="bg-battle-red text-white font-headline-sm text-sm uppercase px-6 py-3 border-2 border-ink-black shadow-hard hover:bg-ink-black hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer flex-shrink-0 self-start sm:self-auto font-bold tracking-wider"
              >
                LOG OUT OF ACCOUNT ✕
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
