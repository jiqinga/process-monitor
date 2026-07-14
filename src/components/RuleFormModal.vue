<template>
  <div class="modal-overlay">
    <div
      class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
    >
      <div
        class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-t-2xl"
      >
        <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ title }}</h3>
      </div>

      <div class="p-6 space-y-6">
        <RuleBasicFields v-model="form.process_name" :readonly="processNameReadonly" />

        <RuleConditionEditor
          v-model:condition-mode="conditionMode"
          :form="form"
          :condition-list="conditionList"
          @switch-to-multi="switchToMultiCondition"
          @add-condition="addCondition"
          @remove-condition="removeCondition"
        />

        <!-- Trigger Mode (inline; small enough to not warrant its own file) -->
        <div class="relative pl-4 border-l-2 border-purple-400">
          <h4 class="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3">
            {{ $t('rules.triggerMode') }}
          </h4>
          <div class="grid grid-cols-2 gap-3">
            <label
              class="relative flex flex-col items-center gap-1.5 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition-all"
              :class="
                form.trigger_mode === 'Auto'
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-600 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-800'
                  : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
              "
            >
              <input v-model="form.trigger_mode" type="radio" value="Auto" class="sr-only" />
              <svg
                class="w-5 h-5"
                :class="
                  form.trigger_mode === 'Auto'
                    ? 'text-indigo-500'
                    : 'text-slate-400 dark:text-slate-500'
                "
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span
                class="text-xs font-semibold"
                :class="
                  form.trigger_mode === 'Auto'
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-slate-400'
                "
              >
                {{ $t('rules.autoExecute') }}
              </span>
            </label>
            <label
              class="relative flex flex-col items-center gap-1.5 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition-all"
              :class="
                form.trigger_mode === 'Prompt'
                  ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-600 shadow-sm ring-1 ring-purple-200 dark:ring-purple-800'
                  : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
              "
            >
              <input v-model="form.trigger_mode" type="radio" value="Prompt" class="sr-only" />
              <svg
                class="w-5 h-5"
                :class="
                  form.trigger_mode === 'Prompt'
                    ? 'text-purple-500'
                    : 'text-slate-400 dark:text-slate-500'
                "
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <span
                class="text-xs font-semibold"
                :class="
                  form.trigger_mode === 'Prompt'
                    ? 'text-purple-700 dark:text-purple-300'
                    : 'text-slate-600 dark:text-slate-400'
                "
              >
                {{ $t('rules.promptUser') }}
              </span>
            </label>
          </div>
        </div>

        <RuleActionEditor
          :action-flags="actionFlags"
          :process-name="form.process_name"
          @update:process-name="form.process_name = $event"
        />
      </div>

      <div
        class="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl"
      >
        <button class="btn-secondary px-6" @click="$emit('close')">
          {{ $t('rules.cancel') }}
        </button>
        <button class="btn-primary px-6" @click="handleSave">
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {{ $t('rules.save') }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { reactive, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { buildCondition as buildConditionTree } from '@/utils/ruleFormCondition';
  import { isRunCommand, isStartProcess, type Rule, type Action } from '@/types';
  import RuleBasicFields from './rule-form/RuleBasicFields.vue';
  import RuleConditionEditor from './rule-form/RuleConditionEditor.vue';
  import RuleActionEditor from './rule-form/RuleActionEditor.vue';
  import type { ActionFlagsState, ConditionRow, RuleFormState } from './rule-form/types';

  const { t } = useI18n();

  const props = defineProps<{
    /** 模态框标题 */
    title: string;
    /** 初始规则数据（编辑模式时传入） */
    initialRule?: Rule | null;
    /** 初始进程名（从仪表盘代入） */
    initialProcessName?: string;
    /** 进程名是否只读（仪表盘模式） */
    processNameReadonly?: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'save', rule: Rule): void;
    (e: 'close'): void;
  }>();

  // ----- form state -----
  const form = reactive<RuleFormState>({
    process_name: props.initialRule?.process_name || props.initialProcessName || '',
    metric: props.initialRule?.metric || 'Cpu',
    memory_threshold_type: props.initialRule?.memory_threshold_type || 'Percent',
    threshold: props.initialRule?.threshold ?? 90,
    duration_secs: props.initialRule?.duration_secs ?? 5,
    cooldown_secs: props.initialRule?.cooldown_secs ?? 60,
    trigger_mode: props.initialRule?.trigger_mode || 'Auto',
  });

  const actionFlags = reactive<ActionFlagsState>({
    killProcess: false,
    startProcess: false,
    startCmd: '',
    runCommand: false,
    commandSteps: [{ cmd: '', delayMs: 0 }],
    showNotification: false,
    writeLog: true,
  });

  // ----- condition state -----
  const conditionMode = ref<'single' | 'multi'>('single');
  const conditionList = reactive<ConditionRow[]>([]);

  function switchToMultiCondition() {
    conditionMode.value = 'multi';
    if (conditionList.length === 0) {
      conditionList.push({
        metric: form.metric === 'ProcessState' ? 'Cpu' : (form.metric as 'Cpu' | 'Memory'),
        comparison: 'Gt',
        threshold: form.threshold,
        memory_threshold_type: form.memory_threshold_type,
        logic: 'and',
      });
    }
  }

  function addCondition() {
    const lastLogic =
      conditionList.length > 0 ? conditionList[conditionList.length - 1].logic : 'and';
    conditionList.push({
      metric: 'Cpu',
      comparison: 'Gt',
      threshold: 80,
      memory_threshold_type: 'Percent',
      logic: lastLogic,
    });
  }

  function removeCondition(idx: number) {
    if (conditionList.length > 1) conditionList.splice(idx, 1);
  }

  // ----- initial-rule rehydration -----
  if (props.initialRule) {
    for (const a of props.initialRule.actions) {
      if (a === 'KillProcess') actionFlags.killProcess = true;
      else if (a === 'WriteLog') actionFlags.writeLog = true;
      else if (typeof a === 'object') {
        if (isStartProcess(a)) {
          actionFlags.startProcess = true;
          actionFlags.startCmd = a.StartProcess.cmd || '';
        }
        if (isRunCommand(a)) {
          actionFlags.runCommand = true;
          const steps = a.RunCommand.steps || [];
          actionFlags.commandSteps = steps.map((s) => ({
            cmd: s.cmd,
            delayMs: s.delay_ms || 0,
          }));
          if (actionFlags.commandSteps.length === 0) {
            actionFlags.commandSteps = [{ cmd: '', delayMs: 0 }];
          }
        }
        if ('ShowNotification' in a) actionFlags.showNotification = true;
      }
    }
  }

  // ----- save assembly -----
  function buildActions(): Action[] {
    const actions: Action[] = [];
    if (actionFlags.killProcess) actions.push('KillProcess');
    if (actionFlags.startProcess) actions.push({ StartProcess: { cmd: actionFlags.startCmd } });
    if (actionFlags.runCommand) {
      actions.push({
        RunCommand: {
          steps: actionFlags.commandSteps
            .filter((s) => s.cmd.trim())
            .map((s) => ({ cmd: s.cmd, delay_ms: s.delayMs })),
        },
      });
    }
    if (actionFlags.showNotification) {
      actions.push({
        ShowNotification: {
          title: t('rules.defaultNotificationTitle'),
          body: t('rules.defaultNotificationBody'),
        },
      });
    }
    if (actionFlags.writeLog) actions.push('WriteLog');
    return actions;
  }

  function handleSave() {
    const rule: Rule = {
      id: props.initialRule?.id || crypto.randomUUID(),
      process_name: form.process_name,
      metric: form.metric,
      memory_threshold_type: form.memory_threshold_type,
      threshold: form.threshold,
      duration_secs: form.duration_secs,
      cooldown_secs: form.cooldown_secs,
      enabled: props.initialRule?.enabled ?? true,
      trigger_mode: form.trigger_mode,
      actions: buildActions(),
      conditions: buildConditionTree(conditionList, conditionMode.value),
    };
    emit('save', rule);
  }
</script>
