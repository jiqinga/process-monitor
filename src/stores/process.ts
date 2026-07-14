import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '@/api/tauri-commands';
import type { LogEntry, ProcessHistory, ProcessInfo, RuleStatus, SystemOverview } from '@/types';

/**
 * Owns runtime process state pushed from the Rust backend, plus on-demand
 * process operations (history, kill, suspend, resume). Anything driven by
 * the `monitor-update` event or a per-PID command lives here.
 */
export const useProcessStore = defineStore('process', () => {
  const processes = ref<ProcessInfo[]>([]);
  const ruleStatuses = ref<RuleStatus[]>([]);
  const logs = ref<LogEntry[]>([]);

  async function fetchProcesses() {
    const result = await api.getProcesses();
    if (Array.isArray(result)) processes.value = result;
  }

  async function fetchLogs() {
    const result = await api.getLogs();
    if (Array.isArray(result)) logs.value = result;
  }

  function setProcesses(next: ProcessInfo[]) {
    processes.value = next;
  }

  function setRuleStatuses(next: RuleStatus[]) {
    ruleStatuses.value = next;
  }

  async function fetchProcessHistory(processName: string): Promise<ProcessHistory | null> {
    return await api.getProcessHistory(processName);
  }

  async function fetchSystemOverview(): Promise<SystemOverview> {
    return await api.getSystemOverview();
  }

  async function killProcess(pid: number): Promise<string> {
    return await api.killProcessByPid(pid);
  }

  async function suspendProcess(pid: number): Promise<string> {
    return await api.suspendProcess(pid);
  }

  async function resumeProcess(pid: number): Promise<string> {
    return await api.resumeProcess(pid);
  }

  return {
    processes,
    ruleStatuses,
    logs,
    fetchProcesses,
    fetchLogs,
    setProcesses,
    setRuleStatuses,
    fetchProcessHistory,
    fetchSystemOverview,
    killProcess,
    suspendProcess,
    resumeProcess,
  };
});
