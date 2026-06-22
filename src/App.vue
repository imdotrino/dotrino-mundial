<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { fetchOfficialFeed } from './lib/feed.js'
import { computeAll, matchesOnDate, todayStr, normalizeIso, playedByDate } from './lib/standings.js'
import { resolveBracket } from './lib/bracketData.js'
import { TEAM_BY_CODE } from './lib/teams.js'
import BracketBoard from './components/BracketBoard.vue'

/* ---------------- i18n ---------------- */
const I18N = {
  es: {
    tagline: 'Resultados oficiales del Mundial 2026, en vivo. Quién juega hoy, cómo va cada grupo y qué necesita cada equipo para clasificar.',
    tabs: { hoy: 'Hoy', resultados: 'Resultados', grupos: 'Grupos', llaves: 'Llaves' },
    thirdsTitle: 'Mejores terceros',
    resultsTitle: 'Partidos jugados', noPlayed: 'Aún no se ha jugado ningún partido.',
    bracketTitle: 'Eliminatorias', bracketNote: 'Se va llenando con los resultados: los cruces aún sin definir muestran el clasificado pendiente (p. ej. «2º A», «3º»).',
    stages: { 'round-of-32': 'Dieciseisavos', 'round-of-16': 'Octavos', quarterfinal: 'Cuartos de final', semifinal: 'Semifinales', 'third-place': 'Tercer puesto', final: 'Final' },
    today: 'Partidos de hoy', noToday: 'No hay partidos hoy. Próximos:',
    live: 'EN VIVO', final: 'Final', vs: 'vs',
    th: { pos: '#', team: 'Equipo', pj: 'PJ', g: 'G', e: 'E', p: 'P', gf: 'GF', gc: 'GC', dg: 'DG', pts: 'Pts' },
    group: 'Grupo', updated: 'Actualizado', verified: 'Feed verificado', source: 'Fuente: relay oficial (ESPN + FIFA)',
    st: { clasificado: 'Clasificado', disputa: 'En disputa', tercero: '3º (puede avanzar)', eliminado: 'Eliminado' },
    note: { clasificado: 'Asegura top 2 del grupo.', tercero: 'Va 3º; avanza si está entre los 8 mejores terceros.', eliminado: 'Sin chance de top 2 ni 3º.', disputaPlay: (n) => `Se define en ${n === 1 ? 'el partido que falta' : 'los ' + n + ' partidos que faltan'} del grupo.` },
    thirdsIntro: 'Clasifican los 2 primeros de cada grupo (24) + los 8 mejores terceros. Ranking provisional de los 12 terceros:',
    qualifies: 'Clasifica', out: 'Fuera', loading: 'Cargando resultados oficiales…',
    err: 'No se pudo cargar el feed oficial. Reintenta en un momento.',
    legend: 'Verde: top 2 (clasifican). Ámbar: 3º (mejor tercero).',
  },
  en: {
    tagline: 'Official 2026 World Cup results, live. Who plays today, how each group stands and what each team needs to advance.',
    tabs: { hoy: 'Today', resultados: 'Results', grupos: 'Groups', llaves: 'Bracket' },
    thirdsTitle: 'Best thirds',
    resultsTitle: 'Played matches', noPlayed: 'No matches played yet.',
    bracketTitle: 'Knockout stage', bracketNote: 'Fills in with results: undecided ties show the pending qualifier (e.g. “2nd A”, “3rd”).',
    stages: { 'round-of-32': 'Round of 32', 'round-of-16': 'Round of 16', quarterfinal: 'Quarterfinals', semifinal: 'Semifinals', 'third-place': 'Third place', final: 'Final' },
    today: "Today's matches", noToday: 'No matches today. Coming up:',
    live: 'LIVE', final: 'Final', vs: 'vs',
    th: { pos: '#', team: 'Team', pj: 'P', g: 'W', e: 'D', p: 'L', gf: 'GF', gc: 'GA', dg: 'GD', pts: 'Pts' },
    group: 'Group', updated: 'Updated', verified: 'Verified feed', source: 'Source: official relay (ESPN + FIFA)',
    st: { clasificado: 'Qualified', disputa: 'In contention', tercero: '3rd (may advance)', eliminado: 'Eliminated' },
    note: { clasificado: 'Top 2 secured.', tercero: 'Currently 3rd; advances if among the 8 best thirds.', eliminado: 'No chance of top 2 or 3rd.', disputaPlay: (n) => `Decided in the group's ${n} remaining match${n > 1 ? 'es' : ''}.` },
    thirdsIntro: 'Top 2 of each group (24) + the 8 best thirds advance. Provisional ranking of the 12 thirds:',
    qualifies: 'Advances', out: 'Out', loading: 'Loading official results…',
    err: 'Could not load the official feed. Try again shortly.',
    legend: 'Green: top 2 (advance). Amber: 3rd (best-third spot).',
  },
}
const LANG_KEY = 'mundial.lang'
const lang = ref((localStorage.getItem(LANG_KEY) || (navigator.language || 'es').slice(0, 2)) === 'en' ? 'en' : 'es')
const t = computed(() => I18N[lang.value])
const setLang = (l) => { lang.value = l; localStorage.setItem(LANG_KEY, l); document.documentElement.lang = l }

