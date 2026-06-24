<script setup lang="ts">
defineProps<{
  imageUrl: string
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div v-if="imageUrl" class="image-modal" role="dialog" aria-modal="true" aria-label="게시물 이미지 크게 보기" @click.self="emit('close')">
    <button class="image-modal-close" type="button" aria-label="닫기" @click="emit('close')">×</button>
    <img :src="imageUrl" alt="" />
  </div>
</template>
