import { EXPERIENCE_LABELS, INDEX_LEVEL, type IndexLabel, type Spot } from '../lib/marine-data'

export function summary(spot: Spot) {
  switch (spot.experience) {
    case 'travel':
      return { primary: `${spot.avgWtem}° · 파고 ${spot.avgWvhgt}m`, secondary: `${spot.weather} · ${spot.tdlvHrCn}` }
    case 'swimming':
      return { primary: `${spot.avgWtem}° · 파고 ${spot.maxWvhgt}m`, secondary: spot.opnStat }
    case 'fishing':
      return { primary: `${spot.minWtem}-${spot.maxWtem}° · 파고 ${spot.maxWvhgt}m`, secondary: `${fishLabel(spot)} · ${spot.tdlvHrCn}` }
    case 'scuba':
      return { primary: `${spot.minWtem}-${spot.maxWtem}° · 유속 ${spot.maxCrsp}kn`, secondary: `물때 ${spot.tdlvHrCn}` }
    case 'mudflat':
      return { primary: `${spot.minArtmp}-${spot.maxArtmp}° · ${spot.weather}`, secondary: `${spot.mdftExprnBgngTm}~${spot.mdftExprnEndTm}` }
    case 'surfing':
      return { primary: `파고 ${spot.avgWvhgt}m · 주기 ${spot.avgWvpd}s`, secondary: `등급 ${spot.grdCn}` }
  }
}

export function analysisSummary(spot: Spot) {
  return `현재 ${spot.name}의 ${EXPERIENCE_LABELS[spot.experience]} 지수는 ${spot.totalIndex} 입니다. 실시간 KHOA 기상·해양 데이터를 기반으로 산출되었으며, 시간대별 변화에 따라 조건이 달라질 수 있습니다.`
}

export function aiRecommendationReason(spot: Spot) {
  const reason = spot.recommendationReason?.trim()
  return reason && reason !== '-' ? reason : ''
}

export function cardAiReason(spot: Spot) {
  const reason = spot.aiReason?.trim()
  return reason && reason !== '-' ? reason : ''
}

export function highlight(spot: Spot) {
  switch (spot.experience) {
    case 'travel':
      return { label: '물때 / 날씨', value: `${spot.tdlvHrCn} · ${spot.weather}` }
    case 'swimming':
      return { label: '개장 여부', value: spot.opnStat }
    case 'fishing':
      return { label: '대상어 · 물때', value: `${fishLabel(spot)} · ${spot.tdlvHrCn}` }
    case 'scuba':
      return { label: '물때', value: spot.tdlvHrCn }
    case 'mudflat':
      return { label: '체험 시간', value: `${spot.mdftExprnBgngTm} ~ ${spot.mdftExprnEndTm}` }
    case 'surfing':
      return { label: '권장 등급', value: spot.grdCn }
  }
}

export function statsForCard(spot: Spot) {
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

export function fishLabel(spot: Spot) {
  return spot.seafsTgfshNm && spot.seafsTgfshNm !== '-' ? spot.seafsTgfshNm : '어종 정보 없음'
}

export function detailFields(spot: Spot) {
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
        ['대상어', fishLabel(spot)],
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

const FIELD_HELP: Record<string, string> = {
  '물때': '조석 변화에 따른 바다 상태입니다. 소조기는 물 흐름이 비교적 약하고, 대조기는 차이가 큽니다.',
  '날씨': '해당 예보 시점의 하늘 상태입니다.',
  '기온': '예보 지점 주변 공기의 온도입니다.',
  '수온': '해당 해역의 바닷물 온도입니다.',
  '파고': '파도의 평균적인 높이입니다. 숫자가 높을수록 물결이 거칩니다.',
  '풍속': '바람의 빠르기입니다. 강할수록 체감 조건과 파도에 영향을 줍니다.',
  '유속': '바닷물이 흐르는 속도입니다. kn은 노트 단위이며 수영, 낚시, 다이빙 난이도에 영향을 줍니다.',
  '시간대': '예보가 적용되는 오전 또는 오후 구분입니다.',
  '개장 여부': '해수욕장 운영 상태입니다.',
  '최고 파고': '예보 구간에서 예상되는 가장 높은 파도 높이입니다.',
  '최고 풍속': '예보 구간에서 예상되는 가장 강한 바람 속도입니다.',
  '대상어': '해당 낚시 포인트에서 주로 노릴 수 있는 어종입니다.',
  '체험 시작': '갯벌 체험이 가능한 시작 시각입니다.',
  '체험 종료': '갯벌 체험을 마쳐야 하는 종료 시각입니다.',
  '권장 등급': '파도와 바람 조건을 기준으로 추천되는 서핑 숙련도입니다.',
  '파주기': '파도와 파도 사이의 시간 간격입니다. 길수록 파도가 안정적으로 들어오는 편입니다.',
}

export function fieldHelp(label: string) {
  return FIELD_HELP[label] ?? `${label} 정보입니다.`
}

export function markerColor(label: IndexLabel) {
  const level = INDEX_LEVEL[label]
  if (level >= 4) return '#3b82f6'
  if (level === 3) return '#f59e0b'
  return '#ef4444'
}
