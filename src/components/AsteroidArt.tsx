interface AsteroidArtProps {
  hue?: number
  wear?: number
}

export function AsteroidArt({ hue = 0, wear = 0 }: AsteroidArtProps) {
  return (
    <div className="asteroid-tint" style={{ filter: `hue-rotate(${hue}deg)` }}>
      <img
        className="asteroid-art"
        src={`${import.meta.env.BASE_URL}asteroid.png`}
        alt=""
        draggable={false}
      />
      <svg
        className="asteroid-wear"
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ opacity: wear * 0.9 }}
      >
        <path d="M28 22 L41 38 L34 52" />
        <path d="M62 18 L58 36 L71 48" />
        <path d="M22 58 L38 64 L33 78" />
        <path d="M70 60 L78 72 L64 80" />
        <path d="M48 30 L52 48 L46 68" />
      </svg>
    </div>
  )
}
