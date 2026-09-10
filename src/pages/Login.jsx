import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password
        })

        if (signUpError) throw signUpError

        if (data.user) {
          navigate('/onboarding')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (signInError) throw signInError

        navigate('/')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-margin-mobile md:p-margin-desktop pt-24 md:pt-32 bg-paper-cream text-ink-black font-body-md overflow-x-hidden">
      {/* Torn Edge Base (Bottom of screen) */}
      <div
        className="fixed bottom-0 left-0 w-full h-12 bg-ink-black/20 rotate-180 z-50 pointer-events-none opacity-50"
        style={{
          clipPath:
            'polygon(0 0, 100% 0, 100% 95%, 98% 97%, 95% 94%, 92% 98%, 89% 93%, 86% 99%, 83% 95%, 80% 98%, 77% 94%, 74% 97%, 71% 93%, 68% 99%, 65% 94%, 62% 97%, 59% 93%, 56% 98%, 53% 95%, 50% 99%, 47% 94%, 44% 98%, 41% 95%, 38% 97%, 35% 93%, 32% 99%, 29% 95%, 26% 98%, 23% 94%, 20% 97%, 17% 93%, 14% 98%, 11% 95%, 8% 99%, 5% 94%, 2% 97%, 0 95%)'
        }}
      ></div>

      {/* Navigation Brand Header */}
      <nav className="absolute top-0 left-0 w-full p-gutter z-20">
        <div className="inline-block relative rotate-[-2deg]">
          <span className="font-headline-sm text-headline-sm text-ink-black tracking-widest uppercase font-bold">
            Scrimmage
          </span>
          <div
            className="absolute bottom-[-5px] left-0 w-full h-[8px] bg-no-repeat bg-center bg-[length:100%_100%]"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 10\' preserveAspectRatio=\'none\'%3E%3Cpath d=\'M0,5 Q20,8 40,3 T80,6 T100,4\' stroke=\'%23181716\' stroke-width=\'2\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E")'
            }}
          ></div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="relative z-10 w-full min-h-screen flex items-center justify-center p-margin-mobile md:p-margin-desktop pt-24 md:pt-32">
        <div className="grid grid-cols-12 gap-gutter w-full max-w-7xl relative">
          {/* Main Login Composition (Left) */}
          <div className="col-span-12 md:col-span-7 relative flex items-center justify-center md:justify-start min-h-[500px]">
            {/* Background Layer 1: Electric Blue */}
            <div
              className="absolute w-full max-w-lg h-[110%] bg-electric-blue border-2 border-ink-black rotate-[4deg] translate-x-4 translate-y-2 opacity-90 shadow-hard"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, 100% 100%, 95% 96%, 90% 100%, 85% 97%, 80% 100%, 75% 96%, 70% 100%, 65% 97%, 60% 100%, 55% 95%, 50% 100%, 45% 97%, 40% 100%, 35% 96%, 30% 100%, 25% 95%, 20% 100%, 15% 97%, 10% 100%, 5% 96%, 0 100%)'
              }}
            ></div>

            {/* Background Layer 2: Scream Yellow */}
            <div
              className="absolute w-full max-w-lg h-[105%] bg-scream-yellow border-2 border-ink-black rotate-[-3deg] -translate-x-2 -translate-y-4 shadow-hard"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, 100% 100%, 95% 96%, 90% 100%, 85% 97%, 80% 100%, 75% 96%, 70% 100%, 65% 97%, 60% 100%, 55% 95%, 50% 100%, 45% 97%, 40% 100%, 35% 96%, 30% 100%, 25% 95%, 20% 100%, 15% 97%, 10% 100%, 5% 96%, 0 100%)'
              }}
            ></div>

            {/* Top Layer: Paper Cream */}
            <div
              className="relative w-full max-w-lg bg-white border-2 border-ink-black rotate-[1deg] p-8 md:p-12 shadow-hard z-10"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, 100% 100%, 95% 96%, 90% 100%, 85% 97%, 80% 100%, 75% 96%, 70% 100%, 65% 97%, 60% 100%, 55% 95%, 50% 100%, 45% 97%, 40% 100%, 35% 96%, 30% 100%, 25% 95%, 20% 100%, 15% 97%, 10% 100%, 5% 96%, 0 100%)'
              }}
            >
              <div className="flex flex-col gap-6 relative">
                <h1 className="font-headline-lg text-headline-lg md:font-display-xl md:text-display-xl flex flex-wrap gap-x-4 gap-y-2 leading-none uppercase z-10">
                  <span
                    className="text-scream-yellow"
                    style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0px #181716' }}
                  >
                    {isSignUp ? 'JOIN THE' : 'BACK TO THE'}
                  </span>
                  <span
                    className="text-battle-red"
                    style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0px #181716' }}
                  >
                    SCRIM.
                  </span>
                </h1>

                <div className="flex gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className={`font-headline-sm uppercase text-xl cursor-pointer ${
                      !isSignUp ? 'border-b-4 border-ink-black text-ink-black' : 'text-ink-black/40'
                    } pb-1`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className={`font-headline-sm uppercase text-xl cursor-pointer ${
                      isSignUp ? 'border-b-4 border-ink-black text-ink-black' : 'text-ink-black/40'
                    } pb-1`}
                  >
                    Sign Up
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                  <div className="relative">
                    <label className="block font-label-bold text-ink-black uppercase mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent border-0 border-b-4 border-ink-black font-body-lg text-ink-black pb-2 px-1 focus:ring-0 focus:outline-none focus:bg-scream-yellow/10"
                      placeholder="brawler@starrpark.com"
                    />
                  </div>

                  <div className="relative mt-2">
                    <label className="block font-label-bold text-ink-black uppercase mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent border-0 border-b-4 border-ink-black font-body-lg text-ink-black pb-2 px-1 focus:ring-0 focus:outline-none focus:bg-scream-yellow/10"
                      placeholder="••••••••"
                    />
                  </div>

                  {error && (
                    <div className="text-battle-red font-label-bold mt-2 bg-[#FFE5E7] p-2 border-2 border-ink-black shadow-tape rotate-1">
                      {error}
                    </div>
                  )}

                  <div className="relative mt-6 group w-fit">
                    <button
                      type="submit"
                      disabled={loading}
                      className="relative z-10 bg-battle-red text-white font-headline-sm text-headline-sm uppercase px-8 py-4 border-2 border-ink-black shadow-hard rotate-[-2deg] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none hover:rotate-0 flex items-center gap-3 cursor-pointer"
                    >
                      {loading ? 'PROCESSING...' : isSignUp ? 'SIGN UP NOW ⚡' : 'LOG IN ⚡'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Decorative Collage (Right) */}
          <div className="col-span-12 md:col-span-5 relative hidden md:flex items-center justify-center">
            <div
              className="relative w-64 bg-white border-2 border-ink-black p-4 rotate-[6deg] shadow-hard z-10 translate-y-12"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, 100% 100%, 95% 96%, 90% 100%, 85% 97%, 80% 100%, 75% 96%, 70% 100%, 65% 97%, 60% 100%, 55% 95%, 50% 100%, 45% 97%, 40% 100%, 35% 96%, 30% 100%, 25% 95%, 20% 100%, 15% 97%, 10% 100%, 5% 96%, 0 100%)'
              }}
            >
              <div className="absolute -top-3 -right-3 w-16 h-8 bg-paper-cream border-2 border-ink-black rotate-[15deg] shadow-tape flex items-center justify-between px-1 z-20">
                <span className="text-battle-red font-bold text-sm">⚡</span>
                <span className="font-headline-sm text-[10px] uppercase text-ink-black">SCRIM</span>
              </div>

              <div className="flex flex-col gap-2 font-label-bold text-label-bold text-ink-black mb-4">
                <div className="flex justify-between items-center border-b-2 border-dashed border-ink-black/20 pb-1">
                  <span className="text-electric-blue">FRIENDLY · 3V3</span>
                  <span className="text-battle-red">4 / 6</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>TONIGHT · 8:30 PM</span>
                </div>
                <div className="mt-2 text-center py-1 bg-scream-yellow border-2 border-ink-black text-ink-black uppercase">
                  HARD ROCK MINE
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
