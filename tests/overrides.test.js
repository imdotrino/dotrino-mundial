import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyOverrides, matchKey } from '../src/lib/overrides.js'

/** @returns {import('../src/types').FeedMatch} */
const m = (o) => ({
  home: 'MEX', away: 'RSA', kickoff: '2026-06-11T19:00:00Z', stage: null, status: 'scheduled',
  started: false, finished: false, homeGoals: null, awayGoals: null, homePens: null, awayPens: null,
  winner: null, source: 'espn', ...o
})

test('el override manda sobre el dato del proveedor', () => {
  const out = applyOverrides([m({ homeGoals: 0, awayGoals: 0, status: 'in', started: true })],
    [m({ homeGoals: 2, awayGoals: 1, status: 'final', started: true, finished: true, winner: 'MEX', source: 'manual' })])
  assert.equal(out.length, 1)
  assert.deepEqual([out[0].homeGoals, out[0].awayGoals, out[0].finished, out[0].winner, out[0].source], [2, 1, true, 'MEX', 'manual'])
})

test('sin hora ni fase en el override, se quedan las del proveedor', () => {
  const out = applyOverrides([m({ stage: 'group' })], [m({ kickoff: null, stage: null, homeGoals: 1, awayGoals: 1, finished: true })])
  assert.equal(out[0].kickoff, '2026-06-11T19:00:00Z')
  assert.equal(out[0].stage, 'group')
  assert.equal(out[0].homeGoals, 1)
})

test('override con local y visitante al revés: se alinea al partido del proveedor', () => {
  const out = applyOverrides([m()], [m({ home: 'RSA', away: 'MEX', homeGoals: 3, awayGoals: 0, homePens: null, awayPens: null, winner: 'RSA', finished: true })])
  assert.deepEqual([out[0].home, out[0].away, out[0].homeGoals, out[0].awayGoals, out[0].winner], ['MEX', 'RSA', 0, 3, 'RSA'])
})

test('grupos y eliminatoria con el mismo par no se pisan', () => {
  const grp = m()
  const ko = m({ kickoff: '2026-07-04T19:00:00Z', stage: 'round-of-16' })
  assert.notEqual(matchKey(grp), matchKey(ko))
  const out = applyOverrides([grp, ko], [m({ kickoff: '2026-07-04T19:00:00Z', homeGoals: 1, awayGoals: 0, winner: 'MEX', finished: true })])
  assert.equal(out[0].homeGoals, null)
  assert.equal(out[1].homeGoals, 1)
})

test('un override sin partido del proveedor se añade', () => {
  const out = applyOverrides([m()], [m({ home: 'ARG', away: 'ALG', homeGoals: 2, awayGoals: 0 })])
  assert.equal(out.length, 2)
  assert.equal(out[1].home, 'ARG')
})

test('sin overrides, los partidos tal cual', () => {
  const ms = [m()]
  assert.equal(applyOverrides(ms, []), ms)
})
