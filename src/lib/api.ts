import axios from "axios";
import type { ExperienceKey, IndexLabel, Spot } from "./marine-data";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const ACCESS_TOKEN_KEY = "badamoyeo-access-token";
let refreshPromise: Promise<AuthResponse> | null = null;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  const url = String(config.url ?? "");
  if (token && !url.includes("/auth/")) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original.__retried && !original.url?.includes("/auth/refresh")) {
      original.__retried = true;
      try {
        refreshPromise ??= authApi.refresh().finally(() => {
          refreshPromise = null;
        });
        const refreshed = await refreshPromise;
        setAccessToken(refreshed.accessToken);
        original.headers ??= {};
        original.headers.Authorization = `Bearer ${refreshed.accessToken}`;
        return apiClient(original);
      } catch {
        clearAccessToken();
      }
    }
    return Promise.reject(error);
  },
);

export type ApiExperience = "seaTravel" | "swimming" | "mudflat" | "scuba" | "fishing" | "surfing";
export type ApiSort = "ai" | "index" | "community" | "nearby";
export type AppSort = ApiSort | "distance";
export type ApiTimeSlot = "오전" | "오후";

export interface ApiUser {
  userId?: number | string;
  email: string;
  nickname: string;
  profileImageUrl?: string | null;
  provider?: string;
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: ApiUser;
}

export interface ApiPost {
  postId?: number | string;
  id?: number | string;
  spotId?: number | string;
  title?: string;
  content?: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  thumbnailUrl?: string | null;
  createdAt?: string;
  author?: string;
  nickname?: string;
  writer?: ApiUser & { writerId?: number | string };
  user?: ApiUser;
  commentCount?: number;
  likeCount?: number;
  liked?: boolean;
  comments?: ApiComment[];
}

export interface ApiComment {
  commentId?: number | string;
  id?: number | string;
  parentCommentId?: number | string | null;
  content: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  author?: string;
  nickname?: string;
  writer?: ApiUser & { writerId?: number | string; displayName?: string; name?: string };
  user?: ApiUser;
  children?: ApiComment[];
}

export interface AiChatResponse {
  content: string;
  createdAt?: string;
}

const apiExperienceMap: Record<ExperienceKey, ApiExperience> = {
  travel: "seaTravel",
  swimming: "swimming",
  mudflat: "mudflat",
  scuba: "scuba",
  fishing: "fishing",
  surfing: "surfing",
};

const appExperienceMap: Record<string, ExperienceKey> = {
  seaTravel: "travel",
  travel: "travel",
  swimming: "swimming",
  mudflat: "mudflat",
  scuba: "scuba",
  fishing: "fishing",
  surfing: "surfing",
};

export function toApiExperience(experience: ExperienceKey): ApiExperience {
  return apiExperienceMap[experience];
}

export function toApiSort(sort: AppSort): ApiSort {
  return sort === "distance" ? "nearby" : sort;
}

export function currentApiTimeSlot(now = new Date()): ApiTimeSlot {
  return now.getHours() < 12 ? "오전" : "오후";
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token?: string) {
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  for (const key of ["items", "content", "data", "posts", "comments", "spots", "markers", "results"]) {
    const value = obj[key];
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === "object") {
      const nested = extractList<T>(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

export function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const key of ["data", "result", "body"]) {
      if (obj[key] && typeof obj[key] === "object") return obj[key] as T;
    }
  }
  return payload as T;
}

