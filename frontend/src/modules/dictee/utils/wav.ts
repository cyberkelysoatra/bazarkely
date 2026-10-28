/**
 * 16 kHz mono 16-bit WAV conversion (fallback when the AI refuses the
 * recorder's own format). `encoderWav` is pure and tested; `convertirEnWav`
 * decodes with the browser then resamples with an OfflineAudioContext.
 */

export const WAV_SAMPLE_RATE = 16000

function ecrireTexte(vue: DataView, position: number, texte: string): void {
  for (let i = 0; i < texte.length; i++) vue.setUint8(position + i, texte.charCodeAt(i))
}

/** PCM samples in [-1, 1] → complete WAV file (44-byte RIFF header + data). */
export function encoderWav(echantillons: Float32Array, sampleRate: number = WAV_SAMPLE_RATE): ArrayBuffer {
  const octetsDonnees = echantillons.length * 2
  const tampon = new ArrayBuffer(44 + octetsDonnees)
  const vue = new DataView(tampon)

  ecrireTexte(vue, 0, 'RIFF')
  vue.setUint32(4, 36 + octetsDonnees, true)
  ecrireTexte(vue, 8, 'WAVE')
  ecrireTexte(vue, 12, 'fmt ')
  vue.setUint32(16, 16, true) // fmt chunk size
  vue.setUint16(20, 1, true) // PCM
  vue.setUint16(22, 1, true) // mono
  vue.setUint32(24, sampleRate, true)
  vue.setUint32(28, sampleRate * 2, true) // byte rate
  vue.setUint16(32, 2, true) // block align
  vue.setUint16(34, 16, true) // bits per sample
  ecrireTexte(vue, 36, 'data')
  vue.setUint32(40, octetsDonnees, true)

  let position = 44
  for (let i = 0; i < echantillons.length; i++) {
    const s = Math.max(-1, Math.min(1, echantillons[i]))
    vue.setInt16(position, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    position += 2
  }
  return tampon
}

/** Any audio the browser can decode → 16 kHz mono WAV blob. */
export async function convertirEnWav(audio: Blob): Promise<Blob> {
  const brut = await audio.arrayBuffer()
  const Ctx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext
  const decodeur = new Ctx()
  let decode: AudioBuffer
  try {
    decode = await decodeur.decodeAudioData(brut)
  } finally {
    void decodeur.close().catch(() => undefined)
  }
  const longueur = Math.max(1, Math.ceil(decode.duration * WAV_SAMPLE_RATE))
  const horsLigne = new OfflineAudioContext(1, longueur, WAV_SAMPLE_RATE)
  const source = horsLigne.createBufferSource()
  source.buffer = decode
  source.connect(horsLigne.destination) // mixed down to mono by the 1-channel context
  source.start()
  const rendu = await horsLigne.startRendering()
  return new Blob([encoderWav(rendu.getChannelData(0), WAV_SAMPLE_RATE)], { type: 'audio/wav' })
}
