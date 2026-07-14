<template>
  <div class="relative pl-4 border-l-2 border-emerald-400">
    <h4 class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">
      {{ $t('rules.actionsLabel') }}
    </h4>
    <div class="grid grid-cols-2 gap-2.5">
      <!-- Kill Process -->
      <label
        class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all group"
        :class="
          actionFlags.killProcess
            ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
        "
      >
        <input v-model="actionFlags.killProcess" type="checkbox" class="sr-only" />
        <span
          class="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors"
          :class="
            actionFlags.killProcess
              ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 group-hover:text-slate-500'
          "
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </span>
        <span
          class="text-xs font-medium"
          :class="
            actionFlags.killProcess
              ? 'text-red-700 dark:text-red-400'
              : 'text-slate-600 dark:text-slate-400'
          "
        >
          {{ $t('rules.killProcess') }}
        </span>
      </label>
      <!-- Restart Process -->
      <label
        class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all group"
        :class="
          actionFlags.startProcess
            ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/20'
            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
        "
      >
        <input v-model="actionFlags.startProcess" type="checkbox" class="sr-only" />
        <span
          class="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors"
          :class="
            actionFlags.startProcess
              ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
              : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 group-hover:text-slate-500'
          "
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </span>
        <span
          class="text-xs font-medium"
          :class="
            actionFlags.startProcess
              ? 'text-indigo-700 dark:text-indigo-400'
              : 'text-slate-600 dark:text-slate-400'
          "
        >
          {{ $t('rules.startProcess') }}
        </span>
      </label>
      <!-- Run Command -->
      <label
        class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all group"
        :class="
          actionFlags.runCommand
            ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
        "
      >
        <input v-model="actionFlags.runCommand" type="checkbox" class="sr-only" />
        <span
          class="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors"
          :class="
            actionFlags.runCommand
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 group-hover:text-slate-500'
          "
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </span>
        <span
          class="text-xs font-medium"
          :class="
            actionFlags.runCommand
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-slate-600 dark:text-slate-400'
          "
        >
          {{ $t('rules.runCommand') }}
        </span>
      </label>
      <!-- Notification -->
      <label
        class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all group"
        :class="
          actionFlags.showNotification
            ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
        "
      >
        <input v-model="actionFlags.showNotification" type="checkbox" class="sr-only" />
        <span
          class="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors"
          :class="
            actionFlags.showNotification
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 group-hover:text-slate-500'
          "
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </span>
        <span
          class="text-xs font-medium"
          :class="
            actionFlags.showNotification
              ? 'text-blue-700 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400'
          "
        >
          {{ $t('rules.showNotification') }}
        </span>
      </label>
      <!-- Write Log (full width) -->
      <label
        class="col-span-2 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all group"
        :class="
          actionFlags.writeLog
            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
        "
      >
        <input v-model="actionFlags.writeLog" type="checkbox" class="sr-only" />
        <span
          class="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors"
          :class="
            actionFlags.writeLog
              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 group-hover:text-slate-500'
          "
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </span>
        <span
          class="text-xs font-medium"
          :class="
            actionFlags.writeLog
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400'
          "
        >
          {{ $t('rules.writeLog') }}
        </span>
      </label>
    </div>

    <!-- ===== Start Process sub-inputs ===== -->
    <div v-if="actionFlags.startProcess" class="mt-3 ml-9.5 space-y-2">
      <label class="block text-xs font-medium text-slate-500 mb-1">
        {{ $t('rules.startCommand') }}
      </label>
      <div class="flex items-center gap-2">
        <input
          v-model="actionFlags.startCmd"
          :placeholder="$t('rules.startCommand')"
          class="input-base flex-1"
        />
        <button
          type="button"
          class="flex-shrink-0 px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-lg border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
          :disabled="!processName"
          @click="fetchProcessCmd"
        >
          {{ $t('rules.fetchCmd') }}
        </button>
        <button
          type="button"
          class="flex-shrink-0 px-3 py-2 text-xs font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400 rounded-lg border border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
          @click="toggleProcessSelector"
        >
          {{ $t('rules.selectFromProcesses') }}
        </button>
      </div>
      <p v-if="fetchCmdError" class="text-xs text-red-500">{{ fetchCmdError }}</p>
      <!-- Process selector dropdown -->
      <div
        v-if="showProcessSelector"
        class="border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 max-h-48 overflow-y-auto"
      >
        <div class="px-3 py-2 border-b border-slate-100 dark:border-slate-600">
          <input
            v-model="processSearchQuery"
            :placeholder="$t('rules.searchProcess')"
            class="w-full text-xs bg-transparent outline-none text-slate-600 dark:text-slate-300"
          />
        </div>
        <div
          v-for="proc in filteredProcessList"
          :key="proc.pid"
          class="px-3 py-2 flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-600 last:border-0"
          @click="selectProcess(proc)"
        >
          <div class="flex flex-col">
            <span class="text-xs font-medium text-slate-700 dark:text-slate-300">
              {{ proc.display_name || proc.name }}
            </span>
            <span class="text-[10px] text-slate-400 truncate max-w-72">
              {{ proc.cmd || '-' }}
            </span>
          </div>
          <span class="text-[10px] text-slate-400">PID {{ proc.pid }}</span>
        </div>
        <div
          v-if="filteredProcessList.length === 0"
          class="px-3 py-4 text-center text-xs text-slate-400"
        >
          {{ $t('rules.noProcessFound') }}
        </div>
      </div>
    </div>

    <!-- ===== Run Command sub-inputs ===== -->
    <div v-if="actionFlags.runCommand" class="mt-3 ml-9.5 space-y-2">
      <label class="block text-xs font-medium text-slate-500 mb-1">
        {{ $t('rules.cmdCommand') }}
      </label>
      <div
        v-for="(step, idx) in actionFlags.commandSteps"
        :key="idx"
        class="flex items-center gap-2"
      >
        <input
          v-model="step.cmd"
          :placeholder="$t('rules.cmdCommand')"
          class="input-base flex-1"
        />
        <div class="flex items-center gap-1">
          <input
            v-model.number="step.delayMs"
            type="number"
            min="0"
            :placeholder="$t('rules.delayMs')"
            class="input-base w-20 text-center"
          />
          <span class="text-xs text-slate-400">ms</span>
        </div>
        <button
          class="text-red-400 hover:text-red-600 p-1"
          @click="actionFlags.commandSteps.splice(idx, 1)"
        >
          x
        </button>
      </div>
      <button
        class="text-indigo-600 text-xs font-medium hover:text-indigo-800"
        @click="actionFlags.commandSteps.push({ cmd: '', delayMs: 0 })"
      >
        + {{ $t('rules.addCommand') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue';
  import * as api from '@/api/tauri-commands';
  import { getErrorMessage } from '@/utils/errors';
  import type { ProcessInfo } from '@/types';
  import type { ActionFlagsState } from './types';

  const props = defineProps<{
    actionFlags: ActionFlagsState;
    /** Bound process name from the parent form; required for the fetch-cmd button. */
    processName: string;
  }>();

  const emit = defineEmits<{
    /** Emitted when the user picks a process from the selector dropdown. */
    (e: 'update:processName', value: string): void;
  }>();

  const fetchCmdError = ref('');
  const showProcessSelector = ref(false);
  const processSearchQuery = ref('');
  const processList = ref<ProcessInfo[]>([]);

  async function fetchProcessCmd() {
    if (!props.processName) return;
    fetchCmdError.value = '';
    try {
      props.actionFlags.startCmd = await api.getProcessCmd(props.processName);
    } catch (e: unknown) {
      fetchCmdError.value = getErrorMessage(e);
    }
  }

  async function toggleProcessSelector() {
    showProcessSelector.value = !showProcessSelector.value;
    if (showProcessSelector.value && processList.value.length === 0) {
      try {
        processList.value = await api.getProcesses();
      } catch {
        processList.value = [];
      }
    }
  }

  const filteredProcessList = computed(() => {
    const q = processSearchQuery.value.toLowerCase();
    if (!q) return processList.value.slice(0, 50);
    return processList.value
      .filter((p) => p.name.toLowerCase().includes(q) || p.display_name.toLowerCase().includes(q))
      .slice(0, 50);
  });

  function selectProcess(proc: ProcessInfo) {
    emit('update:processName', proc.name);
    props.actionFlags.startCmd = proc.cmd || '';
    showProcessSelector.value = false;
    processSearchQuery.value = '';
  }
</script>
