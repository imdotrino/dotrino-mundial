// Resuelve cada caja del bracket (bracket.js) desde el feed oficial + la tabla de
// grupos. Read-only: cada caja queda con sus dos lados (equipo real o etiqueta de
// cupo: «1º A», «2º C», «3º», «Gana 89») + marcador si el feed lo tiene.

import { GROUP_LETTERS, TEAM_BY_CODE } from './teams.js'
import { computeGroup, normalizeIso } from './standings.js'
import { R32, R16, QF, SF, FINAL, THIRD_PLACE } from './bracket.js'

const norm = (s) => String(s || '').toLowerCase().replace(/_/g, '-')
  .replace('quarter-final', 'quarterfinal').replace('semi-final', 'semifinal').replace('3rd-place', 'third-place')

function sideOf (code, label) {
  const t = code && TEAM_BY_CODE[code]
  if (t) return { code: t.code, flag: t.flag, name: t.name, real: true }
  let nm = label
  const m = /^([12])([A-L])$/.exec(code || '')
  if (m) nm = `${m[1]}º ${m[2]}`
  else if (/^3/.test(code || '')) nm = '3º'
  return { code: '', flag: '', name: nm || code || '—', real: false }
}

export function resolveBracket (matches) {
  // grupos: decidido (todos jugados) + 1º/2º
  const groups = GROUP_LETTERS.map((L) => computeGroup(L, matches))
  // Posición ACTUAL del cupo (provisional con resultados parciales). decided=true
  // cuando el grupo ya está cerrado; null si el grupo aún no jugó.
  const provInfo = (slot) => {
    if (slot.kind === '3rd') return null
    const g = groups[slot.group]
    if (g.played === 0 && !(g.live && g.live.length)) return null // sin nada jugado aún
    const row = slot.kind === 'W' ? g.table[0] : g.table[1]
    return { code: row.team.code, decided: g.remaining === 0 }
  }
  const chooseSide = (feedCode, prov, label) => {
    const ft = feedCode && TEAM_BY_CODE[feedCode]
    if (ft) return { code: ft.code, flag: ft.flag, name: ft.name, real: true, prov: false }
    if (prov && prov.code && TEAM_BY_CODE[prov.code]) {
      const t = TEAM_BY_CODE[prov.code]
      return { code: t.code, flag: t.flag, name: t.name, real: true, prov: !prov.decided }
    }
    return sideOf(feedCode, label)
  }
  const phSlot = (slot) => slot.kind === 'W' ? '1' + GROUP_LETTERS[slot.group]
    : slot.kind === 'RU' ? '2' + GROUP_LETTERS[slot.group] : '3RD'
  const labelSlot = (slot) => slot.kind === 'W' ? `1º ${GROUP_LETTERS[slot.group]}`
    : slot.kind === 'RU' ? `2º ${GROUP_LETTERS[slot.group]}` : '3º'

  // feed por etapa
  const byStage = {}
  for (const m of matches.filter((x) => x.stage)) (byStage[norm(m.stage)] ||= []).push(m)

  const boxes = {}

  // ---- Dieciseisavos ----
  for (const def of R32) {
    const isT = (s) => s.kind === '3rd'
    const hProv = provInfo(def.home), aProv = provInfo(def.away)
    const hKeys = [hProv && hProv.code, phSlot(def.home)].filter(Boolean)
    const aKeys = [aProv && aProv.code, phSlot(def.away)].filter(Boolean)
    const pool = byStage['round-of-32'] || []
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
  const winner = (num) => {
    const b = boxes[num]
    if (!b || !b.finished) return null
    let c = null
    if (b.hg > b.ag) c = b._hc; else if (b.ag > b.hg) c = b._ac
    else if (b.hp != null) c = b.hp > b.ap ? b._hc : (b.ap > b.hp ? b._ac : null)
    return c && TEAM_BY_CODE[c] ? c : null
  }
  const loser = (num) => {
    const b = boxes[num]; if (!b || !b.finished) return null
    const w = winner(num); if (!w) return null
    const other = w === b._hc ? b._ac : b._hc
    return other && TEAM_BY_CODE[other] ? other : null
  }

  const laterRound = (defs, stage, sideCode) => {
    const pool = byStage[stage] || []
    for (const def of defs) {
      const hc = sideCode(def.from[0]), ac = sideCode(def.from[1])
      const hLabel = (stage === 'third-place' ? 'Perd. ' : 'Gana ') + def.from[0]
      const aLabel = (stage === 'third-place' ? 'Perd. ' : 'Gana ') + def.from[1]
      let fm = null
      if (hc && ac) {
        const set = new Set([hc, ac])
        fm = pool.find((m) => set.has(m.home) && set.has(m.away)) || null
      }
      boxes[def.num] = buildBox(def, fm, [hc].filter(Boolean), [ac].filter(Boolean), hLabel, aLabel, null, null)
    }
  }
  laterRound(R16, 'round-of-16', winner)
  laterRound(QF, 'quarterfinal', winner)
  laterRound(SF, 'semifinal', winner)
  laterRound([FINAL], 'final', winner)
  laterRound([THIRD_PLACE], 'third-place', loser)

  function buildBox (def, fm, hKeys, aKeys, hLabel, aLabel, provHome, provAway) {
    let hc = null, ac = null, hg = null, ag = null, hp = null, ap = null
    let status = 'scheduled', finished = false, kickoff = null
    if (fm) {
      hc = fm.home; ac = fm.away; hg = fm.homeGoals; ag = fm.awayGoals; hp = fm.homePens; ap = fm.awayPens
      const homeMatchesAway = hKeys.length && hKeys.includes(fm.away)
      const awayMatchesHome = aKeys.length && aKeys.includes(fm.home)
      if (homeMatchesAway || awayMatchesHome) { hc = fm.away; ac = fm.home; hg = fm.awayGoals; ag = fm.homeGoals; hp = fm.awayPens; ap = fm.homePens }
      if (!(fm.started || fm.finished)) { hg = null; ag = null }
      status = fm.status; finished = !!fm.finished; kickoff = fm.kickoff || null
    }
    // código real (confirmado) para propagar ganadores; el provisional NO avanza.
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
