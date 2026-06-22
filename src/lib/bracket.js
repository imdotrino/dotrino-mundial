// Estructura de la fase final del Mundial 2026 (rescatada de pronostico). 32
// clasificados: 12 primeros + 12 segundos + 8 mejores terceros. Numeración FIFA:
// dieciseisavos 73-88, octavos 89-96, cuartos 97-100, semis 101-102, 3º 103, final 104.

const W = (g) => ({ kind: 'W', group: g })
const RU = (g) => ({ kind: 'RU', group: g })
const T = () => ({ kind: '3rd' })

export const R32 = [
  { num: 73, home: RU(0), away: RU(1) },
  { num: 74, home: W(4), away: T() },
  { num: 75, home: W(5), away: RU(2) },
  { num: 76, home: W(2), away: RU(5) },
  { num: 77, home: W(8), away: T() },
  { num: 78, home: RU(4), away: RU(8) },
  { num: 79, home: W(0), away: T() },
  { num: 80, home: W(11), away: T() },
  { num: 81, home: W(3), away: T() },
  { num: 82, home: W(6), away: T() },
  { num: 83, home: RU(10), away: RU(11) },
  { num: 84, home: W(7), away: RU(9) },
  { num: 85, home: W(1), away: T() },
  { num: 86, home: W(9), away: RU(7) },
  { num: 87, home: W(10), away: T() },
  { num: 88, home: RU(3), away: RU(6) },
]
export const R16 = [
  { num: 89, from: [74, 77] }, { num: 90, from: [73, 75] }, { num: 91, from: [76, 78] }, { num: 92, from: [79, 80] },
  { num: 93, from: [83, 84] }, { num: 94, from: [81, 82] }, { num: 95, from: [86, 88] }, { num: 96, from: [85, 87] },
]
export const QF = [
  { num: 97, from: [89, 90] }, { num: 98, from: [93, 94] }, { num: 99, from: [91, 92] }, { num: 100, from: [95, 96] },
]
export const SF = [{ num: 101, from: [97, 98] }, { num: 102, from: [99, 100] }]
export const FINAL = { num: 104, from: [101, 102] }
export const THIRD_PLACE = { num: 103, from: [101, 102] }

// Mapa num → definición (slots o feeders).
export const BY_NUM = {}
R32.forEach((m) => { BY_NUM[m.num] = m })
;[...R16, ...QF, ...SF, FINAL, THIRD_PLACE].forEach((m) => { BY_NUM[m.num] = m })

// Layout de dos mitades + centro (idéntico a pronostico).
export const LEFT_COLS = [
  { key: 'round-of-32', nums: [74, 77, 73, 75, 83, 84, 81, 82] },
  { key: 'round-of-16', nums: [89, 90, 93, 94] },
  { key: 'quarterfinal', nums: [97, 98] },
  { key: 'semifinal', nums: [101] },
]
export const RIGHT_COLS = [
  { key: 'semifinal', nums: [102] },
  { key: 'quarterfinal', nums: [99, 100] },
  { key: 'round-of-16', nums: [91, 92, 95, 96] },
  { key: 'round-of-32', nums: [76, 78, 79, 80, 86, 88, 85, 87] },
]

// Conectores: con justify-content:space-around el centro del partido i (de n)
// cae en (2i+1)/(2n). Unimos de a pares con líneas en %.
export function connectorsFor (n) {
  if (n <= 1) return [{ topPct: 50, botPct: 50, single: true }]
  const out = []
  for (let pair = 0; pair < n / 2; pair++) {
    const a = pair * 2, b = pair * 2 + 1
    const fa = ((2 * a + 1) / (2 * n)) * 100
    const fb = ((2 * b + 1) / (2 * n)) * 100
    out.push({ topPct: fa, botPct: fb, single: false })
  }
  return out
}
