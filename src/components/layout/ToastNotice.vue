<script setup lang="ts">
defineProps<{
  message: string
  show: boolean
  tone: 'success' | 'error'
}>()
</script>

<template>
  <Transition name="toast">
    <div v-if="show" class="toast" :class="tone" role="status" aria-live="polite">
      {{ message }}
    </div>
  </Transition>
</template>
