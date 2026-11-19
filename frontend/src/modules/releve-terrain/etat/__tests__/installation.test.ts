// C1 (RELEVE-CC-11, D33): browser detection and the gesture of each browser (pure functions).
import { describe, expect, it } from 'vitest'
import { adresseChrome, detecterNavigateur, gestesInstallation } from '../installation'

const UA = {
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipadBureau: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  ordinateur: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  webviewWhatsApp: 'Mozilla/5.0 (Linux; Android 14; SM-A546B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:133.0) Gecko/133.0 Firefox/133.0',
}

describe('detecterNavigateur', () => {
  it('Chrome sur Android', () => {
    expect(detecterNavigateur({ userAgent: UA.chromeAndroid, brave: false })).toEqual({ navigateur: 'chrome-android', android: true })
  })
  it('Brave sur Android : même user agent que Chrome, reconnu par navigator.brave', () => {
    expect(detecterNavigateur({ userAgent: UA.chromeAndroid, brave: true })).toEqual({ navigateur: 'brave-android', android: true })
  })
  it('Samsung Internet', () => {
    expect(detecterNavigateur({ userAgent: UA.samsung, brave: false })).toEqual({ navigateur: 'samsung', android: true })
  })
  it('iPhone (Safari) et iPad qui se dit Macintosh avec un écran tactile', () => {
    expect(detecterNavigateur({ userAgent: UA.iphone, brave: false })).toEqual({ navigateur: 'ios', android: false })
    expect(detecterNavigateur({ userAgent: UA.ipadBureau, brave: false, maxTouchPoints: 5 })).toEqual({ navigateur: 'ios', android: false })
  })
  it('ordinateur (et un Mac sans écran tactile)', () => {
    expect(detecterNavigateur({ userAgent: UA.ordinateur, brave: false })).toEqual({ navigateur: 'autre', android: false })
    expect(detecterNavigateur({ userAgent: UA.ipadBureau, brave: false, maxTouchPoints: 0 })).toEqual({ navigateur: 'autre', android: false })
  })
  it("autres navigateurs Android (navigateur intégré de WhatsApp, Firefox) : « autre », sur Android", () => {
    expect(detecterNavigateur({ userAgent: UA.webviewWhatsApp, brave: false })).toEqual({ navigateur: 'autre', android: true })
    expect(detecterNavigateur({ userAgent: UA.firefoxAndroid, brave: false })).toEqual({ navigateur: 'autre', android: true })
  })
})

describe('gestesInstallation', () => {
  it('Chrome Android : ⋮ en haut à droite, sans « Ouvrir dans Chrome »', () => {
    const g = gestesInstallation({ navigateur: 'chrome-android', android: true })
    expect(g.etapes).toEqual(['Touchez ⋮ en haut à droite.', "Puis « Installer l'application » ou « Ajouter à l'écran d'accueil »."])
    expect(g.ouvrirDansChrome).toBe(false)
    expect(g.note).toBeUndefined()
  })
  it('Brave Android : ⋮ en bas à droite, la ligne Chrome et « Ouvrir dans Chrome »', () => {
    const g = gestesInstallation({ navigateur: 'brave-android', android: true })
    expect(g.etapes).toEqual(['Touchez ⋮ en bas à droite.', "Puis « Ajouter à l'écran d'accueil »."])
    expect(g.note).toBe('Pour une installation complète, ouvrez cette page dans Chrome.')
    expect(g.ouvrirDansChrome).toBe(true)
  })
  it('Samsung Internet : ≡, « Ajouter la page à », « Écran d’accueil », et « Ouvrir dans Chrome »', () => {
    const g = gestesInstallation({ navigateur: 'samsung', android: true })
    expect(g.etapes).toEqual(['Touchez ≡.', 'Puis « Ajouter la page à ».', "Puis « Écran d'accueil »."])
    expect(g.ouvrirDansChrome).toBe(true)
  })
  it('iPhone : Partager, sans « Ouvrir dans Chrome »', () => {
    const g = gestesInstallation({ navigateur: 'ios', android: false })
    expect(g.etapes).toEqual(['Touchez Partager.', "Puis « Sur l'écran d'accueil »."])
    expect(g.ouvrirDansChrome).toBe(false)
  })
  it('ordinateur : ouvrir dans Chrome sur le téléphone ; autre navigateur Android : avec le bouton', () => {
    expect(gestesInstallation({ navigateur: 'autre', android: false })).toEqual({
      etapes: ['Ouvrez cette page dans Chrome sur votre téléphone.', "Puis touchez ⋮ et « Installer l'application »."],
      ouvrirDansChrome: false,
    })
    expect(gestesInstallation({ navigateur: 'autre', android: true }).ouvrirDansChrome).toBe(true)
  })
  it('aucun tiret cadratin, demi-cadratin ni point médian', () => {
    const tous = (['chrome-android', 'brave-android', 'samsung', 'ios', 'autre'] as const).flatMap((n) => {
      const g = gestesInstallation({ navigateur: n, android: true })
      return [...g.etapes, g.note ?? '']
    })
    expect(tous.join(' ')).not.toMatch(/[—–·]/)
  })
})

describe('adresseChrome', () => {
  it("adresse d'intention Android de la page, sans l'ancre", () => {
    expect(adresseChrome('https://1sakely.org/releve/c/abc?x=1#partages')).toBe('intent://1sakely.org/releve/c/abc?x=1#Intent;scheme=https;package=com.android.chrome;end')
  })
})