export function normalizeSpot(raw: Record<string, unknown>, fallback?: Spot, preferredTimeSlot?: ApiTimeSlot): Spot {
  const source = flattenMetrics(raw, preferredTimeSlot);
  const experience = appExperienceMap[String(pick(source, ["experience"], fallback?.experience ?? "seaTravel"))] ?? "travel";
  const totalIndex = normalizeIndex(pick(source, ["totalIndex", "index", "indexLabel", "scoreLabel"], fallback?.totalIndex));
  const base = {
    id: String(pick(source, ["spotId", "id"], fallback?.id ?? crypto.randomUUID())),
    experience,
    name: String(pick(source, ["spotName", "name"], fallback?.name ?? "이름 없는 스팟")),
    region: String(pick(source, ["region", "address", "area"], fallback?.region ?? "-")),
    lat: numberValue(pick(source, ["lat", "latitude"], fallback?.lat), 36.2),
    lot: numberValue(pick(source, ["lng", "lon", "lot", "longitude"], fallback?.lot), 127.8),
    predcYmd: String(pick(source, ["forecastDate", "targetDate", "predcYmd", "date"], fallback?.predcYmd ?? "")),
    predcNoonSeCd: normalizeTimeSlot(pick(source, ["timeSlot", "predcNoonSeCd"], fallback?.predcNoonSeCd)),
    totalIndex,
    postCount: numberValue(pick(source, ["postCount", "commentCount"], fallback?.postCount), 0),
    favorite: booleanValue(pick(source, ["favorite", "favorited", "isFavorite"], fallback?.favorite ?? false)),
    aiReason: optionalStringValue(pick(source, ["aiReason", "aiSummaryReason"], fallback?.aiReason)),
    recommendationReason: optionalStringValue(pick(source, ["recommendationReason", "aiRecommendationReason"], fallback?.recommendationReason)),
  };

  return {
    ...fallback,
    ...base,
    tdlvHrCn: stringValue(pick(source, ["tdlvHrCn", "tide", "tideStage", "tideType", "tideName", "tideLevel", "tideTime", "물때"], fallbackField(fallback, "tdlvHrCn"))),
    avgArtmp: numberValue(pick(source, ["avgArtmp", "airTemperature", "avgAirTemperature", "airTemperatureMax", "temperature", "기온"], fallbackField(fallback, "avgArtmp")), 0),
    avgWspd: numberValue(pick(source, ["avgWspd", "windSpeed", "avgWindSpeed", "windSpeedMax", "풍속"], fallbackField(fallback, "avgWspd")), 0),
    avgWtem: numberValue(pick(source, ["avgWtem", "waterTemperature", "avgWaterTemperature", "waterTemperatureMax", "수온"], fallbackField(fallback, "avgWtem")), 0),
    avgWvhgt: numberValue(pick(source, ["avgWvhgt", "waveHeight", "avgWaveHeight", "waveHeightMax", "파고"], fallbackField(fallback, "avgWvhgt")), 0),
    avgCrsp: numberValue(pick(source, ["avgCrsp", "currentSpeed", "avgCurrentSpeed", "currentSpeedMax", "currentVelocity", "avgCurrentVelocity", "flowSpeed", "avgFlowSpeed", "유속"], fallbackField(fallback, "avgCrsp")), 0),
    weather: stringValue(pick(source, ["weather", "weatherText", "sky", "날씨"], fallbackField(fallback, "weather"))),
    maxWvhgt: numberValue(pick(source, ["maxWvhgt", "maxWaveHeight", "waveHeightMax", "waveHeight", "파고"], fallbackField(fallback, "maxWvhgt")), 0),
    maxWspd: numberValue(pick(source, ["maxWspd", "maxWindSpeed", "windSpeedMax", "windSpeed", "풍속"], fallbackField(fallback, "maxWspd")), 0),
    opnStat: stringValue(pick(source, ["opnStat", "openStatus", "openingStatus", "beachOpenStatus", "개장여부"], fallbackField(fallback, "opnStat"))),
    seafsTgfshNm: stringValue(pick(source, ["seafsTgfshNm", "targetFish", "targetFishNames", "fishName", "fishNames", "fishSpecies", "targetFishName", "targetFishSpecies", "대상어"], fallbackField(fallback, "seafsTgfshNm"))),
    minWvhgt: numberValue(pick(source, ["minWvhgt", "minWaveHeight", "waveHeightMin", "waveHeight", "파고"], fallbackField(fallback, "minWvhgt")), 0),
    minWtem: numberValue(pick(source, ["minWtem", "minWaterTemperature", "waterTemperatureMin", "waterTemperature", "수온"], fallbackField(fallback, "minWtem")), 0),
    maxWtem: numberValue(pick(source, ["maxWtem", "maxWaterTemperature", "waterTemperatureMax", "waterTemperature"], fallbackField(fallback, "maxWtem")), 0),
    minArtmp: numberValue(pick(source, ["minArtmp", "minAirTemperature", "airTemperatureMin", "airTemperature", "temperature", "기온"], fallbackField(fallback, "minArtmp")), 0),
    maxArtmp: numberValue(pick(source, ["maxArtmp", "maxAirTemperature", "airTemperatureMax", "airTemperature"], fallbackField(fallback, "maxArtmp")), 0),
    minWspd: numberValue(pick(source, ["minWspd", "minWindSpeed", "windSpeedMin"], fallbackField(fallback, "minWspd")), 0),
    maxWspd: numberValue(pick(source, ["maxWspd", "maxWindSpeed", "windSpeedMax", "windSpeed"], fallbackField(fallback, "maxWspd")), 0),
    minCrsp: numberValue(pick(source, ["minCrsp", "minCurrentSpeed", "currentSpeedMin", "currentSpeed", "minCurrentVelocity", "currentVelocity", "minFlowSpeed", "flowSpeed", "유속"], fallbackField(fallback, "minCrsp")), 0),
    maxCrsp: numberValue(pick(source, ["maxCrsp", "maxCurrentSpeed", "currentSpeedMax", "currentSpeed", "maxCurrentVelocity", "currentVelocity", "maxFlowSpeed", "flowSpeed"], fallbackField(fallback, "maxCrsp")), 0),
    mdftExprnBgngTm: stringValue(pick(source, ["mdftExprnBgngTm", "mdftExprnBgnTm", "mdftExprnBeginTm", "mudflatExperienceStartTime", "mudflatExperienceBeginTime", "experienceStartTime", "experienceBeginTime", "availableStartTime", "availableBeginTime", "startTime", "beginTime", "mudflatStartTime", "mudflatBeginTime", "체험시작", "체험시작시간"], fallbackField(fallback, "mdftExprnBgngTm"))),
    mdftExprnEndTm: stringValue(pick(source, ["mdftExprnEndTm", "mudflatExperienceEndTime", "experienceEndTime", "availableEndTime", "endTime", "mudflatEndTime", "체험종료", "체험종료시간"], fallbackField(fallback, "mdftExprnEndTm"))),
    avgWvpd: numberValue(pick(source, ["avgWvpd", "wavePeriod", "avgWavePeriod", "파주기"], fallbackField(fallback, "avgWvpd")), 0),
    grdCn: stringValue(pick(source, ["grdCn", "grade", "level", "recommendedLevel", "권장등급"], fallbackField(fallback, "grdCn"))),
  } as Spot;
}

