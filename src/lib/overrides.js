// Los resultados que el admin carga a mano en el relay (`feed.overrides`) mandan
// sobre el dato del proveedor (`feed.matches`). El relay los manda aparte y deja que
// el cliente los aplique: primero matches, luego overrides (dotrino-results,
// server/server.js `buildFeed`).
//
// Un override se casa con su partido por la MISMA clave que usa el relay
// (dotrino-results/server/keys.js `matchKey`): el par de códigos sin orden + si es
// fase de grupos o eliminatoria, que se decide por la hora de inicio.

/** @typedef {import('../types').FeedMatch} FeedMatch */

/** Primer partido de eliminatoria: 2026-06-28T19:00Z; el último de grupos, ~02:00Z. */
const KNOCKOUT_START = Date.parse('2026-06-28T12:00:00Z')

/**
 * @param {{ home?: string, away?: string, kickoff?: string|null }} m
 * @returns {string} p. ej. `grp:ARG-MEX`
 */
export function matchKey (m) {
  const pair = [String(m.home || '').toUpperCase(), String(m.away || '').toUpperCase()].sort().join('-')
  const t = Date.parse(m.kickoff || '') || 0
  return (t >= KNOCKOUT_START ? 'ko' : 'grp') + ':' + pair
}

/**
 * Pone el override con el local y el visitante del partido del proveedor (el relay
 * casa el par sin orden, así que puede venir al revés).
 * @param {FeedMatch} o
 * @param {FeedMatch} m
 * @returns {FeedMatch}
 */
function alignTo (o, m) {
  if (o.home.toUpperCase() === m.home.toUpperCase()) return o
  return {
    ...o,
    home: o.away, away: o.home,
    homeGoals: o.awayGoals, awayGoals: o.homeGoals,
    homePens: o.awayPens, awayPens: o.homePens
  }
}

/**
 * Aplica los overrides sobre los partidos del proveedor. El override manda en el
 * resultado; la hora y la fase que no traiga (null) siguen siendo las del proveedor.
 * Un override sin partido del proveedor se añade tal cual.
 * @param {FeedMatch[]} matches
 * @param {FeedMatch[]} overrides
 * @returns {FeedMatch[]}
 */
export function applyOverrides (matches, overrides) {
  /** @type {Map<string, FeedMatch>} */
  const byKey = new Map()
  for (const o of overrides) byKey.set(matchKey(o), o)
  if (!byKey.size) return matches
  const used = new Set()
  const out = matches.map((m) => {
    const k = matchKey(m)
    const o = byKey.get(k)
    if (!o) return m
    used.add(k)
    const a = alignTo(o, m)
    return { ...m, ...a, kickoff: a.kickoff ?? m.kickoff, stage: a.stage ?? m.stage }
  })
  for (const [k, o] of byKey) if (!used.has(k)) out.push(o)
  return out
}
