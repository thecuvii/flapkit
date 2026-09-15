import { useId } from 'react'

export function SiteGrain() {
  const filterId = useId()
  const patternId = useId()

  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[999] size-full opacity-20 mix-blend-overlay"
      aria-hidden
    >
      <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.72"
          numOctaves="4"
          seed="2"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <pattern id={patternId} width="256" height="256" patternUnits="userSpaceOnUse">
        <rect width="256" height="256" filter={`url(#${filterId})`} />
      </pattern>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}
