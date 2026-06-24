// Experience-driven data model aligned with KHOA marine leisure API schemas.

export type ExperienceKey =
  | "travel"
  | "surfing"
  | "fishing"
  | "scuba"
  | "mudflat"
  | "swimming";

export const EXPERIENCE_LABELS: Record<ExperienceKey, string> = {
  travel: "바다 여행",
  surfing: "서핑",
  fishing: "바다 낚시",
  scuba: "스킨스쿠버",
  mudflat: "갯벌 체험",
  swimming: "해수욕",
};

export const EXPERIENCE_DESC: Record<ExperienceKey, string> = {
  travel: "전국 해안 여행지의 종합 기상·해양 지수",
  surfing: "파고·파주기·풍속 기반의 서핑 적합도",
  fishing: "물때·수온·대상어 정보 기반 낚시 지수",
  scuba: "수온·유속·파고로 평가한 스쿠버 다이빙 지수",
  mudflat: "갯벌 체험장 운영 시간과 기상 조건",
  swimming: "해수욕장 개장 여부와 기상·파고",
};

export type IndexLabel =
  | "매우좋음"
  | "좋음"
  | "보통"
  | "나쁨"
  | "매우나쁨";

export const INDEX_LEVEL: Record<IndexLabel, 1 | 2 | 3 | 4 | 5> = {
  매우나쁨: 1,
  나쁨: 2,
  보통: 3,
  좋음: 4,
  매우좋음: 5,
};

export interface BaseSpot {
  id: string;
  experience: ExperienceKey;
  name: string;
  region: string;
  lat: number;
  lot: number;
  predcYmd: string;
  predcNoonSeCd?: "오전" | "오후";
  totalIndex: IndexLabel;
  postCount?: number;
  favorite?: boolean;
  recommendationReason?: string;
}

export interface TravelSpot extends BaseSpot {
  experience: "travel";
  tdlvHrCn: string;
  avgArtmp: number;
  avgWspd: number;
  avgWtem: number;
  avgWvhgt: number;
  avgCrsp: number;
  weather: string;
}

export interface SwimmingSpot extends BaseSpot {
  experience: "swimming";
  maxWvhgt: number;
  avgWtem: number;
  avgArtmp: number;
  maxWspd: number;
  opnStat: "개장" | "미개장";
}

export interface FishingSpot extends BaseSpot {
  experience: "fishing";
  seafsTgfshNm: string;
  tdlvHrCn: string;
  minWvhgt: number;
  maxWvhgt: number;
  minWtem: number;
  maxWtem: number;
  minArtmp: number;
  maxArtmp: number;
  minWspd: number;
  maxWspd: number;
  minCrsp?: number;
  maxCrsp?: number;
}

export interface MudflatSpot extends BaseSpot {
  experience: "mudflat";
  mdftExprnBgngTm: string;
  mdftExprnEndTm: string;
  minArtmp: number;
  maxArtmp: number;
  minWspd: number;
  maxWspd: number;
  weather: string;
}

export interface ScubaSpot extends BaseSpot {
  experience: "scuba";
  tdlvHrCn: string;
  minWvhgt: number;
  maxWvhgt: number;
  minCrsp: number;
  maxCrsp: number;
  minWtem: number;
  maxWtem: number;
}

export interface SurfingSpot extends BaseSpot {
  experience: "surfing";
  avgWvhgt: number;
  avgWvpd: number;
  avgWspd: number;
  avgWtem: number;
  grdCn: "입문" | "초급" | "중급" | "상급";
}

export type Spot =
  | TravelSpot
  | SwimmingSpot
  | FishingSpot
  | MudflatSpot
  | ScubaSpot
  | SurfingSpot;

const TODAY = "2026-05-30";

