import { describe, expect, it, vi } from 'vitest'
import { creerRapporteur, MAX_ENVOIS_PAR_MINUTE, urlSansQuery } from './clientLogs'

function rapporteurTest() {
  let t = 0
  const envoyer = vi.fn(async () => undefined)
  const r = creerRapporteur({
    envoyer,
    maintenant: () => t,
    genererCorrelationId: () => 'corr-x',
    urlCourante: () => 'https://app.test/commandes?token=secret#frag',
  })
  return { r, envoyer, avancer: (ms: number) => (t += ms) }
}

describe('clientLogs', () => {
  it('urlSansQuery retire query et fragment', () => {
    expect(urlSansQuery('https://a/b?x=1#y')).toBe('https://a/b')
    expect(urlSansQuery('https://a/b')).toBe('https://a/b')
  })

  it('envoie level, message, url nettoyée, pile et correlationId', () => {
    const { r, envoyer } = rapporteurTest()
    const id = r.signaler('Error', 'Boom', 'Error: Boom\n at x')
    expect(id).toBe('corr-x')
    expect(envoyer).toHaveBeenCalledWith({
      level: 'Error',
      message: 'Boom',
      url: 'https://app.test/commandes',
      stack: 'Error: Boom\n at x',
      correlationId: 'corr-x',
    })
  })

  it('limite à 10 envois par minute glissante puis réautorise', () => {
    const { r, envoyer, avancer } = rapporteurTest()
    for (let i = 0; i < MAX_ENVOIS_PAR_MINUTE; i += 1) expect(r.signaler('Error', `e${i}`)).not.toBeNull()
    expect(r.signaler('Error', 'trop')).toBeNull()
    expect(envoyer).toHaveBeenCalledTimes(MAX_ENVOIS_PAR_MINUTE)
    avancer(61_000)
    expect(r.signaler('Error', 'après')).not.toBeNull()
  })

  it('dédoublonne un même message dans la fenêtre', () => {
    const { r, envoyer } = rapporteurTest()
    r.signaler('Error', 'même')
    r.signaler('Error', 'même')
    expect(envoyer).toHaveBeenCalledTimes(1)
  })

  it('un échec d’envoi ne remonte pas (journal console uniquement)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const r = creerRapporteur({
      envoyer: async () => {
        throw new Error('réseau')
      },
      urlCourante: () => 'x',
    })
    expect(() => r.signaler('Error', 'x')).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()
    expect(warn).toHaveBeenCalled()
  })
})
