import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles.scss'
async function start() {
  if (import.meta.env.VITE_USE_MOCKS !== 'false') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass', serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` }, quiet: true })
  }
  createApp(App).use(createPinia()).mount('#app')
}
void start().catch(() => {
  const root = document.getElementById('app')
  if (root) root.textContent = 'The demo could not start. Allow service workers and reload using localhost or HTTPS.'
})
