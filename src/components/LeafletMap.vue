<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import { INDEX_LEVEL, type IndexLabel, type Spot } from '../lib/marine-data'

const props = withDefaults(
  defineProps<{
    spots: Spot[]
    height?: number
    focusId?: string
    highlightId?: string
    navigateOnClick?: boolean
    weatherControls?: boolean
    showLiveBadge?: boolean
  }>(),
  {
    height: 380,
    focusId: undefined,
    highlightId: undefined,
    navigateOnClick: true,
    weatherControls: false,
    showLiveBadge: true,
  },
)

const emit = defineEmits<{
  navigate: [id: string]
}>()

const container = ref<HTMLDivElement | null>(null)
const radarActive = ref(false)
const windActive = ref(false)
const radarLoading = ref(false)
const radarUnavailable = ref(false)
const windUnavailable = ref(false)
const windApiKey = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined
let map: L.Map | null = null
let markerLayer: L.LayerGroup | null = null
let radarLayer: L.TileLayer | null = null
let windLayer: L.TileLayer | null = null

onMounted(async () => {
  await nextTick()
  createMap()
  renderMarkers()
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
  radarLayer = null
  windLayer = null
})

watch(
  () => [props.spots, props.focusId, props.highlightId] as const,
  () => {
    renderMarkers()
  },
  { deep: true },
)

function createMap() {
  if (!container.value || map) return

  const center = focusedCenter() ?? [36.2, 127.8]
  map = L.map(container.value, {
    center,
    zoom: props.focusId ? 11 : 7,
    scrollWheelZoom: false,
    zoomControl: true,
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map)

  markerLayer = L.layerGroup().addTo(map)
}

function showBaseLayer() {
  if (!map) return
  radarLayer?.remove()
  windLayer?.remove()
  radarActive.value = false
  windActive.value = false
}

async function toggleRadarLayer() {
  if (!map || radarLoading.value || radarUnavailable.value) return

  if (radarActive.value) {
    radarLayer?.remove()
    radarActive.value = false
    return
  }

  await ensureRadarLayer()
  if (!radarLayer) return

  radarLayer.addTo(map)
  radarActive.value = true
}

function toggleWindLayer() {
  if (!map || !windApiKey || windUnavailable.value) return

  if (windActive.value) {
    windLayer?.remove()
    windActive.value = false
    return
  }

  ensureWindLayer()
  if (!windLayer) return

  windLayer.addTo(map)
  windActive.value = true
}

async function ensureRadarLayer() {
  if (radarLayer || radarLoading.value) return

  radarUnavailable.value = false
  radarLoading.value = true

  try {
    const response = await fetch('https://api.rainviewer.com/public/weather-maps.json')
    if (!response.ok) throw new Error('RainViewer manifest request failed')

    const data = await response.json()
    const frames = data?.radar?.past ?? []
    const latest = frames.at(-1)
    if (!data?.host || !latest?.path) throw new Error('RainViewer radar frame not found')

    radarLayer = L.tileLayer(`${data.host}${latest.path}/512/{z}/{x}/{y}/2/1_1.png`, {
      attribution: '&copy; <a href="https://www.rainviewer.com/">RainViewer</a>',
      maxNativeZoom: 7,
      maxZoom: 19,
      opacity: 0.58,
      zIndex: 320,
    })
  } catch {
    radarUnavailable.value = true
  } finally {
    radarLoading.value = false
  }
}

function ensureWindLayer() {
  if (windLayer || !windApiKey) return

  windLayer = L.tileLayer(`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${windApiKey}`, {
    attribution: '&copy; <a href="https://openweathermap.org/">OpenWeather</a>',
    className: 'wind-weather-layer',
    maxZoom: 19,
    opacity: 0.56,
    zIndex: 310,
  })

  windLayer.on('tileerror', () => {
    windUnavailable.value = true
    windLayer?.remove()
    windActive.value = false
  })
}

function renderMarkers() {
  if (!map) return
  markerLayer?.clearLayers()
  if (!props.spots.length) return

  const bounds: L.LatLngExpression[] = []
  for (const spot of props.spots) {
    const isFocus = spot.id === props.focusId
    const isHighlight = spot.id === props.highlightId
    const size = isFocus ? 18 : 14
    const color = toneColor(spot.totalIndex)
    const icon = L.divIcon({
      className: 'marine-div-icon',
      html: `<div class="marine-marker${isHighlight ? ' highlighted' : ''}" style="--marker-color:${color};width:${size}px;height:${size}px;"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })

    const marker = L.marker([spot.lat, spot.lot], { icon }).addTo(markerLayer!)
    marker.bindTooltip(
      `<div class="marine-tooltip">
        <div class="marine-tooltip-title">${escapeHtml(spot.name)}</div>
        <div class="marine-tooltip-meta">${escapeHtml(spot.region)} · ${escapeHtml(spot.totalIndex)}</div>
      </div>`,
      { direction: 'top', offset: [0, -8] },
    )

    if (props.navigateOnClick) marker.on('click', () => emit('navigate', spot.id))
    bounds.push([spot.lat, spot.lot])
  }

  if (props.focusId) {
    const center = focusedCenter()
    if (center) map.setView(center, 11)
  } else if (bounds.length > 1) {
    map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] })
  } else if (bounds.length === 1) {
    map.setView(bounds[0], 11)
  }

  map.invalidateSize()
}

function focusedCenter(): [number, number] | null {
  const spot = props.focusId ? props.spots.find((item) => item.id === props.focusId) : null
  return spot ? [spot.lat, spot.lot] : null
}

function toneColor(label: IndexLabel) {
  const level = INDEX_LEVEL[label]
  if (level >= 4) return '#3b82f6'
  if (level === 3) return '#f59e0b'
  return '#ef4444'
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
</script>

<template>
  <div class="leaflet-map-shell" :class="{ 'has-weather-controls': weatherControls }">
    <div ref="container" class="leaflet-map" :style="{ height: `${height}px` }"></div>
    <div class="map-top-controls">
      <div v-if="showLiveBadge" class="map-live-badge" aria-label="실시간 데이터">
        <span aria-hidden="true"></span>
        실시간
      </div>
      <div v-if="weatherControls" class="map-layer-control" aria-label="Weather map layers">
        <button
          type="button"
          :class="{ active: !radarActive && !windActive }"
          @click="showBaseLayer"
        >
          기본
        </button>
        <button
          type="button"
          :class="{ active: radarActive }"
          :disabled="radarLoading || radarUnavailable"
          @click="toggleRadarLayer"
        >
          {{ radarLoading ? '로딩 중' : radarUnavailable ? '레이더 오류' : '비·구름' }}
        </button>
        <button
          type="button"
          :class="{ active: windActive }"
          :disabled="!windApiKey || windUnavailable"
          :title="windApiKey ? '바람 레이어 보기' : 'VITE_OPENWEATHER_API_KEY를 설정하면 바람 레이어를 볼 수 있습니다'"
          @click="toggleWindLayer"
        >
          {{ !windApiKey ? '바람 키 필요' : windUnavailable ? '바람 오류' : '바람' }}
        </button>
      </div>
    </div>
  </div>
</template>
