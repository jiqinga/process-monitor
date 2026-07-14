import { reactive, ref } from 'vue';
import { buildCondition as buildConditionTree } from '@/utils/ruleFormCondition';
import type { Condition } from '@/types';

type ConditionRow = {
  metric: 'Cpu' | 'Memory';
  comparison: 'Gt' | 'Gte' | 'Lt' | 'Lte' | 'Eq';
  threshold: number;
  memory_threshold_type: 'Percent' | 'Mb';
  logic: 'and' | 'or';
};

type FormSlice = {
  metric: 'Cpu' | 'Memory' | 'ProcessState';
  threshold: number;
  memory_threshold_type: 'Percent' | 'Mb';
};

/**
 * Owns the single-vs-multi condition mode of the rule form.
 *
 * - `conditionMode` toggles between "use the single metric on the form" and
 *   "evaluate a list of conditions joined by and/or".
 * - `switchToMultiCondition` seeds the multi list from the single form so the
 *   user does not lose their work mid-switch.
 * - `buildCondition` defers to the existing pure helper in `utils/ruleFormCondition`,
 *   keeping the AST shape in one place.
 */
export function useConditionForm(form: FormSlice) {
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

  function onConditionMetricChange(cond: {
    metric: string;
    memory_threshold_type: string;
    threshold: number;
  }) {
    if (cond.metric === 'Cpu') {
      cond.memory_threshold_type = 'Percent';
      cond.threshold = Math.min(cond.threshold, 100);
    } else {
      cond.memory_threshold_type = 'Percent';
    }
  }

  function buildCondition(): Condition | undefined {
    return buildConditionTree(conditionList, conditionMode.value);
  }

  return {
    conditionMode,
    conditionList,
    switchToMultiCondition,
    addCondition,
    removeCondition,
    onConditionMetricChange,
    buildCondition,
  };
}
