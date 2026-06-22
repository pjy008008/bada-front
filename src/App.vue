<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  EXPERIENCE_DESC,
  EXPERIENCE_LABELS,
  INDEX_LEVEL,
  SPOTS_BY_EXPERIENCE,
  getSpot as getStaticSpot,
  getSpots,
  indexTone,
  type ExperienceKey,
  type IndexLabel,
  type Spot,
} from './lib/marine-data'
import { defaultDate, getDateOptions } from './lib/date-utils'
import {
  SORT_LABELS,
  filterByQuery,
  haversine,
  sortSpots,
  type SortKey,
} from './lib/spot-utils'
import {
  API_BASE_URL,
  authApi,
  clearAccessToken,
  getAccessToken,
  normalizeSpot,
  postApi,
  setAccessToken,
  spotApi,
  userApi,
  type ApiComment,
  type ApiPost,
  type ApiUser,
} from './lib/api'
import LeafletMap from './components/LeafletMap.vue'

type Page = 'home' | 'all' | 'spot' | 'auth' | 'me' | 'settings'
type CommunityPost = {
  id: string
  spotId: string
  title: string
  content: string
  imageUrl: string | null
  imageUrls: string[]
  createdAt: string
  author: string
  authorId?: string
  authorEmail?: string
  likeCount: number
  liked: boolean
  commentCount: number
  comments: CommunityComment[]
}
type CommunityComment = {
  id: string
  content: string
  createdAt: string
  author: string
}
type Toast = {
  show: boolean
  message: string
  tone: 'success' | 'error'
}

const VALID_EXP: ExperienceKey[] = ['travel', 'surfing', 'fishing', 'scuba', 'mudflat', 'swimming']
const VALID_SORT: SortKey[] = ['index', 'community', 'distance']

const page = ref<Page>('home')
const spotId = ref('')
const allExp = ref<ExperienceKey>('travel')
const allSort = ref<SortKey>('index')
const allQuery = ref('')
const allRegion = ref<string | undefined>()

const homeExperience = ref<ExperienceKey>('travel')
const homeSort = ref<SortKey>('index')
const hoveredHomeSpotId = ref<string | undefined>()
const openDateMenu = ref<'home' | 'all' | null>(null)
const selectedDate = ref(defaultDate())
const listDate = ref(defaultDate())
const geo = reactive<{ loc: { lat: number; lon: number } | null; loading: boolean; error: string | null }>({
  loc: null,
  loading: false,
  error: null,
})
const user = reactive({
  id: '',
  loggedIn: false,
  name: 'Marine User',
  email: 'demo@marinepro.kr',
  avatarUrl: '',
  createdAt: '',
})
const community = ref<CommunityPost[]>([])
const postForm = reactive({ title: '', content: '', imageUrl: '' })
const postImageFiles = ref<File[]>([])
const postImageInput = ref<HTMLInputElement | null>(null)
const commentDrafts = reactive<Record<string, string>>({})
const openPostId = ref<string | null>(null)
const selectedImageUrl = ref('')
const postImageSlides = reactive<Record<string, number>>({})
const favoriteIds = ref<Set<string>>(new Set())
const favoriteSpots = ref<Spot[]>([])
const headerQuery = ref('')
const profileMenuOpen = ref(false)
const authMode = ref<'signin' | 'signup'>('signin')
const authForm = reactive({ email: '', password: '', displayName: '' })
const authMessage = ref('')
const apiState = reactive({ loading: false, error: '' })
const toast = reactive<Toast>({ show: false, message: '', tone: 'success' })
let toastTimer: number | undefined
const remoteSpots = reactive<Record<ExperienceKey, Spot[]>>({
  travel: [],
  surfing: [],
  fishing: [],
  scuba: [],
  mudflat: [],
  swimming: [],
})
const homeCards = reactive<Record<ExperienceKey, Spot[]>>({
  travel: [],
  surfing: [],
  fishing: [],
  scuba: [],
  mudflat: [],
  swimming: [],
})
const remoteSpotDetails = reactive<Record<string, Spot>>({})
const settingsForm = reactive({
  displayName: '',
  newPassword: '',
  confirmPassword: '',
  deletePassword: '',
  deleteText: '',
})

const dateOptions = computed(() => getDateOptions())
const counts = computed<Record<string, number>>(() => {
  const acc: Record<string, number> = {}
  for (const spot of Object.values(remoteSpots).flat()) {
    if (spot.postCount != null) acc[spot.id] = spot.postCount
  }
  for (const spot of Object.values(homeCards).flat()) {
    if (spot.postCount != null) acc[spot.id] = spot.postCount
  }
  for (const spot of favoriteSpots.value) {
    if (spot.postCount != null) acc[spot.id] = spot.postCount
  }
  for (const post of community.value) acc[post.spotId] = (acc[post.spotId] ?? 0) + 1
  return acc
})

const homeSpots = computed(() => spotsFor(homeExperience.value))
const homeCardSpots = computed(() => homeCards[homeExperience.value].length ? homeCards[homeExperience.value] : homeSpots.value)
const homeSorted = computed(() => sortSpots(homeCardSpots.value, homeSort.value, { counts: counts.value, userLoc: geo.loc }))
const homeMapSpots = computed(() => sortSpots(homeSpots.value, homeSort.value, { counts: counts.value, userLoc: geo.loc }))
const homePreview = computed(() => homeSorted.value.slice(0, 6))
const homeDateLabel = computed(() => dateOptions.value.find((o) => o.value === selectedDate.value)?.label ?? selectedDate.value)

const allSpots = computed(() => spotsFor(allExp.value))
const regions = computed(() => {
  const map = new Map<string, number>()
  for (const spot of allSpots.value) {
    const root = regionRoot(spot.region)
    map.set(root, (map.get(root) ?? 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
})
const filteredAll = computed(() => {
  let spots = filterByQuery(allSpots.value, allQuery.value)
  if (allRegion.value) spots = spots.filter((spot) => regionRoot(spot.region) === allRegion.value)
  return spots
})
const sortedAll = computed(() => sortSpots(filteredAll.value, allSort.value, { counts: counts.value, userLoc: geo.loc }))
const allStats = computed(() => ({
  total: filteredAll.value.length,
  great: filteredAll.value.filter((spot) => INDEX_LEVEL[spot.totalIndex] >= 4).length,
  totalPosts: filteredAll.value.reduce((sum, spot) => sum + (counts.value[spot.id] ?? 0), 0),
}))
const topSpot = computed(() => sortedAll.value[0])
const listDateLabel = computed(() => dateOptions.value.find((o) => o.value === listDate.value)?.label ?? listDate.value)
const currentSpot = computed(() => getSpot(spotId.value))
const spotPosts = computed(() => community.value.filter((post) => post.spotId === spotId.value))
const myPosts = computed(() =>
  community.value.filter((post) => canManagePost(post)),
)

onMounted(() => {
  loadUser()
  loadCommunity()
  applyRoute()
  window.addEventListener('popstate', applyRoute)
  void initializeSession()
  void loadHomeData()
  void loadAllData()
})

watch([page, spotId, allExp, allSort, allQuery, allRegion], () => {
  document.title = titleForPage()
})

watch([homeExperience, selectedDate, homeSort], () => {
  void loadHomeData()
})

watch([allExp, listDate, allSort], () => {
  void loadAllData()
})

watch(page, (current, previous) => {
  if (current === 'all' && previous !== 'all') void loadAllData()
})

watch(
  () => geo.loc,
  () => {
    void loadHomeData()
    void loadAllData()
  },
)

watch([page, spotId, listDate], () => {
  if (page.value === 'spot' && spotId.value) {
    void loadSpotDetail(spotId.value)
    void loadPosts(spotId.value)
  }
  if (page.value === 'me') {
    void loadMyPosts()
    void loadFavoriteSpots()
  }
})

function applyRoute() {
  const url = new URL(window.location.href)
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] === 'all') {
    page.value = 'all'
    allExp.value = parseExp(url.searchParams.get('exp'))
    allSort.value = parseSort(url.searchParams.get('sort'))
    allQuery.value = url.searchParams.get('q') ?? ''
    allRegion.value = url.searchParams.get('region') ?? undefined
  } else if (parts[0] === 'spot' && parts[1]) {
    page.value = 'spot'
    spotId.value = parts[1]
  } else if (parts[0] === 'auth' || (parts[0] === 'oauth' && parts[1] === 'callback')) {
    page.value = 'auth'
  } else if (parts[0] === 'me') {
    page.value = 'me'
  } else if (parts[0] === 'settings') {
    page.value = 'settings'
  } else {
    page.value = 'home'
  }
}

function navigate(path: string) {
  profileMenuOpen.value = false
  history.pushState(null, '', path)
  applyRoute()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goAll(exp = homeExperience.value, sort = homeSort.value) {
  navigate(`/all?exp=${exp}&sort=${sort}`)
}

function selectDate(scope: 'home' | 'all', value: string) {
  if (scope === 'home') selectedDate.value = value
  else listDate.value = value
  openDateMenu.value = null
}

function updateAllUrl() {
  const params = new URLSearchParams()
  params.set('exp', allExp.value)
  params.set('sort', allSort.value)
  if (allQuery.value.trim()) params.set('q', allQuery.value.trim())
  if (allRegion.value) params.set('region', allRegion.value)
  history.replaceState(null, '', `/all?${params.toString()}`)
}

function parseExp(value: string | null): ExperienceKey {
  return VALID_EXP.includes(value as ExperienceKey) ? (value as ExperienceKey) : 'travel'
}

function parseSort(value: string | null): SortKey {
  return VALID_SORT.includes(value as SortKey) ? (value as SortKey) : 'index'
}

function spotsFor(exp: ExperienceKey) {
  return remoteSpots[exp].length ? remoteSpots[exp] : getSpots(exp)
}

function getSpot(id: string) {
  return remoteSpotDetails[id]
    ?? Object.values(homeCards).flat().find((spot) => spot.id === id)
    ?? Object.values(remoteSpots).flat().find((spot) => spot.id === id)
    ?? getStaticSpot(id)
}

function fallbackFor(raw: Record<string, unknown>, exp: ExperienceKey) {
  const id = String(raw.spotId ?? raw.id ?? '')
  const name = String(raw.spotName ?? raw.name ?? '')
  return getStaticSpot(id) ?? SPOTS_BY_EXPERIENCE[exp].find((spot) => spot.name === name)
}

function apiErrorMessage(error: unknown) {
  const anyError = error as { response?: { data?: unknown; status?: number }; message?: string }
  const data = anyError.response?.data
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    return String(obj.message ?? obj.error ?? `API 오류 (${anyError.response?.status ?? ''})`)
  }
  return anyError.message || 'API 요청에 실패했습니다.'
}

function showToast(message: string, tone: Toast['tone'] = 'success') {
  toast.show = true
  toast.message = message
  toast.tone = tone
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.show = false
  }, 3000)
}

