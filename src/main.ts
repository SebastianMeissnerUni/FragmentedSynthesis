import { createApp } from 'vue'
import App from './App.vue'
import router from './Router/router.ts'
import '@vue-flow/core/dist/style.css';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/controls/dist/style.css';
import './main.css';

createApp(App)
    .use(router)
    .mount('#app')
