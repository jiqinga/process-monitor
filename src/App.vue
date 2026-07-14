<template>
  <div class="min-h-screen">
    <!-- Header -->
    <header
      class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-sm border-b border-slate-200/60 dark:border-slate-700/60 sticky top-0 z-40"
    >
      <div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"
          >
            <span class="text-white text-sm font-bold">PM</span>
          </div>
          <h1 class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ t('app.title') }}</h1>
        </div>
        <div class="flex items-center gap-1.5">
          <button :class="tabClass('dashboard')" @click="activeTab = 'dashboard'">
            {{ t('nav.dashboard') }}
          </button>
          <button :class="tabClass('rules')" @click="activeTab = 'rules'">
            {{ t('nav.rules') }}
          </button>
          <button :class="tabClass('logs')" @click="activeTab = 'logs'">{{ t('nav.logs') }}</button>
          <button :class="tabClass('settings')" @click="activeTab = 'settings'">
            {{ t('nav.settings') }}
          </button>
          <div class="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-2"></div>
          <button
            class="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-200"
            :title="t('nav.toggleTheme')"
            @click="toggleTheme"
          >
            <!-- Sun icon (shown in dark mode to switch to light) -->
            <svg
              v-if="store.theme === 'dark' || (store.theme === 'system' && isDarkSystem)"
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <!-- Moon icon (shown in light mode to switch to dark) -->
            <svg
              v-else
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          </button>
          <button
            class="px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-all duration-200"
            @click="toggleLang"
          >
            {{ t('nav.lang') }}
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-6 py-6">
      <ProcessDashboard v-if="activeTab === 'dashboard'" />
      <RuleList v-else-if="activeTab === 'rules'" @navigate="onNavigate" />
      <LogViewer v-else-if="activeTab === 'logs'" />
      <SettingsPanel v-else-if="activeTab === 'settings'" />
    </main>

    <!-- Prompt 模式弹窗 -->
    <ActionPromptDialog />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
  import { useI18n } from 'vue-i18n';
  import ProcessDashboard from './components/ProcessDashboard.vue';
  import RuleList from './components/RuleList.vue';
  import LogViewer from './components/LogViewer.vue';
  import ActionPromptDialog from './components/ActionPromptDialog.vue';
  import SettingsPanel from './components/SettingsPanel.vue';
  import { useMonitorStore } from './stores/monitor';

  const { locale, t } = useI18n();
  type TabName = 'dashboard' | 'rules' | 'logs' | 'settings';
  const activeTab = ref<TabName>('dashboard');
  const store = useMonitorStore();

  function isTabName(value: string): value is TabName {
    return value === 'dashboard' || value === 'rules' || value === 'logs' || value === 'settings';
  }

  let unlistenFns: Array<() => void> = [];

  onMounted(async () => {
    store.initTheme();
    unlistenFns = await store.startListening();
  });

  onBeforeUnmount(() => {
    unlistenFns.forEach((fn) => {
      try {
        fn();
      } catch {
        /* noop */
      }
    });
    unlistenFns = [];
  });

  const isDarkSystem = computed(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  function onNavigate(tab: string) {
    if (isTabName(tab)) {
      activeTab.value = tab;
    }
  }

  function toggleTheme() {
    const isDark = store.theme === 'dark' || (store.theme === 'system' && isDarkSystem.value);
    store.setTheme(isDark ? 'light' : 'dark');
  }

  function toggleLang() {
    const newLang = locale.value === 'zh-CN' ? 'en' : 'zh-CN';
    locale.value = newLang;
    localStorage.setItem('language', newLang);
  }

  function tabClass(tab: string) {
    return [
      'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
      activeTab.value === tab
        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50',
    ];
  }
</script>