export const authApi = {
  async signup(body: { email: string; password: string; nickname: string }) {
    const { data } = await apiClient.post("/auth/signup", body);
    return unwrap<AuthResponse>(data);
  },
  async login(body: { email: string; password: string }) {
    const { data } = await apiClient.post("/auth/login", body);
    return unwrap<AuthResponse>(data);
  },
  async logout() {
    await apiClient.post("/auth/logout");
    clearAccessToken();
  },
  async refresh() {
    const { data } = await apiClient.post("/auth/refresh");
    return unwrap<AuthResponse>(data);
  },
  oauthUrl(provider: string) {
    return `${API_BASE_URL}/auth/oauth/${provider}`;
  },
};

export const userApi = {
  async me() {
    const { data } = await apiClient.get("/users/me");
    return unwrap<ApiUser>(data);
  },
  async updateMe(body: { nickname: string }) {
    const { data } = await apiClient.patch("/users/me", body);
    return unwrap<ApiUser>(data);
  },
  async uploadImage(file: File) {
    const form = new FormData();
    form.append("image", file);
    const { data } = await apiClient.post("/users/me/image", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap<{ profileImageUrl?: string }>(data);
  },
  async changePassword(body: { newPassword: string; newPasswordConfirm: string }) {
    await apiClient.patch("/users/me/password", body);
  },
  async posts() {
    const { data } = await apiClient.get("/users/me/posts", { params: { page: 1, pageSize: 50 } });
    return extractList<ApiPost>(data);
  },
  async favoriteSpots(targetDate: string) {
    const { data } = await apiClient.get("/users/me/favorite-spots", { params: { page: 1, pageSize: 50, targetDate } });
    return extractList<Record<string, unknown>>(data);
  },
  async deleteMe(body: { password: string }) {
    await apiClient.delete("/users/me", { data: body });
    clearAccessToken();
  },
};

export const spotApi = {
  async dashboard(experience: ExperienceKey, targetDate: string, sort: AppSort, limit = 6, loc?: { lat: number; lon: number } | null) {
    const { data } = await apiClient.get("/dashboard", {
      params: paramsWithLocation({ experience: toApiExperience(experience), targetDate, sort: toApiSort(sort), limit }, loc),
    });
    return extractList<Record<string, unknown>>(data);
  },
  async markers(experience: ExperienceKey, targetDate: string, timeSlot?: ApiTimeSlot) {
    const params = { experience: toApiExperience(experience), targetDate, ...(timeSlot ? { timeSlot } : {}) };
    const { data } = await apiClient.get("/dashboard/markers", {
      params,
    });
    return extractList<Record<string, unknown>>(data);
  },
  async list(experience: ExperienceKey, targetDate: string, sort: AppSort, keyword = "", loc?: { lat: number; lon: number } | null) {
    const { data } = await apiClient.get("/spots", {
      params: paramsWithLocation({ experience: toApiExperience(experience), targetDate, sort: toApiSort(sort), keyword, page: 1, pageSize: 100 }, loc),
    });
    return extractList<Record<string, unknown>>(data);
  },
  async detail(spotId: string, targetDate: string) {
    const { data } = await apiClient.get(`/spots/${spotId}`, { params: { targetDate } });
    return unwrap<Record<string, unknown>>(data);
  },
  async favorite(spotId: string) {
    await apiClient.post(`/spots/${spotId}/favorite`);
  },
  async unfavorite(spotId: string) {
    await apiClient.delete(`/spots/${spotId}/favorite`);
  },
};

export const aiApi = {
  async chat(message: string) {
    const { data } = await apiClient.post("/ai/chat-completions", { message });
    return unwrap<AiChatResponse>(data);
  },
};

export const postApi = {
  async list(spotId: string) {
    const { data } = await apiClient.get(`/spots/${spotId}/posts`, { params: { page: 1, pageSize: 50 } });
    return extractList<ApiPost>(data);
  },
  async create(spotId: string, body: { title: string; content: string; imageUrl?: string | null; imageUrls?: string[] }) {
    const { data } = await apiClient.post(`/spots/${spotId}/posts`, body);
    return unwrap<ApiPost>(data);
  },
  async uploadImages(files: File[]) {
    const form = new FormData();
    for (const file of files) form.append("images", file);
    const { data } = await apiClient.post("/posts/images", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap<{ imageUrls: string[] }>(data).imageUrls ?? [];
  },
  async detail(postId: string) {
    const { data } = await apiClient.get(`/posts/${postId}`);
    return unwrap<ApiPost>(data);
  },
  async update(postId: string, body: { title: string; content: string; imageUrls: string[] }) {
    const { data } = await apiClient.patch(`/posts/${postId}`, body);
    return unwrap<ApiPost>(data);
  },
  async delete(postId: string) {
    await apiClient.delete(`/posts/${postId}`);
  },
  async like(postId: string) {
    await apiClient.post(`/posts/${postId}/likes`);
  },
  async unlike(postId: string) {
    await apiClient.delete(`/posts/${postId}/likes`);
  },
  async comments(postId: string) {
    const { data } = await apiClient.get(`/posts/${postId}/comments`);
    return extractList<ApiComment>(data);
  },
  async createComment(postId: string, body: { content: string; parentCommentId?: string | null }) {
    const { data } = await apiClient.post(`/posts/${postId}/comments`, body);
    return unwrap<ApiComment>(data);
  },
  async updateComment(commentId: string, body: { content: string }) {
    const { data } = await apiClient.patch(`/comments/${commentId}`, body);
    return unwrap<ApiComment>(data);
  },
  async deleteComment(commentId: string) {
    await apiClient.delete(`/comments/${commentId}`);
  },
};

function paramsWithLocation(params: Record<string, unknown>, loc?: { lat: number; lon: number } | null) {
  if (!loc) return params;
  return { ...params, userLat: loc.lat, userLng: loc.lon };
}

function flattenMetrics(raw: Record<string, unknown>, preferredTimeSlot?: ApiTimeSlot) {
  const metrics = raw.metrics && typeof raw.metrics === "object" ? (raw.metrics as Record<string, unknown>) : {};
  const rawItem = firstItem(raw);
  const metricItem = firstItem(metrics);
  const forecast = selectedForecast(raw.forecasts, preferredTimeSlot);
  const forecastMetrics = objectValue(forecast.metrics);
  return {
    ...collectScalars(raw),
    ...collectScalars(metrics),
    ...collectScalars(rawItem),
    ...collectScalars(metricItem),
    ...collectScalars(forecast),
    ...collectScalars(forecastMetrics),
    ...raw,
    ...metrics,
    ...rawItem,
    ...metricItem,
    ...forecast,
    ...forecastMetrics,
  };
}

function selectedForecast(value: unknown, preferredTimeSlot?: ApiTimeSlot): Record<string, unknown> {
  if (!Array.isArray(value)) return {};
  const forecasts = value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)));
  if (!forecasts.length) return {};
  const matches = preferredTimeSlot ? forecasts.filter((forecast) => normalizeTimeSlot(forecast.timeSlot) === preferredTimeSlot) : [forecasts[0]];
  const selected = matches.length ? matches : [forecasts[0]];
  return mergeForecasts(selected);
}

