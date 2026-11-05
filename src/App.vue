<script setup>
import { ref, shallowRef, computed, onMounted, onUnmounted, watch, watchEffect, nextTick } from 'vue'
import { getIdentity } from './services/identity.js'
import { getReputation } from './services/reputation.js'
import { fetchOfficialFeed } from './lib/feed.js'
import { applyOverrides } from './lib/overrides.js'
import { matchesOnDate, todayStr, normalizeIso, playedByDate, localDate } from './lib/standings.js'
import { resolveBracket } from './lib/bracketData.js'
import { TEAM_BY_CODE } from './lib/teams.js'
import BracketBoard from './components/BracketBoard.vue'

/* ---------------- i18n ---------------- */
const I18N = {
  es: {
    tagline: 'Resultados oficiales del Mundial 2026, en vivo. Quién juega hoy, cómo va cada grupo y qué necesita cada equipo para clasificar.',
    tabs: { hoy: 'Hoy', resultados: 'Resultados', llaves: 'Llaves' },
    resultsTitle: 'Partidos jugados', noPlayed: 'Aún no se ha jugado ningún partido.',
    bracketTitle: 'Eliminatorias', bracketNote: 'Se va llenando con los resultados: los cruces aún sin definir muestran el clasificado pendiente (p. ej. «2º A», «3º»).',
    stages: { 'round-of-32': 'Dieciseisavos', 'round-of-16': 'Octavos', quarterfinal: 'Cuartos de final', semifinal: 'Semifinales', 'third-place': 'Tercer puesto', final: 'Final' },
    today: 'Partidos de hoy', noToday: 'No hay partidos hoy. Próximos:',
    live: 'EN VIVO', final: 'Final', vs: 'vs',
    updated: 'Actualizado', verified: 'Feed verificado', source: 'Fuente: relay oficial (ESPN + FIFA)',
    loading: 'Cargando resultados oficiales…',
    err: 'No se pudo cargar el feed oficial. Reintenta en un momento.',
  },
  en: {
    tagline: 'Official 2026 World Cup results, live. Who plays today, how each group stands and what each team needs to advance.',
    tabs: { hoy: 'Today', resultados: 'Results', llaves: 'Bracket' },
    resultsTitle: 'Played matches', noPlayed: 'No matches played yet.',
    bracketTitle: 'Knockout stage', bracketNote: 'Fills in with results: undecided ties show the pending qualifier (e.g. “2nd A”, “3rd”).',
    stages: { 'round-of-32': 'Round of 32', 'round-of-16': 'Round of 16', quarterfinal: 'Quarterfinals', semifinal: 'Semifinals', 'third-place': 'Third place', final: 'Final' },
    today: "Today's matches", noToday: 'No matches today. Coming up:',
    live: 'LIVE', final: 'Final', vs: 'vs',
    updated: 'Updated', verified: 'Verified feed', source: 'Source: official relay (ESPN + FIFA)',
    loading: 'Loading official results…',
    err: 'Could not load the official feed. Try again shortly.',
  },
}
// El idioma es del ecosistema: el topbar es dueño del toggle y lo persiste en
// 'dotrino.lang'. Migramos UNA vez la preferencia propia ('mundial.lang') para no
// resetear al usuario que ya había elegido idioma aquí.
const LANG_KEY = 'dotrino.lang'
const OLD_LANG_KEY = 'mundial.lang'
try {
  const old = localStorage.getItem(OLD_LANG_KEY)
  if (old) {
    if (!localStorage.getItem(LANG_KEY)) localStorage.setItem(LANG_KEY, old)
    localStorage.removeItem(OLD_LANG_KEY)
  }
} catch { /* modo privado */ }
const saved = (() => { try { return localStorage.getItem(LANG_KEY) } catch { return null } })()
const lang = ref(/** @type {'es'|'en'} */ ((saved || (navigator.language || 'es').slice(0, 2)) === 'en' ? 'en' : 'es'))
const t = computed(() => I18N[lang.value])
// El topbar ya persiste y fija document.documentElement.lang; aquí solo seguimos su evento.
/** @param {CustomEvent<{ lang?: string }>} e */
const onLang = (e) => { const l = e?.detail?.lang; if (l === 'es' || l === 'en') lang.value = l }

/* ---------------- identidad (§6.1) ---------------- */
// shallowRef: la instancia de Identity no puede ir envuelta en el Proxy reactivo de un
// ref() (el puente con el iframe hace postMessage y un Proxy no se puede clonar).
/** @type {import('vue').ShallowRef<import('@dotrino/identity').Identity|null>} */
const identityInst = shallowRef(null)
/** @type {import('vue').ShallowRef<import('@dotrino/reputation').VaultReputation|null>} */
const reputationInst = shallowRef(null)
/** @type {import('vue').Ref<import('@dotrino/topbar').DotrinoTopbar|null>} */
const topbarRef = ref(null)

// Pasa identity/reputation/tema al topbar (propiedades JS del Web Component).
watchEffect(() => {
  const tb = topbarRef.value
  if (!tb) return
  tb.identity = identityInst.value ?? null
  tb.reputation = reputationInst.value ?? null
})

