import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import '@dotrino/support'
import '@dotrino/install'
import App from './App.vue'
import './style.css'

// Recarga al tomar control el SW nuevo + re-chequeo periódico (CONVENCIONES §3).
const updateSW = registerSW({ immediate: true })
setInterval(() => updateSW(), 30 * 60 * 1000)

createApp(App).mount('#app')