function mergeForecasts(forecasts: Record<string, unknown>[]) {
  const merged: Record<string, unknown> = {};
  const mergedMetrics: Record<string, unknown> = {};
  const targetFish = new Set<string>();

  for (const forecast of forecasts) {
    const metrics = objectValue(forecast.metrics);
    Object.assign(merged, forecast);
    Object.assign(mergedMetrics, metrics);
    const fish = metrics.targetFish ?? forecast.targetFish;
    if (fish !== undefined && fish !== null && fish !== "") targetFish.add(String(fish));
  }

  if (targetFish.size) mergedMetrics.targetFish = [...targetFish].join(", ");
  return { ...merged, metrics: mergedMetrics };
}

function pick(source: Record<string, unknown>, keys: string[], fallback?: unknown) {
  const normalizedSource = normalizedEntries(source);
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
    const normalizedValue = normalizedSource[normalizeKey(key)];
    if (normalizedValue !== undefined && normalizedValue !== null && normalizedValue !== "") return normalizedValue;
  }
  return fallback;
}

function collectScalars(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  if (Array.isArray(value)) return collectScalars(value[0]);
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (child && typeof child === "object") {
      Object.assign(out, collectScalars(child));
    } else {
      out[key] = child;
    }
  }
  return out;
}

function firstItem(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  if (Array.isArray(value)) return objectValue(value[0]);
  const obj = value as Record<string, unknown>;
  const candidates = [
    obj.item,
    obj.items,
    objectValue(obj.items).item,
    obj.data,
    objectValue(obj.data).item,
    objectValue(obj.data).items,
  ];
  for (const candidate of candidates) {
    const found = Array.isArray(candidate) ? candidate[0] : candidate;
    if (found && typeof found === "object") return found as Record<string, unknown>;
  }
  return {};
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizedEntries(source: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    out[normalizeKey(key)] = value;
  }
  return out;
}

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}