/* ---------------- data ---------------- */
/** @type {import('vue').Ref<import('./types').OfficialFeed|null>} */
const feed = ref(null)
const state = ref('loading') // loading | ok | error
// Recuerda el tab SOLO dentro de la sesión de la pestaña (sessionStorage): sobrevive
// al refresco, pero al cerrar la pestaña vuelve al default. Preferencia efímera de UI.
const DEFAULT_TAB = 'llaves'
const TAB_KEY = 'mundial.tab'
const TAB_KEYS = ['hoy', 'resultados', 'llaves']
const storedTab = (() => { try { const v = sessionStorage.getItem(TAB_KEY); return v && TAB_KEYS.includes(v) ? v : DEFAULT_TAB } catch { return DEFAULT_TAB } })()
const tab = ref(storedTab)
watch(tab, (v) => { try { sessionStorage.setItem(TAB_KEY, v) } catch { /* modo privado */ } })
/** @type {ReturnType<typeof setInterval>|undefined} */
let timer

async function load () {
  const data = await fetchOfficialFeed()
  if (data) { feed.value = data; state.value = 'ok' }
  else if (!feed.value) state.value = 'error'
}
// Mide la altura del topbar → variable CSS para que la barra de tabs quede sticky
// justo debajo (el topbar crece de alto en móvil, así que no sirve un valor fijo).
/** @type {ResizeObserver|null} */
let ro = null
function setTopbarH () {
  const tb = topbarRef.value
  if (tb) document.documentElement.style.setProperty('--topbar-h', tb.offsetHeight + 'px')
}
onMounted(async () => {
  load(); timer = setInterval(load, 120000)
  nextTick(setTopbarH)
  const tb = topbarRef.value
  if (tb && 'ResizeObserver' in window) { ro = new ResizeObserver(setTopbarH); ro.observe(tb) }
  window.addEventListener('resize', setTopbarH)
  // Identidad del ecosistema: sin vault, el topbar simplemente no abre el perfil.
  identityInst.value = await getIdentity()
  if (identityInst.value) reputationInst.value = await getReputation()
})
onUnmounted(() => { clearInterval(timer); ro?.disconnect(); window.removeEventListener('resize', setTopbarH) })

// Lo que el admin carga a mano en el relay (`overrides`) manda sobre el proveedor.
const matches = computed(() => feed.value ? applyOverrides(feed.value.matches, feed.value.overrides) : [])
const played = computed(() => playedByDate(matches.value))
const bracket = computed(() => resolveBracket(matches.value))
const updatedAt = computed(() => feed.value && feed.value.updatedAt ? new Date(feed.value.updatedAt).toLocaleString(lang.value) : '')

// Hoy (o, si no hay, el próximo día con partidos).
const todayMatches = computed(() => {
  const today = matchesOnDate(matches.value, todayStr())
  if (today.length) return { date: todayStr(), list: today, isToday: true }
  const future = matches.value
    .filter(/** @returns {m is import('./types').FeedMatch & { kickoff: string }} */ (m) => !!m.kickoff && Date.parse(normalizeIso(m.kickoff)) > Date.now())
    .sort((a, b) => Date.parse(normalizeIso(a.kickoff)) - Date.parse(normalizeIso(b.kickoff)))
  if (!future.length) return { date: '', list: [], isToday: true }
  const nd = localDate(future[0].kickoff)
  return { date: nd, list: future.filter((m) => localDate(m.kickoff) === nd), isToday: false }
})

/* ---------------- helpers de render ---------------- */
/** @param {string} code */
const tm = (code) => TEAM_BY_CODE[code] || { code, name: code, flag: '🏳️' }
/** @param {string} iso */
function fmtTime (iso) { return new Date(normalizeIso(iso)).toLocaleTimeString(lang.value, { hour: '2-digit', minute: '2-digit' }) }
/** @param {string} iso */
function fmtDayTime (iso) { return new Date(normalizeIso(iso)).toLocaleString(lang.value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
/** @param {string} s YYYY-MM-DD */
function fmtDate (s) { if (!s) return ''; const [y, m, d] = s.split('-'); return new Date(+y, +m - 1, +d).toLocaleDateString(lang.value, { weekday: 'long', day: 'numeric', month: 'long' }) }
</script>

<template>
  <div class="app">
    <!-- Topbar estándar del ecosistema (§5): marca + volver + idioma + perfil +
         moneda de support. `:lang.attr` fuerza el atributo: el componente expone
         `lang` como getter sin setter, y Vue, al setearlo como propiedad DOM, se
         lo tragaría en silencio. -->
    <dotrino-topbar
      ref="topbarRef"
      brand="Mundial 2026"
      icon="/icon.svg"
      brand-href="./"
      :lang.attr="lang"
      profile theme
      support-href="https://ko-fi.com/dotrino"
      support-repo="imdotrino/dotrino-mundial"
      support-discord="https://discord.gg/D648uq7cth"
      @dotrino-lang="onLang">
      <dotrino-install slot="end" :lang="lang"></dotrino-install>
    </dotrino-topbar>

    <main class="wrap">
      <h1 class="tagline">{{ t.tagline }}</h1>

      <div v-if="state === 'loading'" class="msg">{{ t.loading }}</div>
      <div v-else-if="state === 'error'" class="msg err">{{ t.err }}</div>

      <template v-else>
        <div class="meta">
          <span class="badge ok">✓ {{ t.verified }}</span>
          <span v-if="updatedAt">{{ t.updated }}: {{ updatedAt }}</span>
        </div>

        <div class="tabsbar" :class="{ sticky: tab === 'resultados' }">
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
                <span v-if="m.homePens != null" class="pens">{{ m.homePens }}-{{ m.awayPens }} pen</span>
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

        <!-- LLAVES -->
        <section v-if="tab === 'llaves'" class="panel">
          <BracketBoard :data="bracket" :stages="t.stages" :labels="{ final: t.final, live: t.live }" />
        </section>

        <p class="src">{{ t.source }}</p>
      </template>
    </main>
  </div>
</template>
