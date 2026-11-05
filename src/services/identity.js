// Identidad = vault id.dotrino.com (única fuente). No reimplementamos nada.
import { Identity } from '@dotrino/identity'

/** @type {Identity|null} */
let identity = null

/**
 * La identidad del vault, o null si no responde.
 * @returns {Promise<Identity|null>}
 */
export async function getIdentity () {
  if (identity) return identity
  try { identity = await Identity.connect() } catch (e) {
    console.warn('[identity] vault unreachable:', e instanceof Error ? e.message : e)
    identity = null
  }
  return identity
}

/** @returns {string|null} */
export function myPubkey () { return identity?.me?.publickey || null }
