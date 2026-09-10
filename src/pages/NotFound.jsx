import NotFoundCard from '../components/NotFoundCard'

export default function NotFound() {
  return (
    <NotFoundCard
      statusCode="404"
      badgeText="SECTOR NOT FOUND"
      title="OUT OF BOUNDS."
      description="You strayed outside the combat arena. This coordinate doesn't exist, has been destroyed, or was wiped in the last balance patch."
      primaryActionText="RETURN TO SCRIM BOARD ⚡"
      primaryActionLink="/board"
      secondaryActionText="DASHBOARD"
      secondaryActionLink="/"
    />
  )
}
