import { MineButton } from './components/MineButton'
import { Shop } from './components/Shop'
import { clickPower, coreMultiplier } from './game/engine'
import { formatDuration, formatNumber, formatRate } from './game/numbers'
import { useAppUpdate } from './hooks/useAppUpdate'
import { useGame } from './hooks/useGame'
import nebula from '../public/space-bg.jpg'

export default function App() {
  const game = useGame()
  const appUpdate = useAppUpdate()
  const cores = game.state.cores

  return (
    <div className="app">
      <div className="starfield" aria-hidden="true">
        <img src={nebula} alt="" />
      </div>
      <div className="vignette" aria-hidden="true" />

      {appUpdate.update ? (
        <div className="update-banner">
          <p>
            {appUpdate.message ??
              (appUpdate.ready
                ? 'Update downloaded. Tap Open installer and confirm the Android screen.'
                : `Nova ${appUpdate.update.version} is ready. Install over this app to keep your save.`)}
          </p>
          <button type="button" disabled={appUpdate.busy} onClick={() => void appUpdate.install()}>
            {appUpdate.busy
              ? 'Downloading…'
              : appUpdate.ready
                ? 'Open installer'
                : 'Install update'}
          </button>
        </div>
      ) : null}

      <header className="hud">
        <div className="brand">
          <p className="kicker">Cosmic mining incremental</p>
          <h1>NOVA</h1>
        </div>
        <div className="ore-readout">
          <p className="ore-value">{formatNumber(game.state.ore)}</p>
          <p className="ore-label">ore in hold</p>
          <p className="ore-rate">{formatRate(game.rate)}</p>
        </div>
        <div className="hud-side">
          {cores > 0 ? (
            <p className="cores">
              {formatNumber(cores, 0)} cores
              <span>×{coreMultiplier(game.state).toFixed(1)}</span>
            </p>
          ) : (
            <p className="cores is-empty">No cores yet</p>
          )}
        </div>
      </header>

      <main className="layout">
        <MineButton onStrike={game.strike} strikePower={clickPower(game.state)} />
        <Shop
          state={game.state}
          buyMode={game.buyMode}
          onBuyMode={game.setBuyMode}
          onBuyGenerator={game.buyGenerator}
          onBuyUpgrade={game.buyUpgrade}
          onBuyClickRanks={game.buyClickRanks}
          onBuyCorePerk={game.buyCorePerk}
          onWarp={game.doWarp}
          onHardReset={game.hardReset}
        />
      </main>

      {game.offline && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-labelledby="offline-title">
            <p className="kicker">Welcome back</p>
            <h2 id="offline-title">Shift report</h2>
            <p>
              Your rigs ran for {formatDuration(game.offline.elapsed)} while you were away and
              hauled in <strong>{formatNumber(game.offline.earned)} ore</strong>.
            </p>
            <button type="button" className="btn" onClick={game.dismissOffline}>
              Back to the belt
            </button>
          </div>
        </div>
      )}

      <div className="toasts" aria-live="polite">
        {game.toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            className="toast"
            onClick={() => game.dismissToast(toast.id)}
          >
            <strong>{toast.title}</strong>
            <span>{toast.flavor}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
