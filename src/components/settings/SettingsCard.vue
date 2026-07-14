<template>
  <div class="settings-card">
    <div class="settings-card-header">
      <div class="settings-icon-wrapper" :class="iconClass">
        <slot name="icon" />
      </div>
      <div>
        <h3 class="settings-card-title">{{ title }}</h3>
        <p class="settings-card-desc">{{ desc }}</p>
      </div>
    </div>
    <div class="settings-card-body" :class="bodyClass">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
  /**
   * Generic chrome for every settings section. Owns the card border, header
   * (icon + title + description) and a body slot. Lets each section focus on
   * its own controls without duplicating Tailwind utility strings.
   */
  defineProps<{
    title: string;
    desc: string;
    /** Tailwind classes applied to the small icon square in the header. */
    iconClass: string;
    /** Extra classes appended to the body container (e.g. `space-y-5`). */
    bodyClass?: string;
  }>();
</script>
