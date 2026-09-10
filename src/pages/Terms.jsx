import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'

export default function Terms() {
  return (
    <div className="min-h-screen text-ink-black font-body-md flex flex-col relative overflow-x-hidden selection:bg-scream-yellow selection:text-ink-black">
      {/* Shared Navigation */}
      <Navigation />

      {/* Main Container */}
      <main className="flex-grow max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop py-12 w-full">
        {/* Header Badge & Title */}
        <div className="mb-10 relative">
          <div className="bg-scream-yellow text-ink-black border-2 border-ink-black px-3.5 py-1 font-headline-sm text-xs uppercase -rotate-2 w-max shadow-tape mb-3 flex items-center gap-1.5 font-bold">
            <span className="text-battle-red font-bold">⚡</span>
            <span>LEGAL & PLATFORM POLICIES</span>
          </div>

          <h1
            className="font-display-xl text-4xl sm:text-6xl md:text-7xl uppercase tracking-tighter text-battle-red leading-none"
            style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0 #181716' }}
          >
            TERMS OF SERVICE & <span className="text-scream-yellow">PRIVACY POLICY.</span>
          </h1>
          <p className="font-headline-sm text-sm uppercase text-on-surface-variant mt-2 font-bold">
            Last updated: [10/9/26]
          </p>
        </div>

        {/* Content Box */}
        <article
          className="bg-white border-2 border-ink-black shadow-hard p-6 sm:p-10 transform rotate-[0.5deg] relative flex flex-col gap-8"
          style={{
            clipPath:
              'polygon(0 0, 100% 0, 100% calc(100% - 10px), 95% 100%, 90% calc(100% - 5px), 85% 100%, 80% calc(100% - 8px), 75% 100%, 70% calc(100% - 6px), 65% 100%, 60% calc(100% - 4px), 55% 100%, 50% calc(100% - 9px), 45% 100%, 40% calc(100% - 5px), 35% 100%, 30% calc(100% - 7px), 25% 100%, 20% calc(100% - 4px), 15% 100%, 10% calc(100% - 8px), 5% 100%, 0 calc(100% - 5px))'
          }}
        >
          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="font-headline-sm text-xl uppercase text-ink-black border-b-2 border-dashed border-ink-black/30 pb-1 font-bold">
              Who this is for
            </h2>
            <p className="font-body-md text-sm text-ink-black font-medium leading-relaxed">
              Scrimmage is a community-run, non-commercial platform for organizing Brawl Stars scrims. It is not affiliated with, endorsed by, or connected to Supercell.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="font-headline-sm text-xl uppercase text-ink-black border-b-2 border-dashed border-ink-black/30 pb-1 font-bold">
              Account & Age
            </h2>
            <p className="font-body-md text-sm text-ink-black font-medium leading-relaxed">
              You need an account (email + password) to use this platform. If you are under the age of 13 (or the minimum age required by your country's laws), please ask a parent or guardian before creating an account.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="font-headline-sm text-xl uppercase text-ink-black border-b-2 border-dashed border-ink-black/30 pb-1 font-bold">
              What we collect
            </h2>
            <ul className="list-disc list-inside space-y-1 font-body-md text-sm text-ink-black font-medium pl-2">
              <li>Your email address (for login only — never shown publicly)</li>
              <li>A display name and, optionally, your Brawl Stars player tag</li>
              <li>Activity you create: lobbies you host or join, chat messages, match results you log, and teams you create or join</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h2 className="font-headline-sm text-xl uppercase text-ink-black border-b-2 border-dashed border-ink-black/30 pb-1 font-bold">
              How we use it
            </h2>
            <p className="font-body-md text-sm text-ink-black font-medium leading-relaxed">
              Solely to run the platform: showing your profile to other users, matching you with scrims, and displaying your activity/stats. We do not sell your data or use it for advertising.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <h2 className="font-headline-sm text-xl uppercase text-ink-black border-b-2 border-dashed border-ink-black/30 pb-1 font-bold">
              Chat & Conduct
            </h2>
            <p className="font-body-md text-sm text-ink-black font-medium leading-relaxed">
              Messages you send are visible to other participants in that lobby. Don't share personal information you're not comfortable with others seeing. Messages can be reported or removed by lobby hosts. Abusive behavior may result in content removal.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2">
            <h2 className="font-headline-sm text-xl uppercase text-ink-black border-b-2 border-dashed border-ink-black/30 pb-1 font-bold">
              Third-party data
            </h2>
            <p className="font-body-md text-sm text-ink-black font-medium leading-relaxed">
              Your Brawl Stars stats (if you link a player tag) are fetched live from Supercell's official API and are publicly viewable in-game already.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-2">
            <h2 className="font-headline-sm text-xl uppercase text-ink-black border-b-2 border-dashed border-ink-black/30 pb-1 font-bold">
              Data deletion
            </h2>
            <p className="font-body-md text-sm text-ink-black font-medium leading-relaxed">
              To request deletion of your account and associated data, contact{' '}
              <a href="mailto:teamdefaultbs@gmail.com" className="text-battle-red underline font-bold hover:text-ink-black">
                teamdefaultbs@gmail.com
              </a>.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-2">
            <h2 className="font-headline-sm text-xl uppercase text-ink-black border-b-2 border-dashed border-ink-black/30 pb-1 font-bold">
              Disclaimer
            </h2>
            <p className="font-body-md text-sm text-ink-black font-medium leading-relaxed">
              This platform is provided as-is, run by a community member, with no guarantee of uptime or accuracy. Use at your own discretion.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-2 pb-2">
            <h2 className="font-headline-sm text-xl uppercase text-ink-black border-b-2 border-dashed border-ink-black/30 pb-1 font-bold">
              Contact
            </h2>
            <p className="font-body-md text-sm text-ink-black font-medium leading-relaxed">
              Questions? Reach out at{' '}
              <a href="mailto:teamdefaultbs@gmail.com" className="text-battle-red underline font-bold hover:text-ink-black">
                teamdefaultbs@gmail.com
              </a>.
            </p>
          </section>
        </article>

        {/* Back Link */}
        <div className="mt-8 flex justify-center">
          <Link
            to="/settings"
            className="bg-scream-yellow text-ink-black border-2 border-ink-black px-6 py-2.5 font-headline-sm text-sm uppercase shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all font-bold"
          >
            ← BACK TO SETTINGS
          </Link>
        </div>
      </main>
    </div>
  )
}
