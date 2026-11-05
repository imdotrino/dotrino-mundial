// Resuelve cada caja del bracket (bracket.js) desde el feed oficial + la tabla de
// grupos. Read-only: cada caja queda con sus dos lados (equipo real o etiqueta de
// cupo: «1º A», «2º C», «3º», «Gana 89») + marcador si el feed lo tiene.

import { GROUP_LETTERS, TEAM_BY_CODE } from './teams.js'
import { computeGroup, normalizeIso, normStage as norm, rankThirds } from './standings.js'
import { R32, R16, QF, SF, FINAL, THIRD_PLACE, THIRD_SLOTS, allocateThirds } from './bracket.js'

/** @typedef {import('../types').FeedMatch} FeedMatch */
/** @typedef {import('../types').Slot} Slot */
/** @typedef {import('../types').Side} Side */
/** @typedef {import('../types').ProvSide} ProvSide */
/** @typedef {import('../types').Box} Box */
/** @typedef {import('../types').R32Def} R32Def */
/** @typedef {import('../types').LaterDef} LaterDef */

/**
 * @param {string|null} code
 * @param {string} label
 * @returns {Side}
 */
function sideOf (code, label) {
  const t = code && TEAM_BY_CODE[code]
  if (t) return { code: t.code, flag: t.flag, name: t.name, real: true }
  let nm = label
  const m = /^([12])([A-L])$/.exec(code || '')
  if (m) nm = `${m[1]}º ${m[2]}`
  else if (/^3/.test(code || '')) nm = '3º'
  return { code: '', flag: '', name: nm || code || '—', real: false }
}

/**
 * Cada caja de la llave, resuelta desde el feed y las tablas de grupo.
 * @param {FeedMatch[]} matches
 * @returns {import('../types').Bracket}
 */
