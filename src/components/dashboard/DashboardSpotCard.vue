<script setup lang="ts">
import { indexTone, type Spot } from '../../lib/marine-data'
import { cardAiReason, highlight, statsForCard } from '../../utils/spot-display'

defineProps<{
  index: number
  spot: Spot
}>()

const emit = defineEmits<{
  hover: [id?: string]
  navigate: [id: string]
}>()
</script>

<template>
  <article
    class="spot-card"
    role="button"
    tabindex="0"
    :style="{ animationDelay: `${index * 60}ms` }"
    @click="emit('navigate', spot.id)"
    @keydown.enter.prevent="emit('navigate', spot.id)"
    @keydown.space.prevent="emit('navigate', spot.id)"
    @mouseenter="emit('hover', spot.id)"
    @mouseleave="emit('hover', undefined)"
    @focusin="emit('hover', spot.id)"
    @focusout="emit('hover', undefined)"
  >
    <div class="spot-card-top">
      <div>
        <p class="meta">{{ spot.region }}<template v-if="spot.predcNoonSeCd"> · {{ spot.predcNoonSeCd }}</template></p>
        <h3>{{ spot.name }}</h3>
        <p class="meta">{{ spot.lat.toFixed(2) }}°N {{ spot.lot.toFixed(2) }}°E</p>
      </div>
      <span class="chip" :class="indexTone(spot.totalIndex).chip">{{ spot.totalIndex }}</span>
    </div>
    <div class="highlight">
      <span>{{ highlight(spot).label }}</span>
      <strong>{{ highlight(spot).value }}</strong>
    </div>
    <div v-if="cardAiReason(spot)" class="ai-card-reason">
      <span>AI 추천</span>
      <p>{{ cardAiReason(spot) }}</p>
    </div>
    <div class="stats-grid">
      <div v-for="[label, value] in statsForCard(spot)" :key="label">
        <span>{{ label }}</span>
        <strong>{{ value }}</strong>
      </div>
    </div>
  </article>
</template>