function openImageModal(url: string) {
  selectedImageUrl.value = url
}

function closeImageModal() {
  selectedImageUrl.value = ''
}

function postImageStart(post: CommunityPost) {
  return Math.min(postImageSlides[post.id] ?? 0, Math.max(post.imageUrls.length - 2, 0))
}

function slidePostImages(post: CommunityPost, direction: -1 | 1) {
  const maxStart = Math.max(post.imageUrls.length - 2, 0)
  const next = postImageStart(post) + direction
  postImageSlides[post.id] = Math.min(Math.max(next, 0), maxStart)
}

async function loadHomeData() {
  apiState.loading = true
  try {
    const [cards, markers] = await Promise.all([
      spotApi.dashboard(homeExperience.value, selectedDate.value, homeSort.value, 6, geo.loc),
      spotApi.markers(homeExperience.value, selectedDate.value),
    ])
    if (cards.length) {
      homeCards[homeExperience.value] = await normalizeSpotRows(cards, homeExperience.value, selectedDate.value)
      syncFavoriteIds(homeCards[homeExperience.value])
    }
    if (markers.length) {
      remoteSpots[homeExperience.value] = markers.map((row) => normalizeSpot(row, fallbackFor(row, homeExperience.value)))
    } else if (!remoteSpots[homeExperience.value].length) {
      const rows = await spotApi.list(homeExperience.value, selectedDate.value, homeSort.value, '', geo.loc)
      if (rows.length) remoteSpots[homeExperience.value] = rows.map((row) => normalizeSpot(row, fallbackFor(row, homeExperience.value)))
    }
    apiState.error = ''
  } catch (error) {
    apiState.error = apiErrorMessage(error)
  } finally {
    apiState.loading = false
  }
}

async function loadAllData() {
  await loadSpotList(allExp.value, listDate.value, allSort.value, allQuery.value)
}

async function loadSpotList(exp: ExperienceKey, targetDate: string, sort: SortKey, keyword = '', fallbackLimit?: number) {
  apiState.loading = true
  try {
    const rows = fallbackLimit
      ? await spotApi.dashboard(exp, targetDate, sort, fallbackLimit, geo.loc)
      : await spotApi.list(exp, targetDate, sort, keyword, geo.loc)
    const source = rows.length ? rows : await spotApi.dashboard(exp, targetDate, sort, fallbackLimit ?? 100, geo.loc)
    if (source.length) {
      remoteSpots[exp] = await normalizeSpotRows(source, exp, targetDate)
      syncFavoriteIds(remoteSpots[exp])
      apiState.error = ''
    }
  } catch (error) {
    apiState.error = apiErrorMessage(error)
  } finally {
    apiState.loading = false
  }
}

async function normalizeSpotRows(rows: Record<string, unknown>[], exp: ExperienceKey, targetDate: string) {
  const spots = rows.map((row) => normalizeSpot(row, fallbackFor(row, exp)))
  const enriched = await Promise.all(
    spots.map(async (spot, index) => {
      if (rowHasPreviewMetrics(rows[index], spot.experience) || rowHasPreviewValues(rows[index], spot.experience)) return spot
      try {
        const raw = await spotApi.detail(spot.id, spot.predcYmd || targetDate)
        return normalizeSpot(raw, spot)
      } catch {
        return spot
      }
    }),
  )
  return enriched
}

function rowHasPreviewValues(row: Record<string, unknown>, exp: ExperienceKey) {
  const flat = flattenValues(row)
  switch (exp) {
    case 'travel':
      return hasAny(flat, ['weather', 'tide', 'tdlvHrCn', 'airTemperature', 'avgArtmp', 'waterTemperature', 'avgWtem', 'waveHeight', 'avgWvhgt', 'windSpeed', 'avgWspd'])
    case 'swimming':
      return hasAny(flat, ['openStatus', 'opnStat', 'waterTemperature', 'avgWtem', 'waveHeight', 'maxWvhgt', 'windSpeed', 'maxWspd'])
    case 'fishing':
      return hasAny(flat, ['airTemperature', 'minArtmp', 'maxArtmp'])
        && hasAny(flat, ['waterTemperature', 'minWtem', 'maxWtem'])
        && hasAny(flat, ['waveHeight', 'minWvhgt', 'maxWvhgt'])
        && hasAny(flat, ['currentSpeed', 'currentVelocity', 'flowSpeed', 'minCrsp', 'maxCrsp'])
    case 'scuba':
      return hasAny(flat, ['tide', 'tdlvHrCn', 'waterTemperature', 'maxWtem', 'waveHeight', 'maxWvhgt', 'currentSpeed', 'currentVelocity', 'maxCrsp'])
    case 'mudflat':
      return hasAny(flat, ['experienceStartTime', 'startTime', 'beginTime', 'mdftExprnBgngTm', 'mdftExprnBgnTm'])
        && hasAny(flat, ['experienceEndTime', 'endTime', 'mdftExprnEndTm'])
        && hasAny(flat, ['airTemperature', 'maxArtmp', 'minArtmp', 'windSpeed', 'maxWspd', 'minWspd'])
    case 'surfing':
      return hasAny(flat, ['waveHeight', 'avgWvhgt', 'wavePeriod', 'avgWvpd', 'windSpeed', 'avgWspd', 'waterTemperature', 'avgWtem', 'grade', 'grdCn'])
  }
}

function rowHasPreviewMetrics(row: Record<string, unknown>, exp: ExperienceKey) {
  const metrics = row.metrics
  if (!metrics || typeof metrics !== 'object') return false
  const flat = flattenValues(metrics)
  switch (exp) {
    case 'travel':
      return hasAny(flat, ['weather', 'tide', 'airTemperature', 'waterTemperature', 'waveHeight', 'windSpeed'])
    case 'swimming':
      return hasAny(flat, ['openStatus', 'openingStatus', 'waterTemperature', 'waveHeight', 'windSpeed'])
    case 'fishing':
      return hasAny(flat, ['airTemperature', 'minArtmp', 'maxArtmp'])
        && hasAny(flat, ['waterTemperature', 'minWtem', 'maxWtem'])
        && hasAny(flat, ['waveHeight', 'minWvhgt', 'maxWvhgt'])
        && hasAny(flat, ['currentSpeed', 'currentVelocity', 'flowSpeed', 'minCrsp', 'maxCrsp'])
    case 'scuba':
      return hasAny(flat, ['tide', 'waterTemperature', 'waveHeight', 'currentSpeed', 'currentVelocity'])
    case 'mudflat':
      return hasAny(flat, ['experienceStartTime', 'startTime', 'beginTime', 'mdftExprnBgngTm', 'mdftExprnBgnTm'])
        && hasAny(flat, ['experienceEndTime', 'endTime', 'mdftExprnEndTm'])
        && hasAny(flat, ['airTemperature', 'maxArtmp', 'minArtmp', 'windSpeed', 'maxWspd', 'minWspd'])
    case 'surfing':
      return hasAny(flat, ['waveHeight', 'wavePeriod', 'windSpeed', 'waterTemperature', 'grade'])
  }
}

function flattenValues(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {}
  if (Array.isArray(value)) return flattenValues(value[0])
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (child && typeof child === 'object') Object.assign(out, flattenValues(child))
    else out[key.toLowerCase().replace(/[^a-z0-9가-힣]/g, '')] = child
  }
  return out
}

function hasAny(flat: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => {
    const value = flat[key.toLowerCase().replace(/[^a-z0-9가-힣]/g, '')]
    return value !== undefined && value !== null && value !== ''
  })
}

async function loadSpotDetail(id: string) {
  const fallback = getSpot(id)
  try {
    const raw = await spotApi.detail(id, targetDateForSpot(id))
    remoteSpotDetails[id] = normalizeSpot(raw, fallback)
    syncFavoriteIds([remoteSpotDetails[id]])
    apiState.error = ''
  } catch (error) {
    apiState.error = apiErrorMessage(error)
  }
}

function targetDateForSpot(id: string) {
  const remote = remoteSpotDetails[id]
    ?? Object.values(homeCards).flat().find((spot) => spot.id === id)
    ?? Object.values(remoteSpots).flat().find((spot) => spot.id === id)
  return remote?.predcYmd || (page.value === 'all' ? listDate.value : selectedDate.value)
}

async function restoreSession() {
  if (!getAccessToken()) return
  try {
    applyUser(await userApi.me())
  } catch {
    clearAccessToken()
  }
}

