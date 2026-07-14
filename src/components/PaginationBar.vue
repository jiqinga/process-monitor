<template>
  <div class="mt-4 flex items-center justify-between">
    <div class="text-sm text-slate-500 dark:text-slate-400">
      {{ t('dashboard.showing', { start: startIndex + 1, end: endIndex, total: total }) }}
    </div>
    <div class="flex items-center gap-1.5">
      <button
        :disabled="currentPage === 1"
        class="btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        @click="emit('prev')"
      >
        {{ t('dashboard.prev') }}
      </button>
      <button
        v-for="page in visiblePages"
        :key="page"
        :class="[
          'px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-200',
          page === currentPage
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700',
        ]"
        @click="emit('goTo', page)"
      >
        {{ page }}
      </button>
      <button
        :disabled="currentPage === totalPages"
        class="btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        @click="emit('next')"
      >
        {{ t('dashboard.next') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n';

  const { t } = useI18n();

  defineProps<{
    currentPage: number;
    totalPages: number;
    visiblePages: number[];
    startIndex: number;
    endIndex: number;
    total: number;
  }>();

  const emit = defineEmits<{
    (e: 'prev'): void;
    (e: 'next'): void;
    (e: 'goTo', page: number): void;
  }>();
</script>
