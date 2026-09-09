export function AsteroidArt() {
  return (
    <img
      className="asteroid-art"
      src={`${import.meta.env.BASE_URL}asteroid.png`}
      alt=""
      draggable={false}
    />
  )
}
