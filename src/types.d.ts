// Formas de datos de la app. Solo tipos: no hay código que importar.

/** Un partido tal como llega en el feed firmado de results.dotrino.com. */
export interface FeedMatch {
  /** código FIFA del local, o un placeholder de llave («1A», «3RD», «W89») */
  home: string
  away: string
  /** ISO; puede venir sin zona («2026-06-11T19:00»), ver normalizeIso */
  kickoff: string | null
  stage: string | null
  status: string
  started: boolean
  finished: boolean
  homeGoals: number | null
  awayGoals: number | null
  homePens: number | null
  awayPens: number | null
  winner: string | null
  source: string
}

/** `data` del feed oficial (lo que firma el relay). */
export interface OfficialFeed {
  v: number
  competition: string
  updatedAt: number
  matches: FeedMatch[]
  overrides: FeedMatch[]
  admins: string[]
  publickey: string
  [extra: string]: unknown
}

/** Sobre firmado tal como lo devuelve GET /official. */
export interface SignedFeed {
  data: OfficialFeed
  signature: string
}

export interface Team {
  /** groupIndex*4 + posición de sorteo */
  id: number
  name: string
  flag: string
  code: string
  /** letra del grupo, A–L */
  group: string
}

export interface Group {
  letter: string
  teams: Team[]
}

/** Fila de la tabla de un grupo. */
export interface Row {
  team: Team
  pj: number
  w: number
  d: number
  l: number
  gf: number
  gc: number
  pts: number
  /** el equipo juega ahora (solo en la tabla que se muestra) */
  live?: boolean
}

export interface LiveScore {
  home: string
  away: string
  homeGoals: number | null
  awayGoals: number | null
}

export interface TeamStatus {
  label: 'clasificado' | 'fuera-top2' | 'disputa'
  advance: 'top2' | 'tercero' | 'eliminado' | 'disputa'
  minPos: number
  maxPos: number
  remaining: number
}

export interface GroupResult {
  letter: string
  table: Row[]
  /** partidos aún sin decidir */
  remaining: number
  played: number
  total: number
  live: LiveScore[]
  status: Record<string, TeamStatus>
}

/** Un tercero, con su grupo. */
export interface ThirdRow extends Row {
  letter: string
  /** índice del grupo (A=0 … L=11) */
  gi: number
}

export interface RankedThird extends ThirdRow {
  rank: number
  qualifies: boolean
}

/** Cupo de dieciseisavos: 1º o 2º de un grupo, o un mejor tercero. */
export type Slot =
  | { kind: 'W' | 'RU', group: number }
  | { kind: '3rd' }

export interface R32Def {
  num: number
  home: Slot
  away: Slot
}

/** Partido de una ronda posterior: lo alimentan los ganadores (o perdedores) de dos. */
export interface LaterDef {
  num: number
  from: [number, number]
}

/** Lado de una caja de la llave: equipo real o etiqueta de cupo. */
export interface Side {
  code: string
  flag: string
  name: string
  real: boolean
  /** provisional: sale de la tabla actual, el grupo o la ronda no están cerrados */
  prov?: boolean
}

/** Cupo conocido de una caja (provisional o decidido). */
export interface ProvSide {
  code: string
  decided: boolean
}

export interface Box {
  home: Side
  away: Side
  hg: number | null
  ag: number | null
  hp: number | null
  ap: number | null
  status: string
  finished: boolean
  kickoff: string | null
  /** código real confirmado (lo que avanza a la ronda siguiente) */
  _hc: string | null
  _ac: string | null
}

export interface Bracket {
  boxes: Record<number, Box>
  champion: Team | null
  bronze: Team | null
}
