<script setup>
import { LEFT_COLS, RIGHT_COLS, FINAL, THIRD_PLACE, connectorsFor } from '../lib/bracket.js'
const props = defineProps({ data: Object, stages: Object, labels: Object })
const bx = (num) => props.data.boxes[num] || { home: { name: '—' }, away: { name: '—' }, hg: null }
const conns = (nums) => connectorsFor(nums.length)
</script>

<template>
  <div class="board">
    <!-- mitad izquierda -->
    <div v-for="(col, ci) in LEFT_COLS" :key="'l' + ci" class="col">
      <span class="col-title">{{ stages[col.key] }}</span>
      <div class="col-matches">
        <div v-for="num in col.nums" :key="num" class="mbox">
          <div class="mside" :class="{ tbd: !bx(num).home.real, prov: bx(num).home.prov }"><span class="flag">{{ bx(num).home.flag }}</span><span class="nm">{{ bx(num).home.real ? bx(num).home.code : bx(num).home.name }}</span><span v-if="bx(num).hg != null" class="g">{{ bx(num).hg }}</span></div>
          <div class="mside" :class="{ tbd: !bx(num).away.real, prov: bx(num).away.prov }"><span class="flag">{{ bx(num).away.flag }}</span><span class="nm">{{ bx(num).away.real ? bx(num).away.code : bx(num).away.name }}</span><span v-if="bx(num).ag != null" class="g">{{ bx(num).ag }}</span></div>
        </div>
        <div class="connectors right" aria-hidden="true">
          <div v-for="(c, k) in conns(col.nums)" :key="k" class="conn" :class="{ single: c.single }" :style="{ top: c.topPct + '%', bottom: (100 - c.botPct) + '%' }">
            <span class="conn-h conn-h-top" /><span class="conn-h conn-h-bot" /><span class="conn-v" /><span class="conn-out" />
          </div>
        </div>
      </div>
    </div>

    <!-- centro: final + tercer puesto -->
    <div class="col center">
      <span class="trophy" :class="{ won: data.champion }">🏆</span>
      <div class="mbox big">
        <div class="mside" :class="{ tbd: !bx(FINAL.num).home.real }"><span class="flag">{{ bx(FINAL.num).home.flag }}</span><span class="nm">{{ bx(FINAL.num).home.real ? bx(FINAL.num).home.code : bx(FINAL.num).home.name }}</span><span v-if="bx(FINAL.num).hg != null" class="g">{{ bx(FINAL.num).hg }}</span></div>
        <div class="mside" :class="{ tbd: !bx(FINAL.num).away.real }"><span class="flag">{{ bx(FINAL.num).away.flag }}</span><span class="nm">{{ bx(FINAL.num).away.real ? bx(FINAL.num).away.code : bx(FINAL.num).away.name }}</span><span v-if="bx(FINAL.num).ag != null" class="g">{{ bx(FINAL.num).ag }}</span></div>
      </div>
      <div v-if="data.champion" class="champ">{{ data.champion.flag }} {{ data.champion.name }}</div>
      <div class="third">
        <span class="medal" :class="{ won: data.bronze }">🥉</span>
        <span class="col-title">{{ stages['third-place'] }}</span>
        <div class="mbox">
          <div class="mside" :class="{ tbd: !bx(THIRD_PLACE.num).home.real }"><span class="flag">{{ bx(THIRD_PLACE.num).home.flag }}</span><span class="nm">{{ bx(THIRD_PLACE.num).home.real ? bx(THIRD_PLACE.num).home.code : bx(THIRD_PLACE.num).home.name }}</span><span v-if="bx(THIRD_PLACE.num).hg != null" class="g">{{ bx(THIRD_PLACE.num).hg }}</span></div>
          <div class="mside" :class="{ tbd: !bx(THIRD_PLACE.num).away.real }"><span class="flag">{{ bx(THIRD_PLACE.num).away.flag }}</span><span class="nm">{{ bx(THIRD_PLACE.num).away.real ? bx(THIRD_PLACE.num).away.code : bx(THIRD_PLACE.num).away.name }}</span><span v-if="bx(THIRD_PLACE.num).ag != null" class="g">{{ bx(THIRD_PLACE.num).ag }}</span></div>
        </div>
        <div v-if="data.bronze" class="bronze">{{ data.bronze.flag }} {{ data.bronze.name }}</div>
      </div>
    </div>

    <!-- mitad derecha (espejo) -->
    <div v-for="(col, ci) in RIGHT_COLS" :key="'r' + ci" class="col">
      <span class="col-title">{{ stages[col.key] }}</span>
      <div class="col-matches">
        <div class="connectors left" aria-hidden="true">
          <div v-for="(c, k) in conns(col.nums)" :key="k" class="conn" :class="{ single: c.single }" :style="{ top: c.topPct + '%', bottom: (100 - c.botPct) + '%' }">
            <span class="conn-h conn-h-top" /><span class="conn-h conn-h-bot" /><span class="conn-v" /><span class="conn-out" />
          </div>
        </div>
        <div v-for="num in col.nums" :key="num" class="mbox">
          <div class="mside" :class="{ tbd: !bx(num).home.real, prov: bx(num).home.prov }"><span class="flag">{{ bx(num).home.flag }}</span><span class="nm">{{ bx(num).home.real ? bx(num).home.code : bx(num).home.name }}</span><span v-if="bx(num).hg != null" class="g">{{ bx(num).hg }}</span></div>
          <div class="mside" :class="{ tbd: !bx(num).away.real, prov: bx(num).away.prov }"><span class="flag">{{ bx(num).away.flag }}</span><span class="nm">{{ bx(num).away.real ? bx(num).away.code : bx(num).away.name }}</span><span v-if="bx(num).ag != null" class="g">{{ bx(num).ag }}</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board { display: flex; align-items: stretch; gap: 2px; width: 100%; max-width: 100%; overflow: hidden; min-height: 460px; }