/* ---------------- data ---------------- */
const feed = ref(null)
const state = ref('loading') // loading | ok | error
const tab = ref('hoy')
let timer = null

async function load () {
  const data = await fetchOfficialFeed()
  if (data) { feed.value = data; state.value = 'ok' }
  else if (!feed.value) state.value = 'error'
}
// Mide la altura del topbar → variable CSS para que la barra de tabs quede sticky
// justo debajo (el topbar crece de alto en móvil, así que no sirve un valor fijo).
let ro = null
function setTopbarH () {
  const tb = document.querySelector('.topbar')
  if (tb) document.documentElement.style.setProperty('--topbar-h', tb.offsetHeight + 'px')
}
onMounted(() => {
  load(); timer = setInterval(load, 120000); document.documentElement.lang = lang.value
  nextTick(setTopbarH)
  const tb = document.querySelector('.topbar')
  if (tb && 'ResizeObserver' in window) { ro = new ResizeObserver(setTopbarH); ro.observe(tb) }
  window.addEventListener('resize', setTopbarH)
})
onUnmounted(() => { clearInterval(timer); ro?.disconnect(); window.removeEventListener('resize', setTopbarH) })

// Al abrir la pestaña Grupos, si hay un partido en vivo, lleva a ese grupo.
function scrollToLiveGroup () {
  nextTick(() => {
    const el = document.querySelector('.gcard.has-live')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}
watch(tab, (v) => { if (v === 'grupos') scrollToLiveGroup() })

const matches = computed(() => (feed.value && feed.value.matches) || [])
const all = computed(() => computeAll(matches.value))
const played = computed(() => playedByDate(matches.value))
const bracket = computed(() => resolveBracket(matches.value))
const updatedAt = computed(() => feed.value && feed.value.updatedAt ? new Date(feed.value.updatedAt).toLocaleString(lang.value) : '')

// Hoy (o, si no hay, el próximo día con partidos).
const todayMatches = computed(() => {
  const today = matchesOnDate(matches.value, todayStr())
  if (today.length) return { date: todayStr(), list: today, isToday: true }
  const future = matches.value
    .filter((m) => m.kickoff && Date.parse(normalizeIso(m.kickoff)) > Date.now())
    .sort((a, b) => Date.parse(normalizeIso(a.kickoff)) - Date.parse(normalizeIso(b.kickoff)))
  if (!future.length) return { date: '', list: [], isToday: true }
  const nd = localDateOf(future[0].kickoff)
  return { date: nd, list: future.filter((m) => localDateOf(m.kickoff) === nd), isToday: false }
})
function localDateOf (iso) { const d = new Date(normalizeIso(iso)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/* ---------------- helpers de render ---------------- */
const tm = (code) => TEAM_BY_CODE[code] || { code, name: code, flag: '🏳️' }
const gd = (r) => r.gf - r.gc
function fmtTime (iso) { return new Date(normalizeIso(iso)).toLocaleTimeString(lang.value, { hour: '2-digit', minute: '2-digit' }) }
function fmtDayTime (iso) { return new Date(normalizeIso(iso)).toLocaleString(lang.value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
function fmtDate (s) { if (!s) return ''; const [y, m, d] = s.split('-'); return new Date(+y, +m - 1, +d).toLocaleDateString(lang.value, { weekday: 'long', day: 'numeric', month: 'long' }) }
function statusOf (code, letter) {
  const g = all.value.groups.find((x) => x.letter === letter)
  return g ? g.status[code] : null
}
function stKey (s) { // mapea a etiqueta visible
  if (!s) return 'disputa'
  if (s.label === 'clasificado') return 'clasificado'
  if (s.advance === 'tercero') return 'tercero'
  if (s.advance === 'eliminado') return 'eliminado'
  return 'disputa'
}
function noteFor (code, letter) {
  const _t = t.value
  const g = all.value.groups.find((x) => x.letter === letter)
  const s = g && g.status[code]
  if (!s) return ''
  if (s.label === 'clasificado') return _t.note.clasificado
  if (s.advance === 'eliminado') return _t.note.eliminado
  if (s.advance === 'tercero') return _t.note.tercero
  return s.remaining ? _t.note.disputaPlay(s.remaining) : ''
}
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="brand"><img src="/icon.svg" alt="" width="30" height="30" /><span>Mundial 2026</span></div>
      <div class="actions">
        <div class="lang" role="group" aria-label="es / en">
          <button :class="{ on: lang === 'es' }" @click="setLang('es')">ES</button>
          <button :class="{ on: lang === 'en' }" @click="setLang('en')">EN</button>
        </div>
        <dotrino-install :lang="lang"></dotrino-install>
        <dotrino-support href="https://ko-fi.com/dotrino" repo="imdotrino/dotrino-mundial" discord="https://discord.gg/D648uq7cth" :lang="lang"></dotrino-support>
      </div>
    </header>

    <main class="wrap">
      <h1 class="tagline">{{ t.tagline }}</h1>

      <div v-if="state === 'loading'" class="msg">{{ t.loading }}</div>
      <div v-else-if="state === 'error'" class="msg err">{{ t.err }}</div>

      <template v-else>
        <div class="meta">
          <span class="badge ok">✓ {{ t.verified }}</span>
          <span v-if="updatedAt">{{ t.updated }}: {{ updatedAt }}</span>
        </div>

        <div class="tabsbar">
          <nav class="tabs" role="tablist">
            <button v-for="(label, k) in t.tabs" :key="k" role="tab" :aria-selected="tab === k" :class="{ on: tab === k }" @click="tab = k">{{ label }}</button>
          </nav>
        </div>

        <!-- HOY -->
        <section v-if="tab === 'hoy'" class="panel">
          <h2 class="ph">{{ todayMatches.isToday ? t.today : t.noToday }} <span class="date">{{ fmtDate(todayMatches.date) }}</span></h2>
          <div class="matches">
            <div v-for="(m, i) in todayMatches.list" :key="i" class="match">
              <div class="side"><span class="flag">{{ tm(m.home).flag }}</span><span class="tname">{{ tm(m.home).name }}</span></div>
              <div class="mid">
                <span v-if="m.started || m.finished" class="score">{{ m.homeGoals }}<i>-</i>{{ m.awayGoals }}</span>
                <span v-else class="time">{{ fmtTime(m.kickoff) }}</span>
                <span class="mstatus" :class="m.finished ? 'fin' : (m.status === 'in' ? 'live' : 'sched')">{{ m.finished ? t.final : (m.status === 'in' ? t.live : t.vs) }}</span>
              </div>
              <div class="side right"><span class="tname">{{ tm(m.away).name }}</span><span class="flag">{{ tm(m.away).flag }}</span></div>
            </div>
          </div>
        </section>

        <!-- RESULTADOS -->
        <section v-if="tab === 'resultados'" class="panel">
          <h2 class="ph">{{ t.resultsTitle }}</h2>
          <div v-if="!played.length" class="msg">{{ t.noPlayed }}</div>
          <div v-for="day in played" :key="day.date" class="dayblock">
            <h3 class="dayhead">{{ fmtDate(day.date) }}</h3>
            <div class="matches">
              <div v-for="(m, i) in day.list" :key="i" class="match">
                <div class="side"><span class="flag">{{ tm(m.home).flag }}</span><span class="tname">{{ tm(m.home).name }}</span></div>
                <div class="mid">
                  <span class="score">{{ m.homeGoals }}<i>-</i>{{ m.awayGoals }}</span>
                  <span v-if="m.homePens != null" class="pens">{{ m.homePens }}-{{ m.awayPens }} pen</span>
                  <span class="mstatus fin">{{ t.final }}</span>
                </div>
                <div class="side right"><span class="tname">{{ tm(m.away).name }}</span><span class="flag">{{ tm(m.away).flag }}</span></div>
              </div>
            </div>
          </div>
        </section>

        <!-- GRUPOS -->
        <section v-if="tab === 'grupos'" class="panel">
          <p class="legend">{{ t.legend }}</p>
          <div class="groups">
            <div v-for="g in all.groups" :key="g.letter" class="gcard" :class="{ 'has-live': g.live && g.live.length }">
              <h3>{{ t.group }} {{ g.letter }}</h3>
              <table class="gtable">
                <thead><tr><th>{{ t.th.pos }}</th><th class="l">{{ t.th.team }}</th><th>{{ t.th.pj }}</th><th>{{ t.th.g }}</th><th>{{ t.th.e }}</th><th>{{ t.th.p }}</th><th>{{ t.th.dg }}</th><th>{{ t.th.pts }}</th></tr></thead>
                <tbody>
                  <tr v-for="(r, i) in g.table" :key="r.team.code" :class="{ q1: i < 2, q3: i === 2, playing: r.live }">
                    <td>{{ i + 1 }}</td>
                    <td class="l"><span class="flag">{{ r.team.flag }}</span> {{ r.team.name }}<span v-if="r.live" class="livedot" :title="t.live"></span></td>
                    <td>{{ r.pj }}</td><td>{{ r.w }}</td><td>{{ r.d }}</td><td>{{ r.l }}</td>
                    <td>{{ gd(r) > 0 ? '+' + gd(r) : gd(r) }}</td><td class="pts">{{ r.pts }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-for="(lm, k) in g.live" :key="'lv' + k" class="livematch">
                <span class="livedot"></span><span class="lvtag">{{ t.live }}</span>
                <span class="flag">{{ tm(lm.home).flag }}</span><b>{{ lm.homeGoals }}</b>
                <span class="lvdash">-</span>
                <b>{{ lm.awayGoals }}</b><span class="flag">{{ tm(lm.away).flag }}</span>
              </div>
              <ul class="outlook">
                <li v-for="r in g.table" :key="r.team.code" :class="stKey(statusOf(r.team.code, g.letter))">
                  <span class="flag">{{ r.team.flag }}</span>
                  <span class="oname">{{ r.team.name }}</span>
                  <span class="otag">{{ t.st[stKey(statusOf(r.team.code, g.letter))] }}</span>
                  <span class="onote">{{ noteFor(r.team.code, g.letter) }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Mejores terceros: al fondo de la pestaña Grupos -->
          <h2 class="ph thirds-h">{{ t.thirdsTitle }}</h2>
          <p class="legend">{{ t.thirdsIntro }}</p>
          <table class="gtable thirds">
            <thead><tr><th>{{ t.th.pos }}</th><th class="l">{{ t.th.team }}</th><th>{{ t.group }}</th><th>{{ t.th.pj }}</th><th>{{ t.th.dg }}</th><th>{{ t.th.pts }}</th><th></th></tr></thead>
            <tbody>
              <tr v-for="r in all.thirds" :key="r.team.code" :class="{ q1: r.qualifies }">
                <td>{{ r.rank }}</td>
                <td class="l"><span class="flag">{{ r.team.flag }}</span> {{ r.team.name }}</td>
                <td>{{ r.letter }}</td><td>{{ r.pj }}</td>
                <td>{{ (r.gf - r.gc) > 0 ? '+' + (r.gf - r.gc) : (r.gf - r.gc) }}</td><td class="pts">{{ r.pts }}</td>
                <td><span class="otag" :class="r.qualifies ? 'clasificado' : 'eliminado'">{{ r.qualifies ? t.qualifies : t.out }}</span></td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- LLAVES -->
        <section v-if="tab === 'llaves'" class="panel">
          <p class="legend">{{ t.bracketNote }}</p>
          <BracketBoard :data="bracket" :stages="t.stages" :labels="{ final: t.final, live: t.live }" />
        </section>

        <p class="src">{{ t.source }}</p>
      </template>
    </main>
  </div>
</template>
