<template>
  <div class="relative pl-4 border-l-2 border-indigo-400">
    <h4 class="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
      {{ $t('rules.processName') }}
    </h4>
    <input
      v-model="processName"
      :readonly="readonly"
      :class="['input-base', readonly ? 'bg-slate-50 dark:bg-slate-700' : '']"
      :placeholder="$t('rules.processNamePlaceholder')"
    />
    <p v-if="!readonly" class="mt-1.5 text-xs text-slate-400">
      {{ $t('rules.processNamePlaceholder') }}
    </p>
  </div>
</template>

<script setup lang="ts">
  const processName = defineModel<string>({ required: true });
  defineProps<{ readonly?: boolean }>();
</script>