async function initializeSession() {
  if (window.location.pathname === '/oauth/callback') {
    await completeOAuthLogin()
    return
  }
  await restoreSession()
}

async function completeOAuthLogin() {
  authMessage.value = ''
  try {
    const result = await authApi.refresh()
    applyUser(result.user, result.accessToken)
    history.replaceState(null, '', '/')
    applyRoute()
    showToast('소셜 로그인이 완료되었습니다.')
  } catch (error) {
    clearAccessToken()
    authMessage.value = `소셜 로그인에 실패했습니다. ${apiErrorMessage(error)}`
    history.replaceState(null, '', '/auth')
    applyRoute()
  }
}

function setAllExp(exp: ExperienceKey) {
  allExp.value = exp
  allRegion.value = undefined
  updateAllUrl()
}

function setAllSort(sort: SortKey) {
  if (sort === 'distance' && !geo.loc) requestLocation()
  allSort.value = sort
  updateAllUrl()
}

function setAllRegion(region?: string) {
  allRegion.value = region
  updateAllUrl()
}

function onAllQueryInput() {
  updateAllUrl()
  void loadAllData()
}

function setHomeSort(sort: SortKey) {
  if (sort === 'distance' && !geo.loc) requestLocation()
  homeSort.value = sort
}

function requestLocation() {
  if (!navigator.geolocation) {
    geo.error = '위치 기능을 지원하지 않는 브라우저입니다.'
    return
  }
  geo.loading = true
  geo.error = null
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      geo.loc = { lat: pos.coords.latitude, lon: pos.coords.longitude }
      geo.loading = false
    },
    () => {
      geo.error = '위치 권한이 거부되었습니다.'
      geo.loading = false
    },
    { enableHighAccuracy: true, timeout: 8000 },
  )
}

function regionRoot(region: string) {
  return region.split(/[\s·]+/)[0] ?? region
}

function summary(spot: Spot) {
  switch (spot.experience) {
    case 'travel':
      return { primary: `${spot.avgWtem}° · 파고 ${spot.avgWvhgt}m`, secondary: `${spot.weather} · ${spot.tdlvHrCn}` }
    case 'swimming':
      return { primary: `${spot.avgWtem}° · 파고 ${spot.maxWvhgt}m`, secondary: spot.opnStat }
    case 'fishing':
      return { primary: `${spot.minWtem}-${spot.maxWtem}° · 파고 ${spot.maxWvhgt}m`, secondary: `${spot.seafsTgfshNm} · ${spot.tdlvHrCn}` }
    case 'scuba':
      return { primary: `${spot.minWtem}-${spot.maxWtem}° · 유속 ${spot.maxCrsp}kn`, secondary: `물때 ${spot.tdlvHrCn}` }
    case 'mudflat':
      return { primary: `${spot.minArtmp}-${spot.maxArtmp}° · ${spot.weather}`, secondary: `${spot.mdftExprnBgngTm}~${spot.mdftExprnEndTm}` }
    case 'surfing':
      return { primary: `파고 ${spot.avgWvhgt}m · 주기 ${spot.avgWvpd}s`, secondary: `등급 ${spot.grdCn}` }
  }
}

function highlight(spot: Spot) {
  switch (spot.experience) {
    case 'travel':
      return { label: '물때 / 날씨', value: `${spot.tdlvHrCn} · ${spot.weather}` }
    case 'swimming':
      return { label: '개장 여부', value: spot.opnStat }
    case 'fishing':
      return { label: '대상어 · 물때', value: `${spot.seafsTgfshNm} · ${spot.tdlvHrCn}` }
    case 'scuba':
      return { label: '물때', value: spot.tdlvHrCn }
    case 'mudflat':
      return { label: '체험 시간', value: `${spot.mdftExprnBgngTm} ~ ${spot.mdftExprnEndTm}` }
    case 'surfing':
      return { label: '권장 등급', value: spot.grdCn }
  }
}

function statsForCard(spot: Spot) {
  switch (spot.experience) {
    case 'travel':
      return [
        ['기온', `${spot.avgArtmp}°C`],
        ['수온', `${spot.avgWtem}°C`],
        ['파고', `${spot.avgWvhgt}m`],
        ['풍속', `${spot.avgWspd}m/s`],
      ]
    case 'swimming':
      return [
        ['기온', `${spot.avgArtmp}°C`],
        ['수온', `${spot.avgWtem}°C`],
        ['최고파고', `${spot.maxWvhgt}m`],
        ['최고풍속', `${spot.maxWspd}m/s`],
      ]
    case 'fishing':
      return [
        ['기온', `${spot.minArtmp}-${spot.maxArtmp}°`],
        ['수온', `${spot.minWtem}-${spot.maxWtem}°`],
        ['파고', `${spot.maxWvhgt}m`],
        ['유속', spot.maxCrsp != null ? `${spot.maxCrsp}kn` : '-'],
      ]
    case 'scuba':
      return [
        ['수온', `${spot.minWtem}-${spot.maxWtem}°`],
        ['파고', `${spot.maxWvhgt}m`],
        ['유속', `${spot.maxCrsp}kn`],
        ['물때', spot.tdlvHrCn],
      ]
    case 'mudflat':
      return [
        ['기온', `${spot.minArtmp}-${spot.maxArtmp}°`],
        ['풍속', `${spot.maxWspd}m/s`],
        ['날씨', spot.weather],
        ['체험시간', `${spot.mdftExprnBgngTm}~`],
      ]
    case 'surfing':
      return [
        ['파고', `${spot.avgWvhgt}m`],
        ['파주기', `${spot.avgWvpd}s`],
        ['풍속', `${spot.avgWspd}m/s`],
        ['수온', `${spot.avgWtem}°`],
      ]
  }
}

function detailFields(spot: Spot) {
  switch (spot.experience) {
    case 'travel':
      return [
        ['물때', spot.tdlvHrCn],
        ['날씨', spot.weather],
        ['기온', `${spot.avgArtmp}°C`],
        ['수온', `${spot.avgWtem}°C`],
        ['파고', `${spot.avgWvhgt}m`],
        ['풍속', `${spot.avgWspd}m/s`],
        ['유속', `${spot.avgCrsp}kn`],
        ['시간대', spot.predcNoonSeCd ?? '-'],
      ]
    case 'swimming':
      return [
        ['개장 여부', spot.opnStat],
        ['기온', `${spot.avgArtmp}°C`],
        ['수온', `${spot.avgWtem}°C`],
        ['최고 파고', `${spot.maxWvhgt}m`],
        ['최고 풍속', `${spot.maxWspd}m/s`],
        ['시간대', spot.predcNoonSeCd ?? '-'],
      ]
    case 'fishing':
      return [
        ['대상어', spot.seafsTgfshNm],
        ['물때', spot.tdlvHrCn],
        ['기온', `${spot.minArtmp}~${spot.maxArtmp}°C`],
        ['수온', `${spot.minWtem}~${spot.maxWtem}°C`],
        ['파고', `${spot.minWvhgt}~${spot.maxWvhgt}m`],
        ['풍속', `${spot.minWspd}~${spot.maxWspd}m/s`],
        ['유속', `${spot.minCrsp ?? 0.1}~${spot.maxCrsp ?? 0.3}kn`],
        ['시간대', spot.predcNoonSeCd ?? '-'],
      ]
    case 'scuba':
      return [
        ['물때', spot.tdlvHrCn],
        ['수온', `${spot.minWtem}~${spot.maxWtem}°C`],
        ['파고', `${spot.minWvhgt}~${spot.maxWvhgt}m`],
        ['유속', `${spot.minCrsp}~${spot.maxCrsp}kn`],
        ['시간대', spot.predcNoonSeCd ?? '-'],
      ]
    case 'mudflat':
      return [
        ['체험 시작', spot.mdftExprnBgngTm],
        ['체험 종료', spot.mdftExprnEndTm],
        ['기온', `${spot.minArtmp}~${spot.maxArtmp}°C`],
        ['풍속', `${spot.minWspd}~${spot.maxWspd}m/s`],
        ['날씨', spot.weather],
      ]
    case 'surfing':
      return [
        ['권장 등급', spot.grdCn],
        ['파고', `${spot.avgWvhgt}m`],
        ['파주기', `${spot.avgWvpd}s`],
        ['풍속', `${spot.avgWspd}m/s`],
        ['수온', `${spot.avgWtem}°C`],
        ['시간대', spot.predcNoonSeCd ?? '-'],
      ]
  }
}

function markerColor(label: IndexLabel) {
  const level = INDEX_LEVEL[label]
  if (level >= 4) return '#3b82f6'
  if (level === 3) return '#f59e0b'
  return '#ef4444'
}

function distanceLabel(spot: Spot) {
  if (!geo.loc) return null
  return `${(Math.round(haversine(geo.loc, { lat: spot.lat, lon: spot.lot }) * 10) / 10).toFixed(1)} km`
}

function loadCommunity() {
  const raw = localStorage.getItem('marinepro-community')
  if (raw) {
    community.value = JSON.parse(raw).map(normalizeStoredPost)
    return
  }
  community.value = [
    {
      id: 'seed-1',
      spotId: 'travel-jejube',
      title: '오전 산책 코스가 좋았습니다',
      content: '바람이 약하고 파고가 낮아 해안도로 이동이 편했습니다.',
      imageUrl: null,
      imageUrls: [],
      createdAt: new Date().toISOString(),
      author: '익명',
      likeCount: 0,
      liked: false,
      commentCount: 0,
      comments: [],
    },
    {
      id: 'seed-2',
      spotId: 'surf-ingu',
      title: '중급자 연습에 적당한 파도',
      content: '주기가 안정적이라 오전 타임이 특히 괜찮았습니다.',
      imageUrl: null,
      imageUrls: [],
      createdAt: new Date().toISOString(),
      author: '익명',
      likeCount: 0,
      liked: false,
      commentCount: 0,
      comments: [],
    },
  ]
  saveCommunity()
}

