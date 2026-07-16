import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
// El topbar estándar ya trae la moneda de <dotrino-support> (§5/§6): no se
// importa aparte ni se re-arma el header a mano.
import '@dotrino/topbar'
import '@dotrino/install'
import App from './App.vue'
import './style.css'

// Recarga al tomar control el SW nuevo + re-chequeo periódico (CONVENCIONES §3).
const updateSW = registerSW({ immediate: true })
setInterval(() => updateSW(), 30 * 60 * 1000)

createApp(App).mount('#app')
