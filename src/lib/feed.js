// Cliente del relay de resultados oficiales (results.dotrino.com). Trae el feed
// FIRMADO y lo verifica contra la pubkey PINEADA del relay (igual que el
// pronosticador). La app NUNCA pega a ESPN/FIFA: solo habla con el relay, que
// centraliza proveedores + fallback + cache + overrides firmados.

import { verifyDeviceSig } from '@dotrino/identity'

export const RESULTS_URL = import.meta.env.VITE_RESULTS_URL || 'https://results.dotrino.com'
export const RESULTS_PUBKEY =
  '{"kty":"EC","crv":"P-256","x":"ZDjs6CfsBVvqSqK8RHdplk_rW4yYYMADjEf1uAu5ToE","y":"XS3OQPNnN7Bo_JXzsxACk2EtVODr9vpBrk4Y2qhOUaU"}'

// La firma se verifica con el pilar (@dotrino/identity): ECDSA P-256 + SHA-256 sobre la
// forma canónica del ecosistema, la misma que usa el relay al firmar (server/sign.js).
// La confianza sale de la pubkey PINEADA, no de la que viaje en el sobre.
export async function verifyFeed (sf) {
  if (!sf || !sf.data || typeof sf.signature !== 'string') return false
  if (sf.data.publickey !== RESULTS_PUBKEY) return false
  return verifyDeviceSig({ publickey: RESULTS_PUBKEY, data: sf.data, signature: sf.signature })
}

/** Trae el feed oficial verificado. Devuelve `data` (con matches) o null. */
export async function fetchOfficialFeed () {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 12000)
    const res = await fetch(RESULTS_URL + '/official', { signal: ctrl.signal }).finally(() => clearTimeout(timer))
    if (!res.ok) return null
    const sf = await res.json()
    if (!(await verifyFeed(sf))) { console.warn('official feed: invalid signature (discarded)'); return null }
    return sf.data
  } catch {
    return null
  }
}