export const SPOTS_BY_EXPERIENCE: {
  travel: TravelSpot[];
  surfing: SurfingSpot[];
  fishing: FishingSpot[];
  scuba: ScubaSpot[];
  mudflat: MudflatSpot[];
  swimming: SwimmingSpot[];
} = {
  travel: [
    { id: "travel-jejube", experience: "travel", name: "제주 북동", region: "제주 · 남해안", lat: 33.5430, lot: 126.6692, predcYmd: TODAY, predcNoonSeCd: "오전", tdlvHrCn: "소조기", avgArtmp: 19.8, avgWspd: 2.2, avgWtem: 18.4, avgWvhgt: 0.4, avgCrsp: 0.2, weather: "맑음", totalIndex: "매우좋음" },
    { id: "travel-busan", experience: "travel", name: "부산 해운대", region: "부산 · 남해안", lat: 35.1587, lot: 129.1604, predcYmd: TODAY, predcNoonSeCd: "오전", tdlvHrCn: "중조기", avgArtmp: 21.4, avgWspd: 3.1, avgWtem: 19.6, avgWvhgt: 0.7, avgCrsp: 0.3, weather: "구름조금", totalIndex: "좋음" },
    { id: "travel-yangyang", experience: "travel", name: "양양 동해안", region: "강원 · 동해안", lat: 38.0203, lot: 128.7039, predcYmd: TODAY, predcNoonSeCd: "오전", tdlvHrCn: "대조기", avgArtmp: 17.2, avgWspd: 4.4, avgWtem: 16.1, avgWvhgt: 1.1, avgCrsp: 0.5, weather: "흐림", totalIndex: "보통" },
    { id: "travel-boryeong", experience: "travel", name: "보령 대천", region: "충남 · 서해안", lat: 36.3169, lot: 126.5113, predcYmd: TODAY, predcNoonSeCd: "오후", tdlvHrCn: "대조기", avgArtmp: 18.6, avgWspd: 2.8, avgWtem: 16.8, avgWvhgt: 0.5, avgCrsp: 0.2, weather: "맑음", totalIndex: "매우좋음" },
    { id: "travel-pohang", experience: "travel", name: "포항 영일대", region: "경북 · 동해안", lat: 36.0560, lot: 129.3780, predcYmd: TODAY, predcNoonSeCd: "오전", tdlvHrCn: "소조기", avgArtmp: 19.1, avgWspd: 3.4, avgWtem: 17.0, avgWvhgt: 0.9, avgCrsp: 0.3, weather: "구름많음", totalIndex: "좋음" },
    { id: "travel-incheon", experience: "travel", name: "인천 무의도", region: "인천 · 서해안", lat: 37.4222, lot: 126.4286, predcYmd: TODAY, predcNoonSeCd: "오후", tdlvHrCn: "중조기", avgArtmp: 17.8, avgWspd: 2.5, avgWtem: 15.9, avgWvhgt: 0.3, avgCrsp: 0.1, weather: "맑음", totalIndex: "좋음" },
    { id: "travel-tongyeong", experience: "travel", name: "통영 한산도", region: "경남 · 남해안", lat: 34.7841, lot: 128.4900, predcYmd: TODAY, predcNoonSeCd: "오전", tdlvHrCn: "대조기", avgArtmp: 20.5, avgWspd: 2.0, avgWtem: 18.9, avgWvhgt: 0.4, avgCrsp: 0.2, weather: "맑음", totalIndex: "매우좋음" },
    { id: "travel-sokcho", experience: "travel", name: "속초 외옹치", region: "강원 · 동해안", lat: 38.1900, lot: 128.6000, predcYmd: TODAY, predcNoonSeCd: "오후", tdlvHrCn: "소조기", avgArtmp: 16.9, avgWspd: 5.1, avgWtem: 15.4, avgWvhgt: 1.4, avgCrsp: 0.6, weather: "흐림", totalIndex: "보통" },
  ],
  surfing: [
    { id: "surf-jukdo", experience: "surfing", name: "죽도해변", region: "강원 양양", lat: 38.0203, lot: 128.7039, predcYmd: TODAY, predcNoonSeCd: "오전", avgWvhgt: 1.9, avgWvpd: 7.3, avgWspd: 3.6, avgWtem: 17.4, grdCn: "초급", totalIndex: "좋음" },
    { id: "surf-ingu", experience: "surfing", name: "인구해변", region: "강원 양양", lat: 38.0103, lot: 128.7100, predcYmd: TODAY, predcNoonSeCd: "오전", avgWvhgt: 2.4, avgWvpd: 8.6, avgWspd: 5.2, avgWtem: 17.0, grdCn: "중급", totalIndex: "매우좋음" },
    { id: "surf-songjeong", experience: "surfing", name: "송정해수욕장", region: "부산", lat: 35.1786, lot: 129.1997, predcYmd: TODAY, predcNoonSeCd: "오후", avgWvhgt: 1.2, avgWvpd: 6.1, avgWspd: 3.0, avgWtem: 19.2, grdCn: "입문", totalIndex: "좋음" },
    { id: "surf-jungmun", experience: "surfing", name: "중문 색달", region: "제주", lat: 33.2466, lot: 126.4099, predcYmd: TODAY, predcNoonSeCd: "오전", avgWvhgt: 2.1, avgWvpd: 9.1, avgWspd: 6.2, avgWtem: 19.7, grdCn: "상급", totalIndex: "매우좋음" },
    { id: "surf-manripo", experience: "surfing", name: "만리포해변", region: "충남 태안", lat: 36.7822, lot: 126.1530, predcYmd: TODAY, predcNoonSeCd: "오후", avgWvhgt: 0.7, avgWvpd: 4.8, avgWspd: 2.4, avgWtem: 16.2, grdCn: "입문", totalIndex: "보통" },
    { id: "surf-naksan", experience: "surfing", name: "낙산해변", region: "강원 양양", lat: 38.1254, lot: 128.6291, predcYmd: TODAY, predcNoonSeCd: "오전", avgWvhgt: 1.6, avgWvpd: 6.9, avgWspd: 4.0, avgWtem: 16.8, grdCn: "초급", totalIndex: "좋음" },
    { id: "surf-hado", experience: "surfing", name: "하도해변", region: "제주", lat: 33.5210, lot: 126.8650, predcYmd: TODAY, predcNoonSeCd: "오후", avgWvhgt: 0.9, avgWvpd: 5.4, avgWspd: 2.0, avgWtem: 19.5, grdCn: "입문", totalIndex: "보통" },
    { id: "surf-gangmun", experience: "surfing", name: "강문해변", region: "강원 강릉", lat: 37.7950, lot: 128.9180, predcYmd: TODAY, predcNoonSeCd: "오전", avgWvhgt: 1.4, avgWvpd: 6.2, avgWspd: 3.3, avgWtem: 16.9, grdCn: "초급", totalIndex: "좋음" },
  ],
  fishing: [
    { id: "fish-sangwangdeung", experience: "fishing", name: "상왕등도", region: "전북 부안", lat: 35.6668, lot: 126.1108, predcYmd: TODAY, predcNoonSeCd: "오전", seafsTgfshNm: "우럭", tdlvHrCn: "소조기", minWvhgt: 0.1, maxWvhgt: 0.5, minWtem: 16, maxWtem: 17, minArtmp: 18, maxArtmp: 22, minWspd: 1.0, maxWspd: 3.0, totalIndex: "좋음" },
    { id: "fish-gageo", experience: "fishing", name: "가거도", region: "전남 신안", lat: 34.0667, lot: 125.1167, predcYmd: TODAY, predcNoonSeCd: "오전", seafsTgfshNm: "참돔", tdlvHrCn: "대조기", minWvhgt: 0.4, maxWvhgt: 1.2, minWtem: 18, maxWtem: 19, minArtmp: 19, maxArtmp: 23, minWspd: 2.0, maxWspd: 5.0, totalIndex: "매우좋음" },
    { id: "fish-ulleung", experience: "fishing", name: "울릉도 저동", region: "경북 울릉", lat: 37.4920, lot: 130.9000, predcYmd: TODAY, predcNoonSeCd: "오후", seafsTgfshNm: "오징어", tdlvHrCn: "중조기", minWvhgt: 0.5, maxWvhgt: 1.5, minWtem: 15, maxWtem: 16, minArtmp: 16, maxArtmp: 20, minWspd: 3.0, maxWspd: 6.5, totalIndex: "보통" },
    { id: "fish-gukdo", experience: "fishing", name: "국도", region: "경남 통영", lat: 34.4970, lot: 128.4670, predcYmd: TODAY, predcNoonSeCd: "오전", seafsTgfshNm: "감성돔", tdlvHrCn: "소조기", minWvhgt: 0.2, maxWvhgt: 0.6, minWtem: 18, maxWtem: 19, minArtmp: 19, maxArtmp: 22, minWspd: 1.5, maxWspd: 3.5, totalIndex: "좋음" },
    { id: "fish-marado", experience: "fishing", name: "마라도", region: "제주", lat: 33.1180, lot: 126.2670, predcYmd: TODAY, predcNoonSeCd: "오전", seafsTgfshNm: "벵에돔", tdlvHrCn: "대조기", minWvhgt: 0.6, maxWvhgt: 1.4, minWtem: 19, maxWtem: 20, minArtmp: 20, maxArtmp: 23, minWspd: 4.0, maxWspd: 7.0, totalIndex: "보통" },
    { id: "fish-baekryeong", experience: "fishing", name: "백령도", region: "인천", lat: 37.9690, lot: 124.6890, predcYmd: TODAY, predcNoonSeCd: "오후", seafsTgfshNm: "광어", tdlvHrCn: "중조기", minWvhgt: 0.3, maxWvhgt: 0.9, minWtem: 14, maxWtem: 15, minArtmp: 15, maxArtmp: 19, minWspd: 2.5, maxWspd: 5.0, totalIndex: "좋음" },
    { id: "fish-hong", experience: "fishing", name: "홍도", region: "전남 신안", lat: 34.6850, lot: 125.1990, predcYmd: TODAY, predcNoonSeCd: "오전", seafsTgfshNm: "농어", tdlvHrCn: "소조기", minWvhgt: 0.2, maxWvhgt: 0.7, minWtem: 17, maxWtem: 18, minArtmp: 18, maxArtmp: 22, minWspd: 1.5, maxWspd: 3.5, totalIndex: "매우좋음" },
    { id: "fish-yokji", experience: "fishing", name: "욕지도", region: "경남 통영", lat: 34.6210, lot: 128.2620, predcYmd: TODAY, predcNoonSeCd: "오후", seafsTgfshNm: "쥐노래미", tdlvHrCn: "대조기", minWvhgt: 0.5, maxWvhgt: 1.1, minWtem: 18, maxWtem: 19, minArtmp: 19, maxArtmp: 22, minWspd: 3.0, maxWspd: 5.5, totalIndex: "좋음" },
  ],
  scuba: [
    { id: "scuba-dongmyeong", experience: "scuba", name: "동명항", region: "강원 속초", lat: 38.2097, lot: 128.6136, predcYmd: TODAY, predcNoonSeCd: "오전", tdlvHrCn: "5물", minWvhgt: 0.1, maxWvhgt: 0.9, minCrsp: 0.1, maxCrsp: 0.5, minWtem: 16.3, maxWtem: 16.8, totalIndex: "좋음" },
    { id: "scuba-seongsan", experience: "scuba", name: "성산포", region: "제주", lat: 33.4730, lot: 126.9270, predcYmd: TODAY, predcNoonSeCd: "오전", tdlvHrCn: "8물", minWvhgt: 0.3, maxWvhgt: 1.1, minCrsp: 0.2, maxCrsp: 0.7, minWtem: 19.2, maxWtem: 19.8, totalIndex: "매우좋음" },
    { id: "scuba-munseom", experience: "scuba", name: "문섬", region: "제주 서귀포", lat: 33.2280, lot: 126.5670, predcYmd: TODAY, predcNoonSeCd: "오후", tdlvHrCn: "4물", minWvhgt: 0.2, maxWvhgt: 0.8, minCrsp: 0.1, maxCrsp: 0.4, minWtem: 19.5, maxWtem: 20.1, totalIndex: "매우좋음" },
    { id: "scuba-yangji", experience: "scuba", name: "양지리 해안", region: "강원 양양", lat: 38.0500, lot: 128.6800, predcYmd: TODAY, predcNoonSeCd: "오전", tdlvHrCn: "6물", minWvhgt: 0.4, maxWvhgt: 1.4, minCrsp: 0.3, maxCrsp: 0.8, minWtem: 15.8, maxWtem: 16.4, totalIndex: "보통" },
    { id: "scuba-bijindo", experience: "scuba", name: "비진도", region: "경남 통영", lat: 34.6790, lot: 128.4730, predcYmd: TODAY, predcNoonSeCd: "오전", tdlvHrCn: "5물", minWvhgt: 0.2, maxWvhgt: 0.7, minCrsp: 0.1, maxCrsp: 0.4, minWtem: 18.6, maxWtem: 19.2, totalIndex: "좋음" },
    { id: "scuba-uljin", experience: "scuba", name: "후포항", region: "경북 울진", lat: 36.6800, lot: 129.4500, predcYmd: TODAY, predcNoonSeCd: "오후", tdlvHrCn: "3물", minWvhgt: 0.3, maxWvhgt: 1.0, minCrsp: 0.2, maxCrsp: 0.6, minWtem: 16.1, maxWtem: 16.6, totalIndex: "좋음" },
  ],
  mudflat: [
    { id: "mud-sinri", experience: "mudflat", name: "신리마을", region: "전남 무안", lat: 35.0510, lot: 126.3760, predcYmd: TODAY, mdftExprnBgngTm: "10:50", mdftExprnEndTm: "12:50", minArtmp: 16.9, maxArtmp: 21.6, minWspd: 2.9, maxWspd: 6.0, weather: "구름많음", totalIndex: "좋음" },
    { id: "mud-daecheon", experience: "mudflat", name: "대천 갯벌", region: "충남 보령", lat: 36.3169, lot: 126.5113, predcYmd: TODAY, mdftExprnBgngTm: "09:30", mdftExprnEndTm: "12:00", minArtmp: 17.5, maxArtmp: 22.4, minWspd: 1.8, maxWspd: 4.2, weather: "맑음", totalIndex: "매우좋음" },
    { id: "mud-muuido", experience: "mudflat", name: "무의도 하나개", region: "인천", lat: 37.4222, lot: 126.4286, predcYmd: TODAY, mdftExprnBgngTm: "11:10", mdftExprnEndTm: "13:40", minArtmp: 16.2, maxArtmp: 20.1, minWspd: 2.2, maxWspd: 5.0, weather: "맑음", totalIndex: "매우좋음" },
    { id: "mud-jeungdo", experience: "mudflat", name: "증도 갯벌", region: "전남 신안", lat: 34.9670, lot: 126.1670, predcYmd: TODAY, mdftExprnBgngTm: "10:20", mdftExprnEndTm: "12:30", minArtmp: 17.0, maxArtmp: 21.0, minWspd: 2.5, maxWspd: 4.8, weather: "구름조금", totalIndex: "좋음" },
    { id: "mud-yeongheung", experience: "mudflat", name: "영흥도 십리포", region: "인천 옹진", lat: 37.2570, lot: 126.4900, predcYmd: TODAY, mdftExprnBgngTm: "12:00", mdftExprnEndTm: "14:30", minArtmp: 16.5, maxArtmp: 20.4, minWspd: 3.0, maxWspd: 5.5, weather: "흐림", totalIndex: "보통" },
    { id: "mud-buan", experience: "mudflat", name: "고사포 갯벌", region: "전북 부안", lat: 35.6720, lot: 126.4790, predcYmd: TODAY, mdftExprnBgngTm: "10:40", mdftExprnEndTm: "13:00", minArtmp: 17.2, maxArtmp: 21.8, minWspd: 2.0, maxWspd: 4.5, weather: "맑음", totalIndex: "좋음" },
  ],
  swimming: [
    { id: "swim-daecheon", experience: "swimming", name: "대천해수욕장", region: "충남 보령", lat: 36.3169, lot: 126.5113, predcYmd: TODAY, predcNoonSeCd: "오전", maxWvhgt: 0.6, avgWtem: 16.4, avgArtmp: 19.5, maxWspd: 4.8, opnStat: "개장", totalIndex: "보통" },
    { id: "swim-haeundae", experience: "swimming", name: "해운대해수욕장", region: "부산", lat: 35.1587, lot: 129.1604, predcYmd: TODAY, predcNoonSeCd: "오후", maxWvhgt: 1.0, avgWtem: 19.6, avgArtmp: 21.4, maxWspd: 4.0, opnStat: "개장", totalIndex: "좋음" },
    { id: "swim-gyeongpo", experience: "swimming", name: "경포해수욕장", region: "강원 강릉", lat: 37.7950, lot: 128.9180, predcYmd: TODAY, predcNoonSeCd: "오전", maxWvhgt: 1.4, avgWtem: 16.0, avgArtmp: 18.2, maxWspd: 5.4, opnStat: "미개장", totalIndex: "나쁨" },
    { id: "swim-hamdeok", experience: "swimming", name: "함덕해수욕장", region: "제주", lat: 33.5430, lot: 126.6692, predcYmd: TODAY, predcNoonSeCd: "오전", maxWvhgt: 0.5, avgWtem: 20.1, avgArtmp: 22.0, maxWspd: 3.2, opnStat: "개장", totalIndex: "매우좋음" },
    { id: "swim-naksan", experience: "swimming", name: "낙산해수욕장", region: "강원 양양", lat: 38.1254, lot: 128.6291, predcYmd: TODAY, predcNoonSeCd: "오후", maxWvhgt: 1.2, avgWtem: 16.6, avgArtmp: 19.0, maxWspd: 4.6, opnStat: "미개장", totalIndex: "보통" },
    { id: "swim-mallipo", experience: "swimming", name: "만리포해수욕장", region: "충남 태안", lat: 36.7822, lot: 126.1530, predcYmd: TODAY, predcNoonSeCd: "오전", maxWvhgt: 0.7, avgWtem: 16.8, avgArtmp: 19.2, maxWspd: 3.0, opnStat: "개장", totalIndex: "좋음" },
    { id: "swim-songjeong", experience: "swimming", name: "송정해수욕장", region: "부산", lat: 35.1786, lot: 129.1997, predcYmd: TODAY, predcNoonSeCd: "오후", maxWvhgt: 0.9, avgWtem: 19.3, avgArtmp: 21.0, maxWspd: 3.6, opnStat: "개장", totalIndex: "좋음" },
    { id: "swim-eurwangni", experience: "swimming", name: "을왕리해수욕장", region: "인천", lat: 37.4480, lot: 126.3740, predcYmd: TODAY, predcNoonSeCd: "오전", maxWvhgt: 0.4, avgWtem: 15.8, avgArtmp: 18.6, maxWspd: 2.8, opnStat: "개장", totalIndex: "좋음" },
  ],
};

export function getSpots(exp: ExperienceKey): Spot[] {
  return SPOTS_BY_EXPERIENCE[exp];
}

export function getSpot(id: string): Spot | undefined {
  for (const exp of Object.keys(SPOTS_BY_EXPERIENCE) as ExperienceKey[]) {
    const found = SPOTS_BY_EXPERIENCE[exp].find((s) => s.id === id);
    if (found) return found;
  }
  return undefined;
}

export const indexLevel = (label: IndexLabel) => INDEX_LEVEL[label];

export const indexTone = (label: IndexLabel) => {
  const lv = INDEX_LEVEL[label];
  if (lv >= 4) return {
    bar: "bg-primary",
    text: "text-primary",
    chip: "bg-primary/10 text-primary border-primary/20",
  };
  if (lv === 3) return {
    bar: "bg-warning",
    text: "text-warning",
    chip: "bg-warning/10 text-warning border-warning/20",
  };
  return {
    bar: "bg-destructive",
    text: "text-destructive",
    chip: "bg-destructive/10 text-destructive border-destructive/20",
  };
};
