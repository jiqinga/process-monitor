import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '@/api/tauri-commands';
import type { Rule } from '@/types';

/**
 * Owns rule definitions and the currently selected rule (for cross-tab linking).
 * Splits the original `useMonitorStore` along the "what the user manages" axis.
 */
export const useRuleStore = defineStore('rule', () => {
  const rules = ref<Rule[]>([]);
  const selectedRuleId = ref<string | null>(null);

  async function fetchRules() {
    const result = await api.getRules();
    if (Array.isArray(result)) rules.value = result;
  }

  async function saveRule(rule: Rule) {
    await api.saveRule(rule);
    await fetchRules();
  }

  async function deleteRule(id: string) {
    await api.deleteRule(id);
    await fetchRules();
  }

  async function toggleRule(id: string, enabled: boolean) {
    await api.toggleRule(id, enabled);
    await fetchRules();
  }

  function setSelectedRuleId(id: string | null) {
    selectedRuleId.value = id;
  }

  return {
    rules,
    selectedRuleId,
    fetchRules,
    saveRule,
    deleteRule,
    toggleRule,
    setSelectedRuleId,
  };
});
