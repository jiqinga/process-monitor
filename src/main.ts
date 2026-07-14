import { createApp, type Component } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import AlertWindow from './views/AlertWindow.vue';
import NotificationToast from './views/NotificationToast.vue';
import i18n from './locales';
import './styles.css';

const path = window.location.pathname;

let rootComponent: Component = App;

if (path === '/alert' || path.startsWith('/alert')) {
  rootComponent = AlertWindow;
} else if (path === '/notification' || path.startsWith('/notification')) {
  rootComponent = NotificationToast;
}

const app = createApp(rootComponent);
app.use(createPinia());
app.use(i18n);
app.mount('#app');
