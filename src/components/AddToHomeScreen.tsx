/**
 * Install prompt shown on the welcome screen. Auto-detects the browser and
 * shows the matching "Add to Home Screen" steps. Renders nothing once the
 * app is already running from the home screen (standalone PWA mode).
 */
export default function AddToHomeScreen() {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
  // Already installed — no prompt needed
  if (isStandalone) return null

  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const isChrome = /CriOS/.test(ua)
  const isFirefox = /FxiOS/.test(ua)
  const isEdge = /EdgiOS/.test(ua)

  let browser = 'your browser'
  let steps: string[]
  if (isChrome) {
    browser = 'Chrome'
    steps = [
      'Tap the Share icon (or the ··· menu, then Share)',
      'Tap "Add to Home Screen"',
      'Tap "Add"',
    ]
  } else if (isFirefox || isEdge) {
    browser = isFirefox ? 'Firefox' : 'Edge'
    steps = [
      'Tap the ··· menu',
      'Tap "Share", then "Add to Home Screen"',
      'Tap "Add"',
    ]
  } else if (isIOS) {
    browser = 'Safari'
    steps = [
      'Tap the Share button — a square with an up arrow',
      'Scroll down and tap "Add to Home Screen"',
      'Tap "Add"',
    ]
  } else {
    steps = [
      'Open your browser menu',
      'Choose "Add to Home Screen" or "Install app"',
    ]
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 border border-gold/40">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg">📲</span>
        <div className="text-sm font-bold text-forest">Save the app to your home screen</div>
      </div>
      <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
        Add it now so it opens like a real app all tournament{isIOS ? ` — here's how in ${browser}:` : ':'}
      </p>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-forest text-white text-[11px] font-bold flex items-center justify-center mt-px">
              {i + 1}
            </span>
            <span className="text-xs text-gray-600 leading-relaxed">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
