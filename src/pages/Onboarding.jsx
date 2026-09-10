import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import MainBrawlerPicker from '../components/MainBrawlerPicker'

export default function Onboarding() {
  const { session, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1) // 1: Profile Setup, 2: Main Brawler (Avatar)

  const [formData, setFormData] = useState({
    displayName: '',
    brawlTag: '',
    mainBrawlerId: null,
    mainBrawlerName: null,
    mainBrawlerIconUrl: null
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        displayName: prev.displayName || profile.display_name || '',
        brawlTag: prev.brawlTag || profile.brawl_tag || '',
        mainBrawlerId: prev.mainBrawlerId || profile.main_brawler_id || null,
        mainBrawlerName: prev.mainBrawlerName || profile.main_brawler_name || null,
        mainBrawlerIconUrl: prev.mainBrawlerIconUrl || profile.main_brawler_icon_url || null
      }))
    }
  }, [profile])

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleStep1Submit = (e) => {
    if (e) e.preventDefault()
    if (!formData.displayName.trim()) {
      setError('Display Name is required')
      return
    }
    setError(null)
    setStep(2)
  }

  const handleFinishOnboarding = async (skipBrawler = false) => {
    const {
      data: { session: activeSession }
    } = await supabase.auth.getSession()
    const userId = activeSession?.user?.id || session?.user?.id

    if (!userId) {
      setError('No active authenticated session found. Please log in again.')
      return
    }

    if (!formData.displayName.trim()) {
      setError('Display Name is required')
      setStep(1)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const updatePayload = {
        display_name: formData.displayName.trim(),
        brawl_tag: formData.brawlTag ? formData.brawlTag.trim() : null,
        main_brawler_id: skipBrawler ? null : formData.mainBrawlerId || null,
        main_brawler_name: skipBrawler ? null : formData.mainBrawlerName || null,
        main_brawler_icon_url: skipBrawler ? null : formData.mainBrawlerIconUrl || null
      }

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          ...updatePayload
        })

      if (upsertError) throw upsertError

      await refreshProfile()
      navigate('/')
    } catch (err) {
      console.error('Onboarding update error:', err)
      setError(err.message || 'Failed to complete profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen text-ink-black flex flex-col items-center justify-center p-4 md:p-8 font-body-md overflow-x-hidden relative bg-paper-cream"
      style={{
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.05\'/%3E%3C/svg%3E")'
      }}
    >
      {/* Progress Marker */}
      <div className="w-full max-w-4xl mb-8 flex justify-between items-center relative z-10 px-4">
        <div className="bg-paper-cream border-2 border-ink-black shadow-tape px-4 py-2 -rotate-3 font-label-bold text-label-bold text-ink-black flex items-center gap-2">
          <span>{step === 1 ? '01 / 02: PROFILE' : '02 / 02: MAIN BRAWLER & AVATAR'}</span>
          <span className="text-battle-red font-bold">⚡</span>
        </div>
        {step === 2 && (
          <button
            type="button"
            onClick={() => handleFinishOnboarding(true)}
            disabled={loading}
            className="text-sm font-label-bold uppercase underline hover:text-battle-red cursor-pointer"
          >
            Skip for now →
          </button>
        )}
      </div>

      {/* Headline */}
      <div className="w-full max-w-4xl mb-10 relative z-10 text-center px-4">
        <h1 className="font-display-xl text-display-xl uppercase tracking-tighter flex flex-col md:flex-row justify-center items-center gap-2 md:gap-6">
          <span
            className="text-electric-blue -rotate-2"
            style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0 #181716' }}
          >
            {step === 1 ? 'GET YOUR' : 'CHOOSE YOUR'}
          </span>
          <span
            className="text-scream-yellow rotate-1"
            style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0 #181716' }}
          >
            {step === 1 ? 'SCRIM CARD READY.' : 'MAIN BRAWLER.'}
          </span>
        </h1>
      </div>

      {error && (
        <div className="w-full max-w-2xl text-battle-red font-label-bold mb-6 bg-[#FFE5E7] p-3 border-2 border-ink-black shadow-tape">
          {error}
        </div>
      )}

      {/* STEP 1: IDENTITY & PLAYER TAG */}
      {step === 1 && (
        <main className="w-full max-w-3xl relative mb-12">
          <form
            onSubmit={handleStep1Submit}
            className="bg-white border-2 border-ink-black shadow-hard p-6 md:p-10 transform rotate-1"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% calc(100% - 10px), 95% 100%, 90% calc(100% - 5px), 85% 100%, 80% calc(100% - 8px), 75% 100%, 70% calc(100% - 6px), 65% 100%, 60% calc(100% - 4px), 55% 100%, 50% calc(100% - 9px), 45% 100%, 40% calc(100% - 5px), 35% 100%, 30% calc(100% - 7px), 25% 100%, 20% calc(100% - 4px), 15% 100%, 10% calc(100% - 8px), 5% 100%, 0 calc(100% - 5px))'
            }}
          >
            <div className="flex flex-col gap-8">
              {/* Display Name */}
              <div className="bg-paper-cream border-2 border-ink-black p-6 shadow-hard-sm transform -rotate-1">
                <label className="block font-label-bold text-ink-black uppercase mb-2">
                  Display Name *
                </label>
                <input
                  value={formData.displayName}
                  onChange={(e) => updateField('displayName', e.target.value)}
                  required
                  className="w-full bg-transparent border-0 border-b-4 border-ink-black font-headline-md text-2xl text-ink-black pb-2 px-1 focus:ring-0 focus:outline-none focus:bg-scream-yellow/10 placeholder-ink-black/30"
                  placeholder="e.g. KAI"
                  type="text"
                />
                <p className="font-body-md text-xs text-on-surface-variant mt-2 font-bold">
                  This will be shown on all scrim cards, lobby boards, and chat.
                </p>
              </div>

              {/* Player Tag */}
              <div className="bg-paper-cream border-2 border-ink-black p-6 shadow-hard-sm transform rotate-1">
                <label className="block font-label-bold text-ink-black uppercase mb-2">
                  Brawl Stars Player Tag (Optional)
                </label>
                <input
                  value={formData.brawlTag}
                  onChange={(e) => updateField('brawlTag', e.target.value)}
                  className="w-full bg-transparent border-0 border-b-4 border-ink-black font-headline-md text-2xl text-ink-black pb-2 px-1 focus:ring-0 focus:outline-none focus:bg-scream-yellow/10 placeholder-ink-black/30 uppercase"
                  placeholder="#8PQ2LJ9"
                  type="text"
                />
                <p className="font-body-md text-xs text-on-surface-variant mt-2 font-bold">
                  Used by scrim runners to add you in-game and show your trophies.
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="submit"
                className="w-full max-w-md bg-battle-red text-white font-headline-md text-headline-md uppercase py-4 border-2 border-ink-black shadow-hard hover:shadow-none hover:translate-y-1 hover:translate-x-1 transition-all duration-75 rotate-1 hover:-rotate-1 cursor-pointer"
              >
                NEXT: CHOOSE MAIN BRAWLER →
              </button>
            </div>
          </form>
        </main>
      )}

      {/* STEP 2: MAIN BRAWLER PICKER */}
      {step === 2 && (
        <main
          className="w-full max-w-4xl bg-white border-2 border-ink-black shadow-hard p-6 md:p-8 transform rotate-1 mb-12"
          style={{
            clipPath:
              'polygon(0 0, 100% 0, 100% calc(100% - 10px), 95% 100%, 90% calc(100% - 5px), 85% 100%, 80% calc(100% - 8px), 75% 100%, 70% calc(100% - 6px), 65% 100%, 60% calc(100% - 4px), 55% 100%, 50% calc(100% - 9px), 45% 100%, 40% calc(100% - 5px), 35% 100%, 30% calc(100% - 7px), 25% 100%, 20% calc(100% - 4px), 15% 100%, 10% calc(100% - 8px), 5% 100%, 0 calc(100% - 5px))'
          }}
        >
          <div className="mb-6 p-3 bg-paper-cream border-2 border-ink-black shadow-tape flex justify-between items-center text-xs font-label-bold uppercase">
            <div>
              <span className="text-battle-red mr-2 font-bold">Player: {formData.displayName}</span>
              {formData.brawlTag && (
                <span className="text-on-surface-variant font-bold">({formData.brawlTag})</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-battle-red underline uppercase hover:font-bold cursor-pointer"
            >
              Edit Details
            </button>
          </div>

          <div className="mb-4">
            <p className="font-body-md text-sm text-on-surface-variant font-bold">
              Your selected Main Brawler's portrait will also be used as your avatar across the app.
            </p>
          </div>

          <MainBrawlerPicker
            selectedBrawlerId={formData.mainBrawlerId}
            onSelect={(brawler) => {
              if (String(formData.mainBrawlerId) === String(brawler.id)) {
                updateField('mainBrawlerId', null)
                updateField('mainBrawlerName', null)
                updateField('mainBrawlerIconUrl', null)
              } else {
                updateField('mainBrawlerId', brawler.id)
                updateField('mainBrawlerName', brawler.name)
                updateField('mainBrawlerIconUrl', brawler.imageUrl)
              }
            }}
          />

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t-2 border-dashed border-ink-black/40">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full sm:w-auto bg-paper-cream text-ink-black font-headline-sm text-headline-sm uppercase px-6 py-3 border-2 border-ink-black shadow-hard hover:translate-x-1 hover:translate-y-1 transition-all cursor-pointer"
            >
              ← Back
            </button>

            <div className="flex gap-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleFinishOnboarding(true)}
                disabled={loading}
                className="flex-1 sm:flex-initial bg-paper-cream text-ink-black font-headline-sm text-headline-sm uppercase px-6 py-3 border-2 border-ink-black shadow-hard hover:translate-x-1 hover:translate-y-1 transition-all cursor-pointer"
              >
                Skip Main
              </button>

              <button
                type="button"
                onClick={() => handleFinishOnboarding(false)}
                disabled={loading}
                className="flex-1 sm:flex-initial bg-battle-red text-white font-headline-md text-headline-md uppercase px-8 py-3 border-2 border-ink-black shadow-hard hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all transform rotate-1 cursor-pointer"
              >
                {loading ? 'SAVING...' : "LET'S RUN IT ⚡"}
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
