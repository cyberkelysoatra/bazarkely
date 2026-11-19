// Installation of the app from any browser (RELEVE-CC-11, D33). Pure functions: which browser the page
// runs in, the gesture that installs the page in that browser, whether the page already runs as the
// installed app, and the Android intent address that opens the page in Chrome (copy of `adresseChrome`
// of the Validation module, never imported: the module imports nothing from the host).

export type Navigateur = 'chrome-android' | 'brave-android' | 'samsung' | 'ios' | 'autre'

export interface EnvironnementNavigateur {
  userAgent: string
  /** `navigator.brave` present (Brave's user agent looks like Chrome's). */
  brave: boolean
  /** iPadOS 13+ says « Macintosh »: a Mac with a touch screen is an iPad. */
  maxTouchPoints?: number
}

export interface Detection {
  navigateur: Navigateur
  android: boolean
}

/** Browser of the page, from its user agent and `navigator.brave`. */
export function detecterNavigateur(env: EnvironnementNavigateur): Detection {
  const ua = env.userAgent || ''
  const android = /Android/i.test(ua)
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && (env.maxTouchPoints ?? 0) > 1)
  if (ios) return { navigateur: 'ios', android: false }
  if (!android) return { navigateur: 'autre', android: false }
  if (env.brave) return { navigateur: 'brave-android', android }
  if (/SamsungBrowser/i.test(ua)) return { navigateur: 'samsung', android }
  // Chrome itself: not a WebView (« wv »), nor a browser built on Chrome that says so in its user agent.
  const autreChromium = /\bwv\b|EdgA|OPR|Opera|YaBrowser|UCBrowser|MiuiBrowser|HuaweiBrowser|DuckDuckGo|Vivaldi|FBAN|FBAV|Instagram|Line\//i
  if (/Chrome\/\d/i.test(ua) && !autreChromium.test(ua)) return { navigateur: 'chrome-android', android }
  return { navigateur: 'autre', android }
}

/** Environment of the page (outside tests). */
export function environnementPage(): EnvironnementNavigateur {
  if (typeof navigator === 'undefined') return { userAgent: '', brave: false }
  return {
    userAgent: navigator.userAgent,
    brave: 'brave' in navigator && !!(navigator as Navigator & { brave?: unknown }).brave,
    maxTouchPoints: navigator.maxTouchPoints,
  }
}

export interface Gestes {
  /** Short numbered list, in plain French. */
  etapes: string[]
  /** Extra line under the list (Brave). */
  note?: string
  /** « Ouvrir dans Chrome » shown (Android, any browser other than Chrome). */
  ouvrirDansChrome: boolean
}

/** The gesture that installs the page, for the detected browser. */
export function gestesInstallation(d: Detection): Gestes {
  const ouvrirDansChrome = d.android && d.navigateur !== 'chrome-android'
  switch (d.navigateur) {
    case 'chrome-android':
      return { etapes: ['Touchez ⋮ en haut à droite.', "Puis « Installer l'application » ou « Ajouter à l'écran d'accueil »."], ouvrirDansChrome }
    case 'brave-android':
      return {
        etapes: ['Touchez ⋮ en bas à droite.', "Puis « Ajouter à l'écran d'accueil »."],
        note: 'Pour une installation complète, ouvrez cette page dans Chrome.',
        ouvrirDansChrome,
      }
    case 'samsung':
      return { etapes: ['Touchez ≡.', 'Puis « Ajouter la page à ».', "Puis « Écran d'accueil »."], ouvrirDansChrome }
    case 'ios':
      return { etapes: ['Touchez Partager.', "Puis « Sur l'écran d'accueil »."], ouvrirDansChrome }
    default:
      return { etapes: ['Ouvrez cette page dans Chrome sur votre téléphone.', "Puis touchez ⋮ et « Installer l'application »."], ouvrirDansChrome }
  }
}

/** True when the page runs as the installed app (display-mode standalone, or Safari's navigator.standalone). */
export function estAppliInstallee(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  } catch {
    // No matchMedia: read navigator.standalone only.
  }
  return (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** Same address in Chrome: an Android intent address (copy of Validation's adresseChrome). */
export function adresseChrome(href: string): string {
  const u = new URL(href)
  u.hash = ''
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;end`
}