function normalizeStoredPost(post: CommunityPost): CommunityPost {
  const comments = post.comments ?? []
  return {
    ...post,
    commentCount: post.commentCount ?? comments.length,
    comments,
  }
}

async function loadPosts(targetSpotId: string) {
  try {
    const posts = await postApi.list(targetSpotId)
    const detailed = await Promise.allSettled(
      posts.map(async (post) => {
        const summary = mapPost(post, targetSpotId)
        const detail = await postApi.detail(summary.id)
        return { ...post, ...detail, spotId: detail.spotId ?? post.spotId ?? targetSpotId }
      }),
    )
    const existingById = new Map(community.value.map((post) => [post.id, post]))
    const mapped = posts.map((post, index) => {
      const source = detailed[index].status === 'fulfilled' ? detailed[index].value : post
      const mappedPost = mapPost(source, targetSpotId)
      const existing = existingById.get(mappedPost.id)
      return {
        ...mappedPost,
        comments: mappedPost.comments.length ? mappedPost.comments : existing?.comments ?? [],
      }
    })
    community.value = [
      ...community.value.filter((post) => post.spotId !== targetSpotId),
      ...mapped,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    saveCommunity()
  } catch (error) {
    apiState.error = apiErrorMessage(error)
  }
}

async function loadMyPosts() {
  if (!user.loggedIn) return
  try {
    const posts = await userApi.posts()
    const mapped = posts.map((post) => mapPost(post, String(post.spotId ?? '')))
    const ids = new Set(mapped.map((post) => post.id))
    community.value = [...community.value.filter((post) => !ids.has(post.id)), ...mapped]
    saveCommunity()
    apiState.error = ''
  } catch (error) {
    apiState.error = apiErrorMessage(error)
  }
}

async function loadFavoriteSpots() {
  if (!user.loggedIn) return
  try {
    const rows = await userApi.favoriteSpots(listDate.value)
    favoriteSpots.value = rows.map((row) => {
      const exp = String(row.experience) === 'seaTravel' ? 'travel' : String(row.experience)
      return normalizeSpot(row, fallbackFor(row, VALID_EXP.includes(exp as ExperienceKey) ? (exp as ExperienceKey) : 'travel'))
    })
    favoriteIds.value = new Set([...favoriteIds.value, ...favoriteSpots.value.map((spot) => spot.id)])
    apiState.error = ''
  } catch (error) {
    apiState.error = apiErrorMessage(error)
  }
}

function syncFavoriteIds(spots: Spot[]) {
  const next = new Set(favoriteIds.value)
  for (const spot of spots) {
    if (spot.favorite) next.add(spot.id)
  }
  favoriteIds.value = next
}

async function togglePost(post: CommunityPost) {
  openPostId.value = openPostId.value === post.id ? null : post.id
  if (openPostId.value !== post.id || post.comments.length) return
  try {
    post.comments = (await postApi.comments(post.id)).map(mapComment)
    saveCommunity()
    apiState.error = ''
  } catch (error) {
    apiState.error = apiErrorMessage(error)
  }
}

function saveCommunity() {
  localStorage.setItem('marinepro-community', JSON.stringify(community.value))
}

async function submitPost() {
  if (!currentSpot.value || !postForm.title.trim() || !postForm.content.trim()) return
  let imageUrls = postForm.imageUrl.trim() ? [postForm.imageUrl.trim()] : []
  if (postImageFiles.value.length) {
    try {
      imageUrls = await postApi.uploadImages(postImageFiles.value)
      apiState.error = ''
    } catch (error) {
      apiState.error = apiErrorMessage(error)
    }
  }
  const draft = {
    title: postForm.title.trim().slice(0, 120),
    content: postForm.content.trim().slice(0, 2000),
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
  }
  try {
    const created = await postApi.create(currentSpot.value.id, draft)
    community.value.unshift(mapPost({
      ...draft,
      ...created,
      spotId: created.spotId ?? currentSpot.value.id,
      writer: created.writer ?? {
        userId: user.id,
        email: user.email,
        nickname: user.name,
        profileImageUrl: user.avatarUrl,
      },
    }, currentSpot.value.id))
    apiState.error = ''
  } catch (error) {
    apiState.error = apiErrorMessage(error)
    community.value.unshift({
      id: crypto.randomUUID(),
      spotId: currentSpot.value.id,
      ...draft,
      createdAt: new Date().toISOString(),
      author: user.name,
      authorEmail: user.email,
      likeCount: 0,
      liked: false,
      commentCount: 0,
      comments: [],
    })
  }
  postForm.title = ''
  postForm.content = ''
  postForm.imageUrl = ''
  postImageFiles.value = []
  if (postImageInput.value) postImageInput.value.value = ''
  saveCommunity()
}

async function deletePost(id: string) {
  let deleteFailed = false
  try {
    await postApi.delete(id)
    apiState.error = ''
  } catch (error) {
    apiState.error = apiErrorMessage(error)
    deleteFailed = true
  }
  community.value = community.value.filter((post) => post.id !== id)
  saveCommunity()
  showToast(deleteFailed ? `로컬에서 삭제했습니다. API 오류 · ${apiState.error}` : '게시글이 삭제되었습니다.', deleteFailed ? 'error' : 'success')
}

async function submitComment(post: CommunityPost) {
  const draft = commentDrafts[post.id]?.trim()
  if (!draft) return
  try {
    const created = await postApi.createComment(post.id, { content: draft.slice(0, 1000) })
    post.comments.push(mapComment(created))
    apiState.error = ''
  } catch (error) {
    apiState.error = apiErrorMessage(error)
    post.comments.push({
      id: crypto.randomUUID(),
      content: draft.slice(0, 1000),
      createdAt: new Date().toISOString(),
      author: user.name,
    })
  }
  commentDrafts[post.id] = ''
  post.commentCount = post.comments.length
  saveCommunity()
  showToast('댓글이 등록되었습니다.')
}

async function toggleLike(post: CommunityPost) {
  if (!user.loggedIn) {
    navigate('/auth')
    return
  }
  const wasLiked = post.liked
  post.liked = !wasLiked
  post.likeCount += wasLiked ? -1 : 1
  try {
    if (wasLiked) await postApi.unlike(post.id)
    else await postApi.like(post.id)
    apiState.error = ''
    showToast(wasLiked ? '좋아요를 취소했습니다.' : '좋아요를 눌렀습니다.')
  } catch (error) {
    post.liked = wasLiked
    post.likeCount += wasLiked ? 1 : -1
    apiState.error = apiErrorMessage(error)
    showToast(apiErrorMessage(error), 'error')
  }
  saveCommunity()
}

async function editPost(post: CommunityPost) {
  const title = window.prompt('수정할 제목을 입력하세요.', post.title)?.trim()
  if (!title) return
  const content = window.prompt('수정할 내용을 입력하세요.', post.content)?.trim()
  if (!content) return
  try {
    const updated = await postApi.update(post.id, { title, content, imageUrls: post.imageUrls })
    Object.assign(post, mapPost(updated, post.spotId))
    apiState.error = ''
  } catch (error) {
    post.title = title
    post.content = content
    apiState.error = apiErrorMessage(error)
  }
  saveCommunity()
  showToast('게시글이 수정되었습니다.')
}

async function editComment(comment: CommunityComment) {
  const content = window.prompt('수정할 댓글을 입력하세요.', comment.content)?.trim()
  if (!content) return
  try {
    Object.assign(comment, mapComment(await postApi.updateComment(comment.id, { content })))
    apiState.error = ''
  } catch (error) {
    comment.content = content
    apiState.error = apiErrorMessage(error)
  }
  saveCommunity()
  showToast('댓글이 수정되었습니다.')
}

async function deleteComment(post: CommunityPost, commentId: string) {
  try {
    await postApi.deleteComment(commentId)
    apiState.error = ''
  } catch (error) {
    apiState.error = apiErrorMessage(error)
  }
  post.comments = post.comments.filter((comment) => comment.id !== commentId)
  post.commentCount = post.comments.length
  saveCommunity()
  showToast('댓글이 삭제되었습니다.')
}

function onPostImages(event: Event) {
  const input = event.target as HTMLInputElement
  postImageFiles.value = [...(input.files ?? [])].slice(0, 5)
}

async function toggleFavorite(spot: Spot) {
  if (!user.loggedIn) {
    navigate('/auth')
    return
  }
  const next = new Set(favoriteIds.value)
  const wasFavorite = next.has(spot.id)
  if (wasFavorite) next.delete(spot.id)
  else next.add(spot.id)
  favoriteIds.value = next
  try {
    if (wasFavorite) await spotApi.unfavorite(spot.id)
    else await spotApi.favorite(spot.id)
    await loadFavoriteSpots()
    apiState.error = ''
    showToast(wasFavorite ? '즐겨찾기를 해제했습니다.' : '즐겨찾기에 추가했습니다.')
  } catch (error) {
    favoriteIds.value = new Set(wasFavorite ? [...next, spot.id] : [...next].filter((id) => id !== spot.id))
    apiState.error = apiErrorMessage(error)
    showToast(apiErrorMessage(error), 'error')
  }
}

function mapPost(post: ApiPost, fallbackSpotId: string): CommunityPost {
  const imageUrls = normalizePostImageUrls(post)
  const writer = post.writer ?? post.user
  return {
    id: String(post.postId ?? post.id ?? crypto.randomUUID()),
    spotId: String(post.spotId ?? fallbackSpotId),
    title: post.title ?? '제목 없음',
    content: post.content ?? '',
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    createdAt: post.createdAt ?? new Date().toISOString(),
    author: post.author ?? post.nickname ?? writer?.nickname ?? '익명',
    authorId: post.writer?.writerId != null
      ? String(post.writer.writerId)
      : writer?.userId != null
        ? String(writer.userId)
        : undefined,
    authorEmail: writer?.email,
    likeCount: post.likeCount ?? 0,
    liked: post.liked ?? false,
    commentCount: post.commentCount ?? post.comments?.length ?? 0,
    comments: post.comments?.map(mapComment) ?? [],
  }
}

function canManagePost(post: CommunityPost) {
  if (!user.loggedIn) return false
  if (post.authorId && user.id) return post.authorId === user.id
  if (post.authorEmail) return post.authorEmail === user.email
  return post.author === user.name
}

function normalizePostImageUrls(post: ApiPost) {
  const raw = post as Record<string, unknown>
  const sources = [raw.imageUrls, raw.images, raw.postImages, raw.imageUrl, raw.thumbnailUrl]
  const urls = sources.flatMap(extractImageUrls)
  return [...new Set(urls)]
}

function extractImageUrls(value: unknown): string[] {
  if (!value) return []
  if (typeof value === 'string') {
    const normalized = normalizeImageUrl(value)
    return normalized ? [normalized] : []
  }
  if (Array.isArray(value)) return value.flatMap(extractImageUrls)
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return extractImageUrls(obj.imageUrl ?? obj.url ?? obj.path ?? obj.src)
  }
  return []
}

function normalizeImageUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed
  return new URL(trimmed, API_BASE_URL).href
}

function mapComment(comment: ApiComment): CommunityComment {
  return {
    id: String(comment.commentId ?? comment.id ?? crypto.randomUUID()),
    content: comment.content,
    createdAt: comment.createdAt ?? new Date().toISOString(),
    author: comment.author ?? comment.nickname ?? comment.writer?.nickname ?? comment.user?.nickname ?? '익명',
  }
}

function loadUser() {
  const raw = localStorage.getItem('marinepro-user')
  if (!raw) return
  try {
    const saved = JSON.parse(raw)
    user.id = saved.id || ''
    user.loggedIn = !!saved.loggedIn
    user.name = saved.name || user.name
    user.email = saved.email || user.email
    user.avatarUrl = normalizeProfileImageUrl(saved.avatarUrl)
    user.createdAt = saved.createdAt || ''
    settingsForm.displayName = user.name
  } catch {
    localStorage.removeItem('marinepro-user')
  }
}

function saveUser() {
  localStorage.setItem('marinepro-user', JSON.stringify(user))
}

function applyUser(apiUser: ApiUser, accessToken?: string) {
  if (accessToken) setAccessToken(accessToken)
  user.id = apiUser.userId != null ? String(apiUser.userId) : user.id
  user.loggedIn = true
  user.email = apiUser.email
  user.name = apiUser.nickname
  user.avatarUrl = normalizeProfileImageUrl(apiUser.profileImageUrl)
  user.createdAt = apiUser.createdAt || user.createdAt || new Date().toISOString()
  settingsForm.displayName = user.name
  saveUser()
}

async function submitAuth() {
  authMessage.value = ''
  const email = authForm.email.trim()
  const password = authForm.password
  const displayName = authForm.displayName.trim()
  if (!email.includes('@')) {
    authMessage.value = '올바른 이메일을 입력하세요.'
    return
  }
  if (password.length < 6) {
    authMessage.value = '비밀번호는 6자 이상이어야 합니다.'
    return
  }
  if (authMode.value === 'signup' && !displayName) {
    authMessage.value = '닉네임을 입력하세요.'
    return
  }

  try {
    const result = authMode.value === 'signup'
      ? await authApi.signup({ email, password, nickname: displayName.slice(0, 40) })
      : await authApi.login({ email, password })
    applyUser(result.user, result.accessToken)
    authForm.password = ''
    navigate('/')
  } catch (error) {
    authMessage.value = apiErrorMessage(error)
  }
}

function toggleAuthMode() {
  authMode.value = authMode.value === 'signin' ? 'signup' : 'signin'
  authMessage.value = ''
}

function mockOAuth(provider: string) {
  window.location.href = authApi.oauthUrl(provider.toLowerCase())
}

async function signOut() {
  try {
    await authApi.logout()
  } catch {
    clearAccessToken()
  }
  user.loggedIn = false
  saveUser()
  navigate('/')
}

async function saveProfile() {
  const name = settingsForm.displayName.trim()
  if (!name) return
  try {
    const updated = await userApi.updateMe({ nickname: name.slice(0, 40) })
    applyUser({ ...updated, email: updated.email ?? user.email, nickname: updated.nickname ?? name.slice(0, 40) })
    apiState.error = ''
    showToast('닉네임이 성공적으로 변경되었습니다.')
    return
  } catch (error) {
    apiState.error = apiErrorMessage(error)
  }
  user.name = name.slice(0, 40)
  saveUser()
  showToast('닉네임이 성공적으로 변경되었습니다.')
}

async function changePassword() {
  if (settingsForm.newPassword.length < 6) {
    showToast('비밀번호는 6자 이상이어야 합니다.', 'error')
    return
  }
  if (settingsForm.newPassword !== settingsForm.confirmPassword) {
    showToast('비밀번호가 일치하지 않습니다.', 'error')
    return
  }
  try {
    await userApi.changePassword({
      newPassword: settingsForm.newPassword,
      newPasswordConfirm: settingsForm.confirmPassword,
    })
    apiState.error = ''
    settingsForm.newPassword = ''
    settingsForm.confirmPassword = ''
    showToast('비밀번호가 성공적으로 변경되었습니다.')
  } catch (error) {
    showToast(apiErrorMessage(error), 'error')
  }
}

async function deleteAccount() {
  if (settingsForm.deleteText.trim() !== '회원탈퇴') return
  if (!settingsForm.deletePassword) {
    showToast('회원 탈퇴를 위해 현재 비밀번호를 입력하세요.', 'error')
    return
  }
  try {
    await userApi.deleteMe({ password: settingsForm.deletePassword })
    apiState.error = ''
  } catch (error) {
    showToast(apiErrorMessage(error), 'error')
    return
  }
  community.value = community.value.filter((post) => post.authorEmail !== user.email)
  saveCommunity()
  localStorage.removeItem('marinepro-user')
  clearAccessToken()
  user.id = ''
  user.loggedIn = false
  user.name = 'Marine User'
  user.email = 'demo@marinepro.kr'
  user.avatarUrl = ''
  user.createdAt = ''
  settingsForm.deletePassword = ''
  settingsForm.deleteText = ''
  showToast('회원탈퇴가 완료되었습니다.')
  navigate('/')
}

function onAvatarFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
    showToast('이미지는 5MB 이하의 이미지 파일만 업로드할 수 있습니다.', 'error')
    return
  }
  if (user.loggedIn) {
    void userApi.uploadImage(file)
      .then((result) => {
        const profileImageUrl = normalizeProfileImageUrl(result.profileImageUrl)
        if (profileImageUrl) {
          user.avatarUrl = profileImageUrl
          saveUser()
          showToast('프로필 이미지가 변경되었습니다.')
        }
      })
      .catch((error) => {
        apiState.error = apiErrorMessage(error)
        showToast(apiErrorMessage(error), 'error')
      })
  }
  const reader = new FileReader()
  reader.onload = () => {
    if (!user.avatarUrl || user.avatarUrl.startsWith('data:')) {
      user.avatarUrl = String(reader.result || '')
      saveUser()
    }
  }
  reader.readAsDataURL(file)
}

function normalizeProfileImageUrl(value?: string | null) {
  return value ? normalizeImageUrl(value) ?? '' : ''
}

