<template>
  <div class="relative pl-4 border-l-2 border-amber-400">
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-xs font-bold text-amber-600 uppercase tracking-wider">
        {{ $t('rules.metric') }} & {{ $t('rules.threshold') }}
      </h4>
      <div
        class="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs"
      >
        <button
          type="button"
          class="px-3 py-1 font-medium transition-colors"
          :class="
            conditionMode === 'single'
              ? 'bg-amber-500 text-white'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
          "
          @click="conditionMode = 'single'"
        >
          {{ $t('rules.singleCondition') }}
        </button>
        <button
          type="button"
          class="px-3 py-1 font-medium transition-colors"
          :class="
            conditionMode === 'multi'
              ? 'bg-amber-500 text-white'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
          "
          @click="switchToMultiCondition"
        >
          {{ $t('rules.multiCondition') }}
        </button>
      </div>
    </div>

    <!-- ===== Single Condition Mode ===== -->
    <template v-if="conditionMode === 'single'">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
            {{ $t('rules.metric') }}
          </label>
          <select v-model="form.metric" class="select-base">
            <option value="Cpu">{{ $t('rules.cpuUsage') }}</option>
            <option value="Memory">{{ $t('rules.memoryUsage') }}</option>
            <option value="ProcessState">{{ $t('rules.processState') }}</option>
          </select>
        </div>
        <div v-if="form.metric !== 'ProcessState'">
          <label class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
            {{
              form.metric === 'Memory' && form.memory_threshold_type === 'Mb'
                ? $t('rules.thresholdMb')
                : $t('rules.threshold')
            }}
          </label>
          <div class="relative flex items-center">
            <button
              type="button"
              class="absolute left-0 h-full px-2 text-slate-400 hover:text-indigo-600 transition-colors"
              @click="
                form.threshold = Math.max(
                  0,
                  form.threshold -
                    (form.metric === 'Memory' && form.memory_threshold_type === 'Mb' ? 100 : 5),
                )
              "
            >
              -
            </button>
            <input
              v-model.number="form.threshold"
              type="number"
              min="0"
              :max="form.metric === 'Memory' && form.memory_threshold_type === 'Mb' ? 999999 : 100"
              class="input-base text-center pl-8 pr-8"
            />
            <button
              type="button"
              class="absolute right-0 h-full px-2 text-slate-400 hover:text-indigo-600 transition-colors"
              @click="
                form.threshold +=
                  form.metric === 'Memory' && form.memory_threshold_type === 'Mb' ? 100 : 5
              "
            >
              +
            </button>
          </div>
        </div>
        <div v-if="form.metric === 'ProcessState'">
          <label class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
            {{ $t('rules.triggerCondition') }}
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label
              class="relative flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all"
              :class="
                form.threshold === 1
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600 shadow-sm ring-1 ring-emerald-200 dark:ring-emerald-800'
                  : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
              "
            >
              <input v-model.number="form.threshold" type="radio" :value="1" class="sr-only" />
              <svg
                class="w-4 h-4"
                :class="
                  form.threshold === 1 ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'
                "
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span
                class="text-xs font-semibold"
                :class="
                  form.threshold === 1
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-600 dark:text-slate-400'
                "
              >
                {{ $t('rules.stateRunningTrigger') }}
              </span>
            </label>
            <label
              class="relative flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all"
              :class="
                form.threshold === 0
                  ? 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-600 shadow-sm ring-1 ring-red-200 dark:ring-red-800'
                  : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
              "
            >
              <input v-model.number="form.threshold" type="radio" :value="0" class="sr-only" />
              <svg
                class="w-4 h-4"
                :class="
                  form.threshold === 0 ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'
                "
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
              <span
                class="text-xs font-semibold"
                :class="
                  form.threshold === 0
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-slate-600 dark:text-slate-400'
                "
              >
                {{ $t('rules.stateStoppedTrigger') }}
              </span>
            </label>
          </div>
        </div>
      </div>
      <!-- Memory threshold type selector (Memory only) -->
      <div v-if="form.metric === 'Memory'" class="mt-4">
        <label class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
          {{ $t('rules.memoryThresholdType') }}
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label
            class="relative flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all"
            :class="
              form.memory_threshold_type === 'Percent'
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600 shadow-sm ring-1 ring-amber-200 dark:ring-amber-800'
                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
            "
          >
            <input
              v-model="form.memory_threshold_type"
              type="radio"
              value="Percent"
              class="sr-only"
              @change="form.threshold = Math.min(form.threshold, 100)"
            />
            <span
              class="text-xs font-semibold"
              :class="
                form.memory_threshold_type === 'Percent'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-600 dark:text-slate-400'
              "
            >
              {{ $t('rules.memoryThresholdPercent') }}
            </span>
          </label>
          <label
            class="relative flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all"
            :class="
              form.memory_threshold_type === 'Mb'
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600 shadow-sm ring-1 ring-amber-200 dark:ring-amber-800'
                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
            "
          >
            <input
              v-model="form.memory_threshold_type"
              type="radio"
              value="Mb"
              class="sr-only"
              @change="form.threshold = Math.max(form.threshold, 100)"
            />
            <span
              class="text-xs font-semibold"
              :class="
                form.memory_threshold_type === 'Mb'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-600 dark:text-slate-400'
              "
            >
              {{ $t('rules.memoryThresholdMb') }}
            </span>
          </label>
        </div>
      </div>
    </template>

    <!-- ===== Multi Condition Mode ===== -->
    <template v-if="conditionMode === 'multi'">
      <div class="space-y-2">
        <div v-for="(cond, idx) in conditionList" :key="idx">
          <!-- Logic connector between conditions -->
          <div v-if="idx > 0" class="flex items-center justify-center my-1.5">
            <button
              type="button"
              class="px-4 py-0.5 rounded-full text-xs font-bold transition-colors"
              :class="
                cond.logic === 'and'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50'
              "
              @click="cond.logic = cond.logic === 'and' ? 'or' : 'and'"
            >
              {{ cond.logic === 'and' ? 'AND' : 'OR' }}
            </button>
          </div>
          <!-- Condition row -->
          <div
            class="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
          >
            <select
              v-model="cond.metric"
              class="select-base text-xs flex-1"
              @change="onConditionMetricChange(cond)"
            >
              <option value="Cpu">{{ $t('rules.cpuUsage') }}</option>
              <option value="Memory">{{ $t('rules.memoryUsage') }}</option>
            </select>
            <select v-model="cond.comparison" class="select-base text-xs w-16">
              <option value="Gt">&gt;</option>
              <option value="Gte">&ge;</option>
              <option value="Lt">&lt;</option>
              <option value="Lte">&le;</option>
              <option value="Eq">=</option>
            </select>
            <input
              v-model.number="cond.threshold"
              type="number"
              min="0"
              class="input-base text-center text-xs w-20"
            />
            <select
              v-if="cond.metric === 'Memory'"
              v-model="cond.memory_threshold_type"
              class="select-base text-xs w-16"
            >
              <option value="Percent">%</option>
              <option value="Mb">MB</option>
            </select>
            <span v-else class="text-xs text-slate-400 w-16 text-center">%</span>
            <button
              type="button"
              class="text-red-400 hover:text-red-600 transition-colors p-1"
              :disabled="conditionList.length <= 1"
              @click="removeCondition(idx)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
        <button
          type="button"
          class="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          @click="addCondition"
        >
          + {{ $t('rules.addCondition') }}
        </button>
      </div>
    </template>

    <!-- ===== Duration + Cooldown ===== -->
    <div class="grid grid-cols-2 gap-4 mt-4">
      <div>
        <label class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
          {{ $t('rules.duration') }} (s)
        </label>
        <div class="relative flex items-center">
          <button
            type="button"
            class="absolute left-0 h-full px-2 text-slate-400 hover:text-indigo-600 transition-colors"
            @click="form.duration_secs = Math.max(1, form.duration_secs - 1)"
          >
            -
          </button>
          <input
            v-model.number="form.duration_secs"
            type="number"
            min="1"
            class="input-base text-center pl-8 pr-8"
          />
          <button
            type="button"
            class="absolute right-0 h-full px-2 text-slate-400 hover:text-indigo-600 transition-colors"
            @click="form.duration_secs++"
          >
            +
          </button>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
          {{ $t('rules.cooldownLabel') }} (s)
        </label>
        <div class="relative flex items-center">
          <button
            type="button"
            class="absolute left-0 h-full px-2 text-slate-400 hover:text-indigo-600 transition-colors"
            @click="form.cooldown_secs = Math.max(0, form.cooldown_secs - 10)"
          >
            -
          </button>
          <input
            v-model.number="form.cooldown_secs"
            type="number"
            min="0"
            class="input-base text-center pl-8 pr-8"
          />
          <button
            type="button"
            class="absolute right-0 h-full px-2 text-slate-400 hover:text-indigo-600 transition-colors"
            @click="form.cooldown_secs += 10"
          >
            +
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { ConditionRow, RuleFormState } from './types';

  // `form` and `conditionList` are passed as reactive objects from the parent;
  // mutating their nested fields propagates back through the same proxy.
  defineProps<{
    form: RuleFormState;
    conditionList: ConditionRow[];
  }>();

  const conditionMode = defineModel<'single' | 'multi'>('conditionMode', { required: true });

  const emit = defineEmits<{
    (e: 'switchToMulti'): void;
    (e: 'addCondition'): void;
    (e: 'removeCondition', idx: number): void;
  }>();

  function switchToMultiCondition() {
    emit('switchToMulti');
  }

  function addCondition() {
    emit('addCondition');
  }

  function removeCondition(idx: number) {
    emit('removeCondition', idx);
  }

  function onConditionMetricChange(cond: ConditionRow) {
    if (cond.metric === 'Cpu') {
      cond.memory_threshold_type = 'Percent';
      cond.threshold = Math.min(cond.threshold, 100);
    } else {
      cond.memory_threshold_type = 'Percent';
    }
  }
</script>
