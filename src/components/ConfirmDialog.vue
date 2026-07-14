<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        @click.self="onCancel"
      >
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="onCancel"></div>
        <div
          class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          <!-- Header -->
          <div class="px-6 pt-6 pb-4">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center"
                :class="iconBgClass"
              >
                <svg
                  v-if="type === 'danger'"
                  class="w-5 h-5 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <svg
                  v-else-if="type === 'warning'"
                  class="w-5 h-5 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <svg
                  v-else
                  class="w-5 h-5 text-indigo-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100">{{ title }}</h3>
            </div>
          </div>

          <!-- Content -->
          <div class="px-6 pb-6">
            <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{{ message }}</p>
          </div>

          <!-- Actions -->
          <div class="px-6 pb-6 flex items-center justify-end gap-3">
            <button
              class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              @click="onCancel"
            >
              {{ cancelText }}
            </button>
            <button
              class="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
              :class="confirmBtnClass"
              @click="onConfirm"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
  import { computed } from 'vue';

  const props = withDefaults(
    defineProps<{
      visible: boolean;
      title?: string;
      message?: string;
      type?: 'info' | 'warning' | 'danger';
      confirmText?: string;
      cancelText?: string;
    }>(),
    {
      title: '确认',
      message: '确定要执行此操作吗？',
      type: 'info',
      confirmText: '确定',
      cancelText: '取消',
    },
  );

  const emit = defineEmits<{
    confirm: [];
    cancel: [];
    'update:visible': [value: boolean];
  }>();

  const iconBgClass = computed(() => {
    switch (props.type) {
      case 'danger':
        return 'bg-red-100 dark:bg-red-900/30';
      case 'warning':
        return 'bg-amber-100 dark:bg-amber-900/30';
      default:
        return 'bg-indigo-100 dark:bg-indigo-900/30';
    }
  });

  const confirmBtnClass = computed(() => {
    switch (props.type) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700';
      default:
        return 'bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700';
    }
  });

  function onConfirm() {
    emit('confirm');
    emit('update:visible', false);
  }

  function onCancel() {
    emit('cancel');
    emit('update:visible', false);
  }
</script>

<style scoped>
  .modal-enter-active,
  .modal-leave-active {
    transition: all 0.2s ease;
  }

  .modal-enter-from,
  .modal-leave-to {
    opacity: 0;
  }

  .modal-enter-from .relative,
  .modal-leave-to .relative {
    transform: scale(0.95);
  }
</style>