export function resolveBracket (matches) {
  // grupos: decidido (todos jugados) + 1º/2º
  const groups = GROUP_LETTERS.map((L) => computeGroup(L, matches))
  // Posición ACTUAL del cupo (provisional con resultados parciales). decided=true
  // cuando el grupo ya está cerrado; null si el grupo aún no jugó.
  /** @type {(slot: Slot) => ProvSide|null} */
  const provInfo = (slot) => {
    if (slot.kind === '3rd') return null
    const g = groups[slot.group]
    if (g.played === 0 && !(g.live && g.live.length)) return null // sin nada jugado aún
    const row = slot.kind === 'W' ? g.table[0] : g.table[1]
    return { code: row.team.code, decided: g.remaining === 0 }
  }
  /** @type {(feedCode: string|null, prov: ProvSide|null, label: string) => Side} */
  const chooseSide = (feedCode, prov, label) => {
    const ft = feedCode && TEAM_BY_CODE[feedCode]
    if (ft) return { code: ft.code, flag: ft.flag, name: ft.name, real: true, prov: false }
    if (prov && prov.code && TEAM_BY_CODE[prov.code]) {
      const t = TEAM_BY_CODE[prov.code]
      return { code: t.code, flag: t.flag, name: t.name, real: true, prov: !prov.decided }
    }
    return sideOf(feedCode, label)
  }
  /** @type {(slot: Slot) => string} */
  const phSlot = (slot) => slot.kind === 'W' ? '1' + GROUP_LETTERS[slot.group]
    : slot.kind === 'RU' ? '2' + GROUP_LETTERS[slot.group] : '3RD'
  /** @type {(slot: Slot) => string} */
  const labelSlot = (slot) => slot.kind === 'W' ? `1º ${GROUP_LETTERS[slot.group]}`
    : slot.kind === 'RU' ? `2º ${GROUP_LETTERS[slot.group]}` : '3º'

  // Mejores 8 terceros (provisional): ranking de los 12 terceros actuales → top 8,
  // asignados a los 8 cupos de tercero por la regla FIFA. Así el bracket los muestra.
  const top8 = rankThirds(groups).slice(0, 8).map((r) => r.gi)
  const alloc = allocateThirds(top8)
  const allDecided = groups.every((g) => g.remaining === 0)
  // Equipos que el feed YA colocó en una caja real de dieciseisavos. La asignación
  // de terceros (allocateThirds) es HEURÍSTICA y puede no coincidir con el sorteo
  // oficial; si lo hacemos provisional sobre un equipo que el feed ya emparejó en
  // OTRA caja, ese equipo saldría en DOS posiciones a la vez. El feed manda: no
  // colocamos un tercero provisional cuyo equipo ya está puesto por el feed.
  /** @type {Set<string>} */
  const placedByFeed = new Set()
  for (const m of matches) {
    if (norm(m.stage) !== 'round-of-32') continue
    if (TEAM_BY_CODE[m.home]) placedByFeed.add(m.home)
    if (TEAM_BY_CODE[m.away]) placedByFeed.add(m.away)
  }
  /** @type {Record<number, ProvSide>} */
  const thirdForMatch = {}
  THIRD_SLOTS.forEach((s, i) => {
    const gi = alloc[i]
    const code = gi != null && groups[gi].table[2] && groups[gi].table[2].team.code
    if (code && !placedByFeed.has(code)) thirdForMatch[s.match] = { code, decided: allDecided }
  })

  // feed por etapa
  /** @type {Record<string, FeedMatch[]>} */
  const byStage = {}
  for (const m of matches.filter((x) => x.stage)) (byStage[norm(m.stage)] ||= []).push(m)

  /** @type {Record<number, Box>} */
  const boxes = {}

  // ---- Dieciseisavos ----
  for (const def of R32) {
    /** @type {(s: Slot) => boolean} */
    const isT = (s) => s.kind === '3rd'
    const hProv = provInfo(def.home)
    const aProv = def.away.kind === '3rd' ? (thirdForMatch[def.num] || null) : provInfo(def.away)
    const hKeys = [hProv && hProv.code, phSlot(def.home)].filter(/** @returns {k is string} */ (k) => Boolean(k))
    const aKeys = [aProv && aProv.code, phSlot(def.away)].filter(/** @returns {k is string} */ (k) => Boolean(k))
    const pool = byStage['round-of-32'] || []
    /** @type {FeedMatch|null} */
    let fm = null
    for (const m of pool) {
      if (isT(def.away)) { if (hKeys.includes(m.home) || hKeys.includes(m.away)) { fm = m; break } }
      else if (isT(def.home)) { if (aKeys.includes(m.home) || aKeys.includes(m.away)) { fm = m; break } }
      else {
        const set = new Set([m.home, m.away])
        if (hKeys.some((k) => set.has(k)) && aKeys.some((k) => set.has(k))) { fm = m; break }
      }
    }
    boxes[def.num] = buildBox(def, fm, hKeys, aKeys, labelSlot(def.home), labelSlot(def.away), hProv, aProv)
  }

  // ---- Rondas posteriores (en orden) ----
  /** @type {(num: number) => string|null} */
  const winner = (num) => {
    const b = boxes[num]
    if (!b || !b.finished) return null
    // Sin los dos marcadores no se decide nada (antes un null contaba como 0 al comparar).
    if (b.hg == null || b.ag == null) return null
    let c = null
    if (b.hg > b.ag) c = b._hc; else if (b.ag > b.hg) c = b._ac
    else if (b.hp != null && b.ap != null) c = b.hp > b.ap ? b._hc : (b.ap > b.hp ? b._ac : null)
    return c && TEAM_BY_CODE[c] ? c : null
  }
  /** @type {(num: number) => string|null} */
  const loser = (num) => {
    const b = boxes[num]; if (!b || !b.finished) return null
    const w = winner(num); if (!w) return null
    const other = w === b._hc ? b._ac : b._hc
    return other && TEAM_BY_CODE[other] ? other : null
  }

  /** @type {(defs: LaterDef[], stage: string, sideCode: (num: number) => string|null) => void} */
  const laterRound = (defs, stage, sideCode) => {
    const pool = byStage[stage] || []
    for (const def of defs) {
      const hc = sideCode(def.from[0]), ac = sideCode(def.from[1])
      const hLabel = (stage === 'third-place' ? 'Perd. ' : 'Gana ') + def.from[0]
      const aLabel = (stage === 'third-place' ? 'Perd. ' : 'Gana ') + def.from[1]
      /** @type {FeedMatch|null} */
      let fm = null
      if (hc && ac) {
        // ambos lados decididos → partido exacto del feed (con marcador).
        const set = new Set([hc, ac])
        fm = pool.find((m) => set.has(m.home) && set.has(m.away)) || null
      } else if (hc || ac) {
        // solo un lado decidido: el feed suele traer el cruce con el otro lado
        // como placeholder (p. ej. "BRA" vs "RD32"). Lo tomamos para mostrar el
        // ganador conocido y su horario; el lado pendiente queda como etiqueta.
        const known = hc || ac
        fm = pool.find((m) => m.home === known || m.away === known) || null
      }
      // Mostrar el ganador YA conocido de cada alimentador aunque el rival falte
      // (antes el lado se quedaba en "Gana 76" pese a estar definido el ganador).
      const hProv = hc ? { code: hc, decided: true } : null
      const aProv = ac ? { code: ac, decided: true } : null
      boxes[def.num] = buildBox(def, fm, hc ? [hc] : [], ac ? [ac] : [], hLabel, aLabel, hProv, aProv)
    }
  }
  laterRound(R16, 'round-of-16', winner)
  laterRound(QF, 'quarterfinal', winner)
  laterRound(SF, 'semifinal', winner)
  laterRound([FINAL], 'final', winner)
  laterRound([THIRD_PLACE], 'third-place', loser)

  /**
   * @param {R32Def|LaterDef} def
   * @param {FeedMatch|null} fm el partido del feed que cae en esta caja, si lo hay
   * @param {string[]} hKeys códigos que identifican el lado local
   * @param {string[]} aKeys
   * @param {string} hLabel etiqueta del cupo si no hay equipo
   * @param {string} aLabel
   * @param {ProvSide|null} provHome
   * @param {ProvSide|null} provAway
   * @returns {Box}
   */
  function buildBox (def, fm, hKeys, aKeys, hLabel, aLabel, provHome, provAway) {
    /** @type {string|null} */ let hc = null
    /** @type {string|null} */ let ac = null
    /** @type {number|null} */ let hg = null
    /** @type {number|null} */ let ag = null
    /** @type {number|null} */ let hp = null
    /** @type {number|null} */ let ap = null
    let status = 'scheduled', finished = false
    /** @type {string|null} */ let kickoff = null
    if (fm) {
      hc = fm.home; ac = fm.away; hg = fm.homeGoals; ag = fm.awayGoals; hp = fm.homePens; ap = fm.awayPens
      const homeMatchesAway = hKeys.length && hKeys.includes(fm.away)
      const awayMatchesHome = aKeys.length && aKeys.includes(fm.home)
      if (homeMatchesAway || awayMatchesHome) { hc = fm.away; ac = fm.home; hg = fm.awayGoals; ag = fm.homeGoals; hp = fm.awayPens; ap = fm.homePens }
      if (!(fm.started || fm.finished)) { hg = null; ag = null }
      status = fm.status; finished = !!fm.finished; kickoff = fm.kickoff || null
    }
    // código real (confirmado) para propagar ganadores; el provisional NO avanza.
    /** @type {(c: string|null) => string|null} */
    const realCode = (c) => (c && TEAM_BY_CODE[c]) ? c : null
    return {
      home: chooseSide(hc, provHome, hLabel), away: chooseSide(ac, provAway, aLabel),
      hg, ag, hp, ap, status, finished, kickoff,
      _hc: realCode(hc), _ac: realCode(ac),
    }
  }

  const championCode = winner(FINAL.num)
  const bronzeCode = winner(THIRD_PLACE.num)
  return {
    boxes,
    champion: championCode ? TEAM_BY_CODE[championCode] : null,
    bronze: bronzeCode ? TEAM_BY_CODE[bronzeCode] : null,
  }
}

export { normalizeIso }
