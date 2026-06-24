<script setup lang="ts">
import { INDEX_LEVEL, type Spot } from '../../lib/marine-data'
import type { SortKey } from '../../lib/spot-utils'
import { markerColor, summary } from '../../utils/spot-display'

defineProps<{
  count: number
  distanceText: string | null
  index: number
  sort: SortKey
  spot: Spot
  userLocated: boolean
}>()

const emit = defineEmits<{
  navigate: [id: string]
}>()
</script>

<template>
  <li :style="{ animationDelay: `${Math.min(index * 24, 180)}ms` }">
    <button type="button" @click="emit('navigate', spot.id)">
      <span class="row-no">{{ String(index + 1).padStart(2, '0') }}</span>
      <span class="row-name"><small>{{ spot.region }}</small><strong>{{ spot.name }}</strong></span>
      <span class="row-summary"><strong>{{ summary(spot).primary }}</strong><small>{{ summary(spot).secondary }}</small></span>
      <span class="row-community">글 {{ count }}<template v-if="sort === 'distance' && userLocated && distanceText"> · {{ distanceText }}</template></span>
      <span class="meter" :aria-label="`지수 ${spot.totalIndex}, ${INDEX_LEVEL[spot.totalIndex]}단계`">
        <small>{{ spot.totalIndex }}</small>
        <span class="meter-bars" aria-hidden="true">
          <i
            v-for="step in 5"
            :key="step"
            class="meter-segment"
            :class="{ active: step <= INDEX_LEVEL[spot.totalIndex] }"
            :style="step <= INDEX_LEVEL[spot.totalIndex] ? { background: markerColor(spot.totalIndex) } : undefined"
          ></i>
        </span>
      </span>
    </button>
  </li>
</template>