.col { display: flex; flex-direction: column; flex: 1 1 0; min-width: 0; }
.col-title { text-align: center; color: var(--accent); font-size: .56rem; font-weight: 800; text-transform: uppercase; letter-spacing: .02em; margin-bottom: .3rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.col-matches { flex: 1; display: flex; flex-direction: column; justify-content: space-around; gap: .25rem; position: relative; }

.mbox { position: relative; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
.mside { display: flex; align-items: center; gap: 3px; min-height: 26px; padding: .2rem .25rem; border-top: 1px solid var(--line); }
.mside:first-child { border-top: none; }
.mside .flag { font-size: 1rem; line-height: 1; }
.mside .nm { flex: 1; font-size: .66rem; font-weight: 700; letter-spacing: .02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mside.tbd .nm { font-weight: 600; font-style: italic; color: var(--faint); }
.mside.prov { opacity: .68; }
.mside.prov .nm { font-weight: 600; }
.mside .g { font-size: .72rem; font-weight: 800; color: var(--accent2); min-width: .8rem; text-align: right; }
.mbox.big { border-color: var(--gold, #c98a00); box-shadow: 0 0 16px rgba(201,138,0,.16); }
.mbox.big .mside { min-height: 40px; }
.mbox.big .flag { font-size: 1.4rem; }
.mbox.big .nm { font-size: .82rem; }

/* conectores (idéntico a pronostico) */
.connectors { position: absolute; top: 0; bottom: 0; width: 0; pointer-events: none; z-index: 1; }
.connectors.right { right: 0; } .connectors.left { left: 0; }
.conn { position: absolute; width: 0; }
.connectors.right .conn { right: 0; } .connectors.left .conn { left: 0; }
.conn-h, .conn-v, .conn-out { position: absolute; background: var(--line2, #cfd8de); }
.conn-h, .conn-out { height: 1px; } .conn-v { width: 1px; }
.connectors.right .conn-h, .connectors.right .conn-out { left: 0; width: 5px; }
.connectors.left .conn-h, .connectors.left .conn-out { right: 0; width: 5px; }
.conn-h-top { top: 0; } .conn-h-bot { bottom: 0; }
.conn-v { top: 0; bottom: 0; }
.connectors.right .conn-v { left: 5px; } .connectors.left .conn-v { right: 5px; }
.conn-out { top: 50%; }
.connectors.right .conn-out { left: 5px; width: 7px; } .connectors.left .conn-out { right: 5px; width: 7px; }
.conn.single .conn-h, .conn.single .conn-v { display: none; }
.conn.single .conn-out { top: 0; }
.connectors.right .conn.single .conn-out { left: 0; } .connectors.left .conn.single .conn-out { right: 0; }

.center { flex: 1.5 1 0; justify-content: center; align-items: center; gap: .4rem; }
.center > * { width: 100%; }
.trophy { font-size: 1.8rem; text-align: center; filter: grayscale(1) opacity(.4); }
.trophy.won { filter: none; text-shadow: 0 0 18px rgba(201,138,0,.6); }
.champ { color: var(--gold, #c98a00); font-weight: 800; font-size: .8rem; text-align: center; }
.third { margin-top: .6rem; }
.medal { display: block; font-size: 1.2rem; text-align: center; filter: grayscale(1) opacity(.4); margin-bottom: .1rem; }
.medal.won { filter: none; }
.bronze { color: #b87333; font-weight: 800; font-size: .74rem; text-align: center; margin-top: .2rem; }

@media (min-width: 760px) {
  .board { gap: .5rem; min-height: 560px; }
  .col-title { font-size: .7rem; }
  .mside .nm { font-size: .8rem; } .mside .flag { font-size: 1.2rem; }
  .center { flex: 1.7 1 0; } .trophy { font-size: 2.6rem; }
}
</style>
