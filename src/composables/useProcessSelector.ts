import { ref, computed } from 'vue';
import * as api from '@/api/tauri-commands';
import { getErrorMessage } from '@/utils/errors';
import type { ProcessInfo } from '@/types';

/**
 * Owns the "pick a process from a dropdown" widget state that backs the
 * Basic-Info and Restart-Action sections of the rule form.
 *
 * The composable mutates the form/actionFlags it receives. This is intentional:
 * the modal owns the form object, and the selector just patches `process_name`
 * + `startCmd` when the user picks an entry — separating those into events
 * would add ceremony without adding clarity.
 *
 * Provides:
 *  - reactive state for visibility / search / process list / error
 *  - `filteredProcessList` capped at 50 entries
 *  - actions: fetch current process cmd, toggle the dropdown, pick a row
 */
export function useProcessSelector(
  form: { process_name: string },
  actionFlags: { startCmd: string },
) {
  const fetchCmdError = ref('');
  const showProcessSelector = ref(false);
  const processSearchQuery = ref('');
  const processList = ref<ProcessInfo[]>([]);

  async function fetchProcessCmd() {
    if (!form.process_name) return;
    fetchCmdError.value = '';
    try {
      const cmd = await api.getProcessCmd(form.process_name);
      actionFlags.startCmd = cmd;
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
    form.process_name = proc.name;
    actionFlags.startCmd = proc.cmd || '';
    showProcessSelector.value = false;
    processSearchQuery.value = '';
  }

  return {
    fetchCmdError,
    showProcessSelector,
    processSearchQuery,
    processList,
    filteredProcessList,
    fetchProcessCmd,
    toggleProcessSelector,
    selectProcess,
  };
}