function normalizeIndex(value: unknown): IndexLabel {
  if (typeof value === "number") {
    if (value >= 80) return "매우좋음";
    if (value >= 60) return "좋음";
    if (value >= 40) return "보통";
    if (value >= 20) return "나쁨";
    return "매우나쁨";
  }
  const text = String(value ?? "보통");
  if (["매우좋음", "좋음", "보통", "나쁨", "매우나쁨"].includes(text)) return text as IndexLabel;
  if (["excellent", "veryGood", "VERY_GOOD"].includes(text)) return "매우좋음";
  if (["good", "GOOD"].includes(text)) return "좋음";
  if (["bad", "BAD"].includes(text)) return "나쁨";
  if (["veryBad", "VERY_BAD"].includes(text)) return "매우나쁨";
  return "보통";
}

function numberValue(value: unknown, fallback: number) {
  const num = typeof value === "string" ? Number(value.replace(/[^\d.-]/g, "")) : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function stringValue(value: unknown) {
  return value === undefined || value === null || value === "" ? "-" : String(value);
}

function optionalStringValue(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const text = String(value).trim();
  return text && text !== "-" ? text : undefined;
}

function booleanValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

function normalizeTimeSlot(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const text = String(value);
  if (text === "AM" || text.toLowerCase() === "morning" || text.includes("오전")) return "오전";
  if (text === "PM" || text.toLowerCase() === "afternoon" || text.includes("오후")) return "오후";
  return text as Spot["predcNoonSeCd"];
}

function fallbackField(spot: Spot | undefined, key: string) {
  return spot ? (spot as unknown as Record<string, unknown>)[key] : undefined;
}