function fmt(date: string) {
  const dt = new Date(date)
  return `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
}

function submitHeaderSearch() {
  allExp.value = 'travel'
  allSort.value = 'index'
  allQuery.value = headerQuery.value.trim()
  allRegion.value = undefined
  updateAllUrl()
  navigate(`/all?exp=travel&sort=index${allQuery.value ? `&q=${encodeURIComponent(allQuery.value)}` : ''}`)
}

function titleForPage() {
  if (page.value === 'all') return `전체 스팟 탐색 - MarinePro.KR`
  if (page.value === 'spot' && currentSpot.value) return `${currentSpot.value.name} - MarinePro.KR`
  if (page.value === 'auth') return '로그인 - MarinePro.KR'
  if (page.value === 'me') return '내 글 - MarinePro.KR'
  if (page.value === 'settings') return '설정 - MarinePro.KR'
  return 'MarinePro.KR - 체험별 해양 레저 지수 대시보드'
}
</script>

<template>
  <div class="app-shell">
    <Transition name="toast">
      <div v-if="toast.show" class="toast" :class="toast.tone" role="status" aria-live="polite">
        {{ toast.message }}
      </div>
    </Transition>

    <div v-if="selectedImageUrl" class="image-modal" role="dialog" aria-modal="true" aria-label="게시물 이미지 크게 보기" @click.self="closeImageModal">
      <button class="image-modal-close" type="button" aria-label="닫기" @click="closeImageModal">×</button>
      <img :src="selectedImageUrl" alt="" />
    </div>

    <nav class="site-header">
      <button class="brand" type="button" @click="navigate('/')">MARINEPRO.KR</button>
      <div class="nav-links">
        <button :class="{ active: page === 'home' }" type="button" @click="navigate('/')">대시보드</button>
        <button :class="{ active: page === 'all' }" type="button" @click="goAll()">모두 보기</button>
      </div>
      <form class="header-search" @submit.prevent="submitHeaderSearch">
        <span>Search</span>
        <input v-model="headerQuery" type="search" placeholder="스팟 또는 지역 검색..." />
      </form>
      <button v-if="!user.loggedIn" class="btn primary small" type="button" @click="navigate('/auth')">로그인</button>
      <div v-else class="profile-menu">
        <button class="avatar" type="button" aria-label="프로필 메뉴" @click="profileMenuOpen = !profileMenuOpen">
          <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="" />
          <span v-else>{{ user.name.charAt(0).toUpperCase() }}</span>
        </button>
        <div v-if="profileMenuOpen" class="profile-popover">
          <div class="profile-summary">
            <strong>{{ user.name || '사용자' }}</strong>
            <span>{{ user.email }}</span>
          </div>
          <button type="button" @click="navigate('/settings')">설정</button>
          <button type="button" @click="navigate('/me')">내 활동 보기</button>
          <button type="button" @click="signOut">로그아웃</button>
        </div>
      </div>
    </nav>

    <div v-if="apiState.loading || apiState.error" class="api-status" :class="{ error: apiState.error }">
      <span>{{ apiState.loading ? `API 연결 중 · ${API_BASE_URL}` : `API 오류 · ${apiState.error}` }}</span>
    </div>

    <main v-if="page === 'home'" class="page dashboard">
      <header class="hero">
        <div>
          <h1>체험별 해양 레저 현황</h1>
          <p>원하는 체험을 선택하면 전국 주요 스팟의 실시간 해양 지수와 기상 데이터를 맞춤형으로 분석해 드립니다.</p>
        </div>
      </header>

      <section class="picker card">
        <div>
          <span class="eyebrow">체험 선택</span>
          <h2>어떤 해양 체험을 찾으시나요?</h2>
          <p>{{ EXPERIENCE_DESC[homeExperience] }}</p>
        </div>
        <div class="date-select">
          <span>날짜 선택</span>
          <div class="date-dropdown dashboard-date" :class="{ open: openDateMenu === 'home' }">
            <button class="date-trigger" type="button" :aria-expanded="openDateMenu === 'home'" @click="openDateMenu = openDateMenu === 'home' ? null : 'home'" @keydown.escape="openDateMenu = null">
              <span>{{ homeDateLabel }}</span>
              <strong aria-hidden="true">⌄</strong>
            </button>
            <div v-if="openDateMenu === 'home'" class="date-menu" role="listbox">
              <button
                v-for="option in dateOptions"
                :key="option.value"
                class="date-option"
                :class="{ selected: option.value === selectedDate }"
                type="button"
                role="option"
                :aria-selected="option.value === selectedDate"
                @click="selectDate('home', option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
          <small>{{ homeSpots.length }}개 스팟 분석 중</small>
        </div>
        <div class="tabs">
          <button v-for="exp in VALID_EXP" :key="exp" :class="{ active: exp === homeExperience }" type="button" @click="homeExperience = exp">
            {{ EXPERIENCE_LABELS[exp] }}
          </button>
        </div>
      </section>

      <section class="section-head">
        <div>
          <h2>스팟 지도</h2>
          <p>마커를 클릭하면 상세 정보로 이동합니다.</p>
        </div>
        <div class="legend"><span class="good"></span>좋음 <span class="warn"></span>보통 <span class="bad"></span>나쁨</div>
      </section>
      <LeafletMap :spots="homeMapSpots" :height="420" :highlight-id="hoveredHomeSpotId" @navigate="(id) => navigate(`/spot/${id}`)" />

      <section class="list-head">
        <div>
          <h2>{{ EXPERIENCE_LABELS[homeExperience] }} 지수 · {{ homeDateLabel }}</h2>
          <p>{{ homeSpots.length }}개 스팟 · 상위 {{ homePreview.length }}개 표시</p>
        </div>
        <div class="list-actions">
          <div class="sort-controls">
            <button v-for="sort in VALID_SORT" :key="sort" :class="{ active: sort === homeSort }" type="button" @click="setHomeSort(sort)">
              {{ SORT_LABELS[sort] }}
            </button>
          </div>
          <button v-if="homeSort === 'distance'" class="btn outline small" type="button" @click="requestLocation">
            {{ geo.loading ? '위치 확인 중...' : geo.loc ? '내 위치 갱신' : '내 위치 사용' }}
          </button>
        </div>
      </section>

      <div class="spot-grid">
        <article
          v-for="(spot, index) in homePreview"
          :key="spot.id"
          class="spot-card"
          role="button"
          tabindex="0"
          :style="{ animationDelay: `${index * 60}ms` }"
          @click="navigate(`/spot/${spot.id}`)"
          @keydown.enter.prevent="navigate(`/spot/${spot.id}`)"
          @keydown.space.prevent="navigate(`/spot/${spot.id}`)"
          @mouseenter="hoveredHomeSpotId = spot.id"
          @mouseleave="hoveredHomeSpotId = undefined"
          @focusin="hoveredHomeSpotId = spot.id"
          @focusout="hoveredHomeSpotId = undefined"
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
          <div class="stats-grid">
            <div v-for="[label, value] in statsForCard(spot)" :key="label">
              <span>{{ label }}</span>
              <strong>{{ value }}</strong>
            </div>
          </div>
        </article>
      </div>
      <div class="center-action">
        <button class="btn outline large" type="button" @click="goAll()">모두 보기 ({{ homeSpots.length }})</button>
      </div>
    </main>

    <template v-else-if="page === 'all'">
      <section class="all-hero">
        <div :key="`copy-${allExp}`" class="all-hero-copy">
          <span class="eyebrow">Explore · 전체 스팟</span>
          <h1>{{ EXPERIENCE_LABELS[allExp] }} <span>전국 스팟</span></h1>
          <p>{{ EXPERIENCE_DESC[allExp] }} · <strong>{{ listDateLabel }}</strong> 기준</p>
        </div>
        <div :key="`metrics-${allExp}`" class="metric-grid">
          <div><span>스팟</span><strong>{{ allStats.total }}</strong></div>
          <div><span>좋음↑</span><strong class="primary-text">{{ allStats.great }}</strong></div>
          <div><span>글</span><strong>{{ allStats.totalPosts }}</strong></div>
        </div>
        <div class="tabs wide">
          <button v-for="exp in VALID_EXP" :key="exp" :class="{ active: exp === allExp }" type="button" @click="setAllExp(exp)">
            {{ EXPERIENCE_LABELS[exp] }}
          </button>
        </div>
      </section>

      <main class="page all-page">
        <div :key="`all-content-${allExp}`" class="all-content-motion">
          <button v-if="topSpot && !allQuery && !allRegion" class="top-pick" type="button" @click="navigate(`/spot/${topSpot.id}`)">
            <span>Top Pick</span>
            <small>{{ topSpot.region }}</small>
            <strong>{{ topSpot.name }}</strong>
            <p>{{ summary(topSpot).primary }} · {{ summary(topSpot).secondary }}</p>
            <em>지수 {{ topSpot.totalIndex }}</em>
          </button>

          <div class="all-layout">
            <aside class="region-panel">
              <span class="side-title">지역</span>
              <button :class="{ active: !allRegion }" type="button" @click="setAllRegion(undefined)"><span>전체</span><small>{{ allSpots.length }}</small></button>
              <button v-for="[region, count] in regions" :key="region" :class="{ active: region === allRegion }" type="button" @click="setAllRegion(region === allRegion ? undefined : region)">
                <span>{{ region }}</span><small>{{ count }}</small>
              </button>
            </aside>

            <section>
              <div class="toolbar">
                <input v-model="allQuery" type="search" placeholder="스팟 또는 지역 검색" @input="onAllQueryInput" />
                <div class="date-dropdown toolbar-date" :class="{ open: openDateMenu === 'all' }">
                  <button class="date-trigger" type="button" :aria-expanded="openDateMenu === 'all'" @click="openDateMenu = openDateMenu === 'all' ? null : 'all'" @keydown.escape="openDateMenu = null">
                    <span>{{ listDateLabel }}</span>
                    <strong aria-hidden="true">⌄</strong>
                  </button>
                  <div v-if="openDateMenu === 'all'" class="date-menu" role="listbox">
                    <button
                      v-for="option in dateOptions"
                      :key="option.value"
                      class="date-option"
                      :class="{ selected: option.value === listDate }"
                      type="button"
                      role="option"
                      :aria-selected="option.value === listDate"
                      @click="selectDate('all', option.value)"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>
                <div class="sort-controls">
                  <button v-for="sort in VALID_SORT" :key="sort" :class="{ active: sort === allSort }" type="button" @click="setAllSort(sort)">
                    {{ SORT_LABELS[sort] }}
                  </button>
                </div>
                <button v-if="allSort === 'distance'" class="btn outline small" type="button" @click="requestLocation">
                  {{ geo.loading ? '확인 중' : geo.loc ? '위치 갱신' : '내 위치' }}
                </button>
              </div>
              <div v-if="allRegion || allQuery" class="chips-row">
                <button v-if="allRegion" type="button" @click="setAllRegion(undefined)">{{ allRegion }} x</button>
                <button v-if="allQuery" type="button" @click="allQuery = ''; onAllQueryInput()">"{{ allQuery }}" x</button>
              </div>
              <div class="result-head"><span>{{ sortedAll.length }}개 결과</span><span>{{ SORT_LABELS[allSort] }}</span></div>
              <div v-if="!sortedAll.length" class="empty">일치하는 스팟이 없습니다.</div>
              <ul v-else class="spot-rows">
                <li v-for="(spot, index) in sortedAll" :key="spot.id" :style="{ animationDelay: `${Math.min(index * 24, 180)}ms` }">
                  <button type="button" @click="navigate(`/spot/${spot.id}`)">
                    <span class="row-no">{{ String(index + 1).padStart(2, '0') }}</span>
                    <span class="row-name"><small>{{ spot.region }}</small><strong>{{ spot.name }}</strong></span>
                    <span class="row-summary"><strong>{{ summary(spot).primary }}</strong><small>{{ summary(spot).secondary }}</small></span>
                    <span class="row-community">글 {{ counts[spot.id] ?? 0 }}<template v-if="allSort === 'distance' && geo.loc"> · {{ distanceLabel(spot) }}</template></span>
                    <span class="meter"><small>{{ spot.totalIndex }}</small><i :style="{ background: markerColor(spot.totalIndex) }"></i></span>
                  </button>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>
    </template>

    <main v-else-if="page === 'spot' && currentSpot" class="page detail-page">
      <button class="back-link" type="button" @click="navigate('/')">← 대시보드</button>
      <section class="detail-head">
        <div>
        <span class="eyebrow">{{ EXPERIENCE_LABELS[currentSpot.experience] }} · {{ currentSpot.region }}</span>
          <h1>{{ currentSpot.name }}</h1>
          <p>{{ currentSpot.lat.toFixed(4) }}°N · {{ currentSpot.lot.toFixed(4) }}°E · {{ currentSpot.predcYmd }}</p>
        </div>
        <div class="detail-actions">
          <button
            class="icon-action favorite-action"
            :class="{ active: favoriteIds.has(currentSpot.id) }"
            type="button"
            :aria-pressed="favoriteIds.has(currentSpot.id)"
            :aria-label="favoriteIds.has(currentSpot.id) ? '즐겨찾기 해제' : '즐겨찾기'"
            @click="toggleFavorite(currentSpot)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.8Z" />
            </svg>
          </button>
          <span class="big-chip" :class="indexTone(currentSpot.totalIndex).chip">{{ EXPERIENCE_LABELS[currentSpot.experience] }}지수 · {{ currentSpot.totalIndex }}</span>
        </div>
      </section>
      <section class="field-grid">
        <div v-for="[label, value] in detailFields(currentSpot)" :key="label">
          <span>{{ label }}</span><strong>{{ value }}</strong>
        </div>
      </section>
      <section class="analysis">
        <h2>분석 요약</h2>
        <p>현재 {{ currentSpot.name }}의 {{ EXPERIENCE_LABELS[currentSpot.experience] }} 지수는 <strong>{{ currentSpot.totalIndex }}</strong> 입니다. 실시간 KHOA 기상·해양 데이터를 기반으로 산출되었으며, 시간대별 변화에 따라 조건이 달라질 수 있습니다.</p>
      </section>
      <section>
        <div class="section-head compact">
          <div>
            <h2>위치</h2>
            <p>{{ currentSpot.lat.toFixed(4) }}°N · {{ currentSpot.lot.toFixed(4) }}°E</p>
          </div>
        </div>
        <LeafletMap class="detail-map" :spots="[currentSpot]" :focus-id="currentSpot.id" :height="360" :navigate-on-click="false" />
      </section>
      <section class="community">
        <div class="section-head compact">
          <div>
            <h2>커뮤니티</h2>
            <p>이 스팟에 대한 후기와 사진을 공유해 보세요.</p>
          </div>
        </div>
        <form v-if="user.loggedIn" class="community-form" @submit.prevent="submitPost">
          <input v-model="postForm.title" maxlength="120" placeholder="제목" />
          <textarea v-model="postForm.content" maxlength="2000" rows="3" placeholder="내용을 입력하세요"></textarea>
          <label class="file-picker">
            <input ref="postImageInput" class="visually-hidden" type="file" accept="image/*" multiple @change="onPostImages" />
            <span class="file-picker-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm0 14.4-3.5-3.5a1.5 1.5 0 0 0-2.1 0L12 15.3 8.6 11.9a1.5 1.5 0 0 0-2.1 0L5 13.4V5h14v12.4ZM8.5 9A1.5 1.5 0 1 0 8.5 6a1.5 1.5 0 0 0 0 3Z" />
              </svg>
            </span>
            <span>
              <strong>{{ postImageFiles.length ? `${postImageFiles.length}개 파일 선택됨` : '사진 선택' }}</strong>
              <small>이미지는 최대 5개까지 업로드할 수 있습니다.</small>
            </span>
          </label>
          <div v-if="postImageFiles.length" class="selected-files">
            <span v-for="file in postImageFiles" :key="`${file.name}-${file.size}`">{{ file.name }}</span>
          </div>
          <button class="btn primary" type="submit">게시글 작성</button>
        </form>
        <div v-else class="login-callout">
          <p>글을 작성하려면 로그인이 필요합니다.</p>
          <button class="btn primary small" type="button" @click="navigate('/auth')">로그인</button>
        </div>
        <div v-if="!spotPosts.length" class="empty">아직 게시글이 없습니다. 첫 글을 남겨보세요.</div>
        <article v-for="post in spotPosts" :key="post.id" class="post">
          <div class="post-head">
            <div><h3>{{ post.title }}</h3><p>{{ post.author }} · {{ fmt(post.createdAt) }}</p></div>
            <div class="post-actions">
              <button
                class="icon-action like-action"
                :class="{ active: post.liked }"
                type="button"
                :aria-pressed="post.liked"
                :aria-label="post.liked ? '좋아요 취소' : '좋아요'"
                @click="toggleLike(post)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 21.3 10.7 20C5.4 15.2 2 12.1 2 8.2 2 5.1 4.4 2.7 7.5 2.7c1.7 0 3.4.8 4.5 2.1 1.1-1.3 2.8-2.1 4.5-2.1 3.1 0 5.5 2.4 5.5 5.5 0 3.9-3.4 7-8.7 11.8L12 21.3Z" />
                </svg>
                <span>{{ post.likeCount }}</span>
              </button>
              <button
                v-if="canManagePost(post)"
                class="icon-action edit-action"
                type="button"
                aria-label="게시글 수정"
                @click="editPost(post)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 20h4.2L18.7 9.5a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Zm11.9-13.3 1.4 1.4" />
                </svg>
              </button>
              <button
                v-if="canManagePost(post)"
                class="icon-action delete-action"
                type="button"
                aria-label="게시글 삭제"
                @click="deletePost(post.id)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 7h14M10 11v6m4-6v6M9 7l1-3h4l1 3m-8 0 1 13h8l1-13" />
                </svg>
              </button>
            </div>
          </div>
          <p>{{ post.content }}</p>
          <div
            v-if="post.imageUrls.length"
            class="post-image-carousel"
            :class="{ peek: post.imageUrls.length > 2 }"
            :style="{ '--slide-index': postImageStart(post) }"
          >
            <button
              v-if="post.imageUrls.length > 2"
              class="image-slide-button prev"
              type="button"
              aria-label="이전 이미지"
              :disabled="postImageStart(post) === 0"
              @click="slidePostImages(post, -1)"
            >
              ‹
            </button>
            <div class="post-images" :class="{ single: post.imageUrls.length === 1 }">
              <button v-for="url in post.imageUrls" :key="url" class="post-image-button" type="button" aria-label="이미지 크게 보기" @click="openImageModal(url)">
                <img :src="url" alt="" loading="lazy" />
              </button>
            </div>
            <button
              v-if="post.imageUrls.length > 2"
              class="image-slide-button next"
              type="button"
              aria-label="다음 이미지"
              :disabled="postImageStart(post) >= post.imageUrls.length - 2"
              @click="slidePostImages(post, 1)"
            >
              ›
            </button>
            <span v-if="post.imageUrls.length > 2" class="image-slide-count">
              {{ postImageStart(post) + 1 }}-{{ Math.min(postImageStart(post) + 2, post.imageUrls.length) }} / {{ post.imageUrls.length }}
            </span>
          </div>
          <button class="comment-toggle" type="button" @click="togglePost(post)">
            {{ openPostId === post.id ? '댓글 숨기기' : `댓글 보기 (${post.commentCount})` }}
          </button>
          <div v-if="openPostId === post.id" class="comments">
            <p v-if="!post.comments.length" class="muted">아직 댓글이 없습니다.</p>
            <div v-for="comment in post.comments" :key="comment.id" class="comment">
              <span class="comment-avatar">{{ comment.author.charAt(0).toUpperCase() }}</span>
              <div class="comment-body">
                <div class="comment-meta"><strong>{{ comment.author }}</strong><span>{{ fmt(comment.createdAt) }}</span></div>
                <p>{{ comment.content }}</p>
                <div v-if="user.loggedIn && comment.author === user.name" class="comment-actions">
                  <button class="icon-action edit-action" type="button" aria-label="댓글 수정" @click="editComment(comment)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 20h4.2L18.7 9.5a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Zm11.9-13.3 1.4 1.4" />
                    </svg>
                  </button>
                  <button class="icon-action delete-action" type="button" aria-label="댓글 삭제" @click="deleteComment(post, comment.id)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 7h14M10 11v6m4-6v6M9 7l1-3h4l1 3m-8 0 1 13h8l1-13" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <form v-if="user.loggedIn" @submit.prevent="submitComment(post)">
              <input v-model="commentDrafts[post.id]" maxlength="1000" placeholder="댓글을 입력하세요" />
              <button class="btn primary small" type="submit">댓글</button>
            </form>
          </div>
        </article>
      </section>
    </main>

    <main v-else-if="page === 'auth'" class="page account-page">
      <section class="account-panel auth-panel">
        <h1>{{ authMode === 'signin' ? '로그인' : '회원가입' }}</h1>
        <p>커뮤니티에 글과 댓글을 남기려면 로그인이 필요합니다.</p>

        <div class="oauth-buttons">
          <button class="btn oauth google" type="button" @click="mockOAuth('Google')">
            <span class="oauth-icon google-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.2Z" />
                <path fill="#34a853" d="M12 22c2.7 0 5-0.9 6.6-2.6l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
                <path fill="#fbbc05" d="M6.4 13.7a6 6 0 0 1 0-3.4V7.7H3.1a10 10 0 0 0 0 8.6l3.3-2.6Z" />
                <path fill="#ea4335" d="M12 6.2c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.7l3.3 2.6C7.2 8 9.4 6.2 12 6.2Z" />
              </svg>
            </span>
            Google로 계속하기
          </button>
          <button class="btn oauth naver" type="button" @click="mockOAuth('Naver')">
            <span class="oauth-icon naver-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M15.2 12.4 8.5 3H3v18h5.8v-9.4l6.7 9.4H21V3h-5.8v9.4Z" />
              </svg>
            </span>
            네이버로 계속하기
          </button>
          <button class="btn oauth kakao" type="button" @click="mockOAuth('Kakao')">
            <span class="oauth-icon kakao-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 4C6.7 4 2.4 7.3 2.4 11.4c0 2.6 1.8 4.9 4.4 6.2l-.8 3c-.1.4.3.7.6.5l3.6-2.4c.6.1 1.2.2 1.8.2 5.3 0 9.6-3.3 9.6-7.5S17.3 4 12 4Z" />
              </svg>
            </span>
            카카오로 계속하기
          </button>
        </div>

        <div class="divider"><span>또는 이메일</span></div>

        <form class="account-form" @submit.prevent="submitAuth">
          <label v-if="authMode === 'signup'">
            <span>닉네임</span>
            <input v-model="authForm.displayName" maxlength="40" placeholder="커뮤니티에 표시될 이름" />
          </label>
          <label>
            <span>이메일</span>
            <input v-model="authForm.email" type="email" autocomplete="email" />
          </label>
          <label>
            <span>비밀번호</span>
            <input v-model="authForm.password" type="password" autocomplete="current-password" />
          </label>
          <p v-if="authMessage" class="form-message">{{ authMessage }}</p>
          <button class="btn primary full" type="submit">{{ authMode === 'signin' ? '로그인' : '회원가입' }}</button>
        </form>

        <p class="auth-switch">
          {{ authMode === 'signin' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?' }}
          <button type="button" @click="toggleAuthMode">{{ authMode === 'signin' ? '회원가입' : '로그인' }}</button>
        </p>

        <button class="back-link centered" type="button" @click="navigate('/')">← 대시보드로 돌아가기</button>
      </section>
    </main>

    <main v-else-if="page === 'me'" class="page account-page activity-page">
      <section v-if="!user.loggedIn" class="account-panel auth-panel">
        <h1>로그인이 필요합니다</h1>
        <p>내가 작성한 커뮤니티 글을 확인하려면 로그인하세요.</p>
        <button class="btn primary" type="button" @click="navigate('/auth')">로그인</button>
      </section>
      <section v-else class="my-page">
        <header class="account-header">
          <span class="eyebrow">내 활동</span>
          <h1>{{ user.name || '내' }}님의 활동</h1>
          <p>작성한 커뮤니티 글과 즐겨찾기 스팟을 확인할 수 있습니다.</p>
        </header>

        <div class="activity-layout">
          <section class="activity-panel favorites-panel">
            <div class="activity-panel-head">
              <div>
                <span class="side-title">Favorites</span>
                <h2>즐겨찾기 스팟</h2>
              </div>
              <strong>{{ favoriteSpots.length }}</strong>
            </div>
            <div v-if="!favoriteSpots.length" class="empty compact">아직 즐겨찾기한 스팟이 없습니다.</div>
            <div v-else class="favorite-list">
              <button v-for="spot in favoriteSpots" :key="spot.id" class="favorite-row" type="button" @click="navigate(`/spot/${spot.id}`)">
                <span class="row-name"><small>{{ EXPERIENCE_LABELS[spot.experience] }} · {{ spot.region }}</small><strong>{{ spot.name }}</strong></span>
                <span class="chip" :class="indexTone(spot.totalIndex).chip">{{ spot.totalIndex }}</span>
                <small>{{ spot.predcYmd || listDate }}</small>
              </button>
            </div>
          </section>

          <section class="activity-panel posts-panel">
            <div class="activity-panel-head">
              <div>
                <span class="side-title">Posts</span>
                <h2>내 게시물</h2>
              </div>
              <strong>{{ myPosts.length }}</strong>
            </div>
            <div v-if="!myPosts.length" class="empty compact">아직 작성한 글이 없습니다.</div>
            <div v-else class="my-post-list">
              <button v-for="post in myPosts" :key="post.id" class="my-post-card" type="button" @click="navigate(`/spot/${post.spotId}`)">
                <div class="my-post-copy">
                  <small>{{ new Date(post.createdAt).toLocaleDateString('ko-KR') }}</small>
                  <h2>{{ post.title }}</h2>
                  <span>{{ getSpot(post.spotId) ? `${EXPERIENCE_LABELS[getSpot(post.spotId)!.experience]} · ${getSpot(post.spotId)!.name}` : post.spotId }}</span>
                  <p>{{ post.content }}</p>
                </div>
                <div v-if="post.imageUrls.length" class="my-post-thumb">
                  <img :src="post.imageUrls[0]" alt="" loading="lazy" />
                  <span v-if="post.imageUrls.length > 1">+{{ post.imageUrls.length - 1 }}</span>
                </div>
              </button>
            </div>
          </section>
        </div>
      </section>
    </main>

    <main v-else-if="page === 'settings'" class="page account-page">
      <section v-if="!user.loggedIn" class="account-panel auth-panel">
        <h1>로그인이 필요합니다</h1>
        <p>프로필 정보와 보안 설정을 관리하려면 로그인하세요.</p>
        <button class="btn primary" type="button" @click="navigate('/auth')">로그인</button>
      </section>
      <section v-else class="settings-page">
        <header class="account-header">
          <span class="eyebrow">계정</span>
          <h1>설정</h1>
          <p>프로필 정보와 보안 설정을 관리합니다.</p>
        </header>

        <section class="settings-card">
          <h2>프로필</h2>
          <div class="profile-editor">
            <div class="avatar-large">
              <div class="avatar-large-frame">
                <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="" />
                <span v-else>{{ user.name.charAt(0).toUpperCase() }}</span>
              </div>
              <label aria-label="프로필 이미지 변경">
                <input type="file" accept="image/*" @change="onAvatarFile" />
                <span>카메라</span>
              </label>
            </div>
            <div>
              <strong>{{ user.name || '사용자' }}</strong>
              <p>{{ user.email }}</p>
              <small>PNG, JPG · 최대 5MB</small>
            </div>
          </div>
          <form class="account-form" @submit.prevent="saveProfile">
            <label>
              <span>닉네임</span>
              <input v-model="settingsForm.displayName" maxlength="40" />
            </label>
            <button class="btn primary" type="submit">프로필 저장</button>
          </form>
        </section>

        <section class="settings-card">
          <h2>비밀번호 변경</h2>
          <form class="account-form" @submit.prevent="changePassword">
            <label>
              <span>새 비밀번호</span>
              <input v-model="settingsForm.newPassword" type="password" autocomplete="new-password" />
            </label>
            <label>
              <span>새 비밀번호 확인</span>
              <input v-model="settingsForm.confirmPassword" type="password" autocomplete="new-password" />
            </label>
            <button class="btn primary" type="submit">비밀번호 변경</button>
          </form>
          <p class="hint">Google 등 소셜 로그인 계정은 비밀번호 변경이 적용되지 않을 수 있습니다.</p>
        </section>

        <section class="settings-card">
          <h2>계정 정보</h2>
          <dl class="account-info">
            <div><dt>이메일</dt><dd>{{ user.email }}</dd></div>
            <div><dt>가입일</dt><dd>{{ user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '-' }}</dd></div>
          </dl>
        </section>

        <section class="settings-card danger-card">
          <h2>회원탈퇴</h2>
          <p>탈퇴 시 작성하신 글, 댓글, 프로필 이미지를 포함한 모든 데이터가 삭제되며 복구할 수 없습니다.</p>
          <label class="delete-confirm">
            <span>현재 비밀번호</span>
            <input v-model="settingsForm.deletePassword" type="password" autocomplete="current-password" placeholder="현재 비밀번호" />
          </label>
          <label class="delete-confirm">
            <span>계속하려면 “회원탈퇴”를 입력하세요.</span>
            <input v-model="settingsForm.deleteText" placeholder="회원탈퇴" />
          </label>
          <button class="btn danger" type="button" :disabled="!settingsForm.deletePassword || settingsForm.deleteText.trim() !== '회원탈퇴'" @click="deleteAccount">탈퇴하기</button>
        </section>
      </section>
    </main>

    <main v-else class="page auth-page">
      <section class="card narrow">
        <h1>스팟을 찾을 수 없습니다</h1>
        <button class="link-button" type="button" @click="navigate('/')">대시보드로 돌아가기</button>
      </section>
    </main>

    <footer class="footer">
      <span>© 2026 MarinePro.KR — Specialized Maritime Forecasting</span>
      <span>DATA: KHOA · ROMS</span>
      <span>UPDATE: 09:42 KST</span>
    </footer>
  </div>
</template>
