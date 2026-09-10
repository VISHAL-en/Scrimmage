import { Link } from 'react-router-dom'
import Navigation from './Navigation'

export default function NotFoundCard({
  badgeText = '404 // ERROR',
  title = 'MATCH NOT FOUND.',
  description = 'Looks like you dashed into the wrong bush or this scrim lobby expired.',
  primaryActionText = 'RETURN TO DASHBOARD ⚡',
  primaryActionLink = '/',
  secondaryActionText = 'BROWSE OPEN SCRIMS',
  secondaryActionLink = '/board'
}) {
  return (
    <div
      className="min-h-screen flex flex-col font-body-md text-ink-black bg-paper-cream overflow-x-hidden relative"
      style={{
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.05\'/%3E%3C/svg%3E")'
      }}
    >
      <Navigation />

      <main className="flex-1 max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop py-16 w-full flex items-center justify-center">
        <div
          className="relative bg-white border-2 border-ink-black shadow-hard w-full max-w-xl p-8 md:p-12 transform -rotate-1"
          style={{
            clipPath:
              'polygon(0 0, 100% 0, 100% 97%, 95% 100%, 90% 98%, 85% 100%, 80% 97%, 75% 100%, 70% 98%, 65% 100%, 60% 97%, 55% 100%, 50% 98%, 45% 100%, 40% 97%, 35% 100%, 30% 98%, 25% 100%, 20% 97%, 15% 100%, 10% 98%, 5% 100%, 0 97%)'
          }}
        >
          {/* Tape Badge */}
          <div className="absolute -top-4 -left-3 bg-scream-yellow border-2 border-ink-black px-4 py-1 -rotate-6 shadow-tape flex items-center gap-2">
            <span className="text-battle-red font-bold">⚠</span>
            <span className="font-headline-sm text-xs uppercase tracking-wider text-ink-black">
              {badgeText}
            </span>
          </div>

          <div className="flex flex-col gap-6 pt-2">
            <h1
              className="font-display-xl text-4xl sm:text-6xl uppercase tracking-tighter text-battle-red"
              style={{ WebkitTextStroke: '2px #181716', textShadow: '4px 4px 0 #181716' }}
            >
              {title}
            </h1>

            <p className="font-body-lg text-body-lg text-ink-black font-bold border-l-4 border-ink-black pl-4">
              {description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t-2 border-dashed border-ink-black/30">
              <Link
                to={primaryActionLink}
                className="flex-1 bg-battle-red text-white text-center py-3.5 px-6 font-headline-sm text-sm uppercase border-2 border-ink-black shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
              >
                {primaryActionText}
              </Link>
              {secondaryActionLink && (
                <Link
                  to={secondaryActionLink}
                  className="flex-1 bg-paper-cream text-ink-black text-center py-3.5 px-6 font-headline-sm text-sm uppercase border-2 border-ink-black shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                >
                  {secondaryActionText}
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
