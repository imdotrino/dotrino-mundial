// Cliente del relay de resultados oficiales (results.dotrino.com). Trae el feed
// FIRMADO y lo verifica contra la pubkey PINEADA del relay (igual que el
// pronosticador). La app NUNCA pega a ESPN/FIFA: solo habla con el relay, que
// centraliza proveedores + fallback + cache + overrides firmados.

export const RESULTS_URL = import.meta.env.VITE_RESULTS_URL || 'https://results.dotrino.com'
export const RESULTS_PUBKEY =
  '{"kty":"EC","crv":"P-256","x":"ZDjs6CfsBVvqSqK8RHdplk_rW4yYYMADjEf1uAu5ToE","y":"XS3OQPNnN7Bo_JXzsxACk2EtVODr9vpBrk4Y2qhOUaU"}'

// Serialización canónica (idéntica al relay y al resto del ecosistema).
function canonicalStringify (v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(canonicalStringify).join(',') + ']'
  const ks = Object.keys(v).sort()
  return '{' + ks.map((k) => JSON.stringify(k) + ':' + canonicalStringify(v[k])).join(',') + '}'
}

function b64ToBytes (b64) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function verifyFeed (sf) {
  try {
    if (!sf || !sf.data || typeof sf.signature !== 'string') return false
    if (sf.data.publickey !== RESULTS_PUBKEY) return false
    const jwk = JSON.parse(RESULTS_PUBKEY)
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    const bytes = new TextEncoder().encode(canonicalStringify(sf.data))
    return await crypto.subtle.verify({ name: 'ECDSA', hash: { name: 'SHA-256' } }, key, b64ToBytes(sf.signature), bytes)
  } catch {
    return false
  }
}

/** Trae el feed oficial verificado. Devuelve `data` (con matches) o null. */
export async function fetchOfficialFeed () {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 12000)
    const res = await fetch(RESULTS_URL + '/official', { signal: ctrl.signal }).finally(() => clearTimeout(timer))
    if (!res.ok) return null
    const sf = await res.json()
    if (!(await verifyFeed(sf))) { console.warn('feed oficial: firma inválida (descartado)'); return null }
    return sf.data
  } catch {
    return null
  }
}
