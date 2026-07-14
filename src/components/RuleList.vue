<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ t('rules.title') }}</h2>
      <button class="btn-primary" @click="handleNewRule">+ {{ t('rules.addRule') }}</button>
    </div>

    <div v-if="rules.length === 0" class="card p-12 text-center">
      <div class="text-slate-300 dark:text-slate-600 mb-3">
        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <p class="text-slate-400 dark:text-slate-500">{{ t('rules.noRules') }}</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="rule in paginatedRules"
        :key="rule.id"
        class="card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
      >
        <div class="flex-1">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="font-semibold text-slate-800 dark:text-slate-100">
              {{ rule.process_name }}
            </span>
            <span v-if="rule.metric === 'ProcessState'" class="badge badge-yellow">
              {{ t('rules.processState') }} -
              {{
                rule.threshold >= 1
                  ? t('rules.stateRunningTrigger')
                  : t('rules.stateStoppedTrigger')
              }}
            </span>
            <span v-else class="badge badge-blue">
              {{ t(`metrics.${rule.metric}`) }} > {{ rule.threshold
              }}{{
                rule.metric === 'Memory' && rule.memory_threshold_type === 'Mb'
                  ? ' MB'
                  : t('rules.percent')
              }}
              {{ rule.duration_secs }}{{ t('rules.seconds') }}
            </span>
            <span
              class="badge"
              :class="rule.trigger_mode === 'Auto' ? 'badge-blue' : 'badge-purple'"
            >
              {{ rule.trigger_mode === 'Auto' ? t('rules.autoExecute') : t('rules.promptUser') }}
            </span>
            <span class="badge" :class="rule.enabled ? 'badge-green' : 'badge-gray'">
              {{ rule.enabled ? t('common.on') : t('common.off') }}
            </span>
          </div>
          <div class="mt-1.5 text-xs text-slate-400">
            {{ t('rules.actions') }} {{ rule.actions.map((a) => getActionLabel(a)).join(', ') }} |
            {{ t('rules.cooldown') }} {{ rule.cooldown_secs }}{{ t('rules.seconds') }}
          </div>
        </div>
        <div class="flex items-center gap-2 ml-4">
          <button
            class="p-2 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all"
            :title="t('rules.viewLogs')"
            @click="viewRuleLogs(rule)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>
          <button :class="['toggle-switch', rule.enabled ? 'on' : 'off']" @click="toggleRule(rule)">
            <span :class="['toggle-knob', rule.enabled ? 'translate-x-5' : 'translate-x-1']" />
          </button>
          <button
            class="p-2 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
            @click="handleEditRule(rule)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            class="p-2 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
            @click="deleteRule(rule.id)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <PaginationBar
      v-if="totalPages > 1"
      :current-page="currentPage"
      :total-pages="totalPages"
      :visible-pages="visiblePages"
      :start-index="startIndex"
      :end-index="endIndex"
      :total="rules.length"
      @prev="prevPage"
      @next="nextPage"
      @go-to="goToPage"
    />

    <RuleFormModal
      v-if="showEditor"
      :key="editingKey"
      :title="editingRule ? t('rules.editRule') : t('rules.newRule')"
      :initial-rule="editingRule"
      :process-name-readonly="false"
      @save="handleSaveRule"
      @close="showEditor = false"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, computed, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useMonitorStore } from '@/stores/monitor';
  import { isRunCommand, type Rule, type Action } from '@/types';
  import RuleFormModal from '@/components/RuleFormModal.vue';
  import PaginationBar from '@/components/PaginationBar.vue';

  const emit = defineEmits<{ (e: 'navigate', tab: string): void }>();
  const { t } = useI18n();
  const store = useMonitorStore();
  const rules = computed(() => store.rules);
  const showEditor = ref(false);
  const editingRule = ref<Rule | null>(null);
  const editingKey = ref(0);

  // Pagination
  const currentPage = ref(1);
  const pageSize = computed(() => store.settings.rules_page_size);

  watch(pageSize, () => {
    currentPage.value = 1;
  });

  const totalPages = computed(() => Math.ceil(rules.value.length / pageSize.value));
  const startIndex = computed(() => (currentPage.value - 1) * pageSize.value);
  const endIndex = computed(() => Math.min(startIndex.value + pageSize.value, rules.value.length));
  const paginatedRules = computed(() => rules.value.slice(startIndex.value, endIndex.value));

  const visiblePages = computed(() => {
    const pages: number[] = [];
    const maxVisible = 7;
    let startPage = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages.value, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  });

  function prevPage() {
    if (currentPage.value > 1) currentPage.value--;
  }
  function nextPage() {
    if (currentPage.value < totalPages.value) currentPage.value++;
  }
  function goToPage(page: number) {
    currentPage.value = page;
  }

  onMounted(() => {
    store.fetchRules();
  });

  function getActionLabel(action: Action): string {
    if (action === 'KillProcess') return t('rules.actionLabels.kill');
    if (action === 'WriteLog') return t('rules.actionLabels.log');
    if (typeof action === 'object') {
      if ('StartProcess' in action) return t('rules.actionLabels.restart');
      if (isRunCommand(action)) {
        const cmds = action.RunCommand.steps?.map((s) => s.cmd).join(', ') || '';
        return cmds ? `${t('rules.actionLabels.cmd')}: ${cmds}` : t('rules.actionLabels.cmd');
      }
      if ('ShowNotification' in action) return t('rules.actionLabels.notify');
    }
    return t('rules.actionLabels.unknown');
  }

  function viewRuleLogs(rule: Rule) {
    store.setSelectedRuleId(rule.id);
    emit('navigate', 'logs');
  }

  function handleEditRule(rule: Rule) {
    editingRule.value = rule;
    editingKey.value++;
    showEditor.value = true;
  }

  function handleNewRule() {
    editingRule.value = null;
    editingKey.value++;
    showEditor.value = true;
  }

  async function handleSaveRule(rule: Rule) {
    await store.saveRule(rule);
    showEditor.value = false;
  }

  async function toggleRule(rule: Rule) {
    await store.toggleRule(rule.id, !rule.enabled);
  }

  async function deleteRule(id: string) {
    await store.deleteRule(id);
  }
</script>
