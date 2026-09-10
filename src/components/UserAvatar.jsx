import { useState } from 'react'

export default function UserAvatar({
  src,
  alt = 'Brawler',
  className = 'w-full h-full object-contain',
  ring,
  size
}) {
  const [imgError, setImgError] = useState(false)
  const defaultIcon = 'https://cdn.brawlify.com/brawlers/borderless/16000000.png' // Shelly fallback

  const imageSrc = !src || imgError ? defaultIcon : src

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <img
        src={imageSrc}
        alt={alt}
        className={className}
        onError={() => setImgError(true)}
      />
    </div>
  )
}
