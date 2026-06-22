// Cómputo de tabla por grupo y clasificación del Mundial 2026, directo del feed
// oficial. Formato 2026: 48 equipos, 12 grupos de 4; clasifican los 2 primeros de
// cada grupo (24) + los 8 mejores terceros (32 a dieciseisavos).
//
// Para el estado de cada equipo (¿clasificado / eliminado del top 2 / en disputa?)
// se hace fuerza bruta sobre los partidos de grupo que faltan: cada grupo tiene a
// lo sumo 6 partidos, así que son <=3^6 = 729 escenarios — barato y EXACTO.

import { GROUPS, GROUP_LETTERS, TEAM_BY_CODE } from './teams.js'

const isGroupMatch = (m) => {
  const h = TEAM_BY_CODE[m.home], a = TEAM_BY_CODE[m.away]
  return h && a && h.group === a.group
}
const isFinished = (m) => m.finished && m.homeGoals != null && m.awayGoals != null

function blankRow (team) {
  return { team, pj: 0, w: 0, d: 0, l: 0, gf: 0, gc: 0, pts: 0 }
}
function apply (rows, homeCode, awayCode, hg, ag) {
  const h = rows[homeCode], a = rows[awayCode]
  if (!h || !a) return
  h.pj++; a.pj++; h.gf += hg; h.gc += ag; a.gf += ag; a.gc += hg
  if (hg > ag) { h.w++; a.l++; h.pts += 3 }
  else if (hg < ag) { a.w++; h.l++; a.pts += 3 }
  else { h.d++; a.d++; h.pts++; a.pts++ }
}
const gd = (r) => r.gf - r.gc
// Orden FIFA (aprox): puntos, diferencia de gol, goles a favor, h2h simple, código.
function sortRows (arr, h2hPts) {
  return [...arr].sort((x, y) =>
    y.pts - x.pts || gd(y) - gd(x) || y.gf - x.gf ||
    ((h2hPts ? h2hPts[y.team.code] - h2hPts[x.team.code] : 0)) ||
    x.team.code.localeCompare(y.team.code))
}

/** Partidos de grupo (terminados + pendientes) de una letra, desde el feed. */
function groupMatches (letter, matches) {
  return matches.filter((m) => isGroupMatch(m) && TEAM_BY_CODE[m.home].group === letter)
}

/** Tabla + estado de un grupo. */
export function computeGroup (letter, matches) {
  const teams = GROUPS[GROUP_LETTERS.indexOf(letter)].teams
  const ms = groupMatches(letter, matches)
  const rows = {}
  teams.forEach((t) => { rows[t.code] = blankRow(t) })
  const remaining = []
  for (const m of ms) {
    if (isFinished(m)) apply(rows, m.home, m.away, m.homeGoals, m.awayGoals)
    else remaining.push([m.home, m.away])
  }
  const table = sortRows(Object.values(rows))
  const status = teamStatus(teams, rows, remaining)
  return { letter, table, remaining: remaining.length, played: ms.length - remaining.length, total: ms.length, status }
}

// Fuerza bruta: posiciones finales posibles de cada equipo según resultados que faltan.
function teamStatus (teams, rows, remaining) {
  const codes = teams.map((t) => t.code)
  const minPos = {}, maxPos = {}
  codes.forEach((c) => { minPos[c] = 5; maxPos[c] = 0 })
  const n = remaining.length
  const combos = Math.pow(3, n)
  for (let i = 0; i < combos; i++) {
    // copia de filas
    const sim = {}
    codes.forEach((c) => { sim[c] = { ...rows[c] } })
    let x = i
    for (let r = 0; r < n; r++) {
      const o = x % 3; x = (x - o) / 3
      const [hc, ac] = remaining[r]
      // 0 gana local, 1 empate, 2 gana visitante (goles simbólicos 1-0 / 1-1 / 0-1)
      if (o === 0) apply(sim, hc, ac, 1, 0)
      else if (o === 1) apply(sim, hc, ac, 1, 1)
      else apply(sim, hc, ac, 0, 1)
    }
    const ord = sortRows(Object.values(sim))
    ord.forEach((row, idx) => {
      const c = row.team.code, p = idx + 1
      if (p < minPos[c]) minPos[c] = p
      if (p > maxPos[c]) maxPos[c] = p
    })
  }
  const out = {}
  codes.forEach((c) => {
    let label, advance
    if (maxPos[c] <= 2) { label = 'clasificado'; advance = 'top2' }       // top 2 asegurado
    else if (minPos[c] >= 3) { label = 'fuera-top2'; advance = minPos[c] === 3 ? 'tercero' : 'eliminado' }
    else { label = 'disputa'; advance = 'disputa' }
    out[c] = { label, advance, minPos: minPos[c], maxPos: maxPos[c], remaining: remaining.length }
  })
  return out
}

/** Todas las tablas + ranking de terceros (mejores 8 clasifican). */
export function computeAll (matches) {
  const groups = GROUP_LETTERS.map((L) => computeGroup(L, matches))
  // Terceros actuales (posición 3 de cada grupo) rankeados; top 8 avanzan.
  const thirds = groups
    .map((g) => ({ ...g.table[2], letter: g.letter }))
    .filter((r) => r && r.team)
  const ranked = sortRows(thirds).map((r, i) => ({ ...r, rank: i + 1, qualifies: i < 8 }))
  return { groups, thirds: ranked }
}

/** Partidos de un día (YYYY-MM-DD en hora local). */
export function matchesOnDate (matches, dateStr) {
  return matches
    .filter((m) => m.kickoff && localDate(m.kickoff) === dateStr)
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))
}
export function localDate (iso) {
  const d = new Date(normalizeIso(iso))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// El feed usa "2026-06-11T19:00Z"; aseguramos parse correcto.
export function normalizeIso (iso) { return /[Z+]/.test(iso) ? iso : iso + 'Z' }
export const todayStr = () => localDate(new Date().toISOString())
