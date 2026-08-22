import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const arquivo = (n: string) => resolve(import.meta.dirname, '../public/marca', n)

describe('assets do logo', () => {
  it.each(['logo-amo.png', 'logo-amo-lockup.png'])('%s existe', (n) => {
    expect(existsSync(arquivo(n))).toBe(true)
  })

  it.each(['logo-amo.png', 'logo-amo-lockup.png'])(
    '%s é PNG com canal alpha (color type 6)',
    (n) => {
      const buf = readFileSync(arquivo(n))
      // assinatura PNG
      expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      // no chunk IHDR, o byte 25 é o color type; 6 = RGBA
      expect(buf[25]).toBe(6)
    },
  )

  it('o lockup da nav é mais largo que alto, para caber na barra', () => {
    const buf = readFileSync(arquivo('logo-amo.png'))
    const largura = buf.readUInt32BE(16)
    const altura = buf.readUInt32BE(20)
    expect(largura).toBeGreaterThan(altura)
  })
})
