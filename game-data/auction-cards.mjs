// 연봉 블라인드 경매 카드 (2번 게임). aav = 연평균 연봉(억). 서버에만 두고, 화면에는 공개 정보만 보낸다.
export const START_CUBES = 20;
export const PLAYERS_PER_GAME = 13; // 게임마다 아래 선수 풀에서 무작위로 13명을 뽑음
export const CHANCE_AFTER = { trade: 8, double: 2, release: 2 }; // 선수 카드가 이만큼 공개된 뒤부터 해당 찬스 카드가 나올 수 있음

export const CARDS = [
  // 연봉 블라인드 경매 1·2편 선수
  { id: 'jgw', type: 'player', name: '정근우', team: '한화', seasons: '2014–2017', term: '4년', hint: '국가대표 테이블세터의 이적', aav: 70 / 4 },
  { id: 'ldh', type: 'player', name: '이대호', team: '롯데', seasons: '2017–2020', term: '4년', hint: '해외 생활 마치고 친정 복귀', aav: 150 / 4 },
  { id: 'nip', type: 'player', name: '니퍼트', team: '두산', seasons: '2017', term: '1년', hint: '전년도 MVP의 재계약', aav: 24.5, foreign: true },
  { id: 'khs', type: 'player', name: '김현수', team: 'LG', seasons: '2018–2021', term: '4년', hint: 'MLB에서 돌아와 라이벌 팀으로', aav: 115 / 4 },
  { id: 'lyg', type: 'player', name: '이용규', team: '키움', seasons: '2022', term: '1년', hint: '이적 2년 차, 팀 내 최고 인상률', aav: 4 },
  { id: 'kjw', type: 'player', name: '구자욱', team: '삼성', seasons: '2022–2026', term: '5년', hint: '프랜차이즈 스타의 비FA 다년계약', aav: 120 / 5 },
  { id: 'pgw', type: 'player', name: '박건우', team: 'NC', seasons: '2022–2027', term: '6년', hint: '잠실을 떠나 창원으로', aav: 100 / 6 },
  { id: 'nsb', type: 'player', name: '나성범', team: 'KIA', seasons: '2022–2027', term: '6년', hint: '프랜차이즈 떠나 고향팀행', aav: 150 / 6 },
  { id: 'yej', type: 'player', name: '양의지', team: '두산', seasons: '2023–2028', term: '4+2년', hint: '친정 복귀, 옵션 연장 포함', aav: 152 / 6 },
  { id: 'ljh', type: 'player', name: '이정후', team: '키움', seasons: '2023', term: '1년', hint: 'MVP 수상 다음 해 연봉', aav: 11 },
  { id: 'kyp', type: 'player', name: '고영표', team: 'KT', seasons: '2024–2028', term: '5년', hint: '구단 최초 비FA 다년계약', aav: 107 / 5 },
  { id: 'cj', type: 'player', name: '최정', team: 'SSG', seasons: '2025–2028', term: '4년', hint: '세 번째 FA, 전액 보장', aav: 110 / 4 },
  { id: 'pon', type: 'player', name: '폰세', team: '한화', seasons: '2025', term: '1년', hint: '일본에서 건너온 새 외국인 투수', aav: 14, foreign: true },
  { id: 'sgc', type: 'player', name: '서건창', team: 'KIA', seasons: '2024', term: '1년', hint: 'MVP 출신, 고향팀으로 이적', aav: 0.5 },
  { id: 'osh', type: 'player', name: '오승환', team: '삼성', seasons: '2020', term: '1년', hint: '해외 생활 마치고 친정 복귀', aav: 6 },
  // 연습판 선수
  { id: 'kmh', type: 'player', name: '강민호', team: '삼성', seasons: '2018–2021', term: '4년', hint: '롯데 프랜차이즈 포수의 이적', aav: 80 / 4 },
  { id: 'ysm', type: 'player', name: '윤석민', team: 'KIA', seasons: '2015–2018', term: '4년', hint: '미국 도전 1년 만에 친정 복귀', aav: 90 / 4 },
  { id: 'sah', type: 'player', name: '손아섭', team: 'NC', seasons: '2022–2025', term: '4년', hint: '부산을 떠나 창원으로', aav: 64 / 4 },
  { id: 'chw', type: 'player', name: '최형우', team: 'KIA', seasons: '2017–2020', term: '4년', hint: 'KBO 첫 100억 FA', aav: 100 / 4 },
  { id: 'kjh', type: 'player', name: '김재환', team: '두산', seasons: '2022–2025', term: '4년', hint: '잠실 홈런왕의 FA 잔류', aav: 115 / 4 },
  { id: 'kkh', type: 'player', name: '김광현', team: 'SSG', seasons: '2022–2025', term: '4년', hint: 'MLB에서 돌아온 에이스의 비FA 계약', aav: 151 / 4 },
  { id: 'pbh', type: 'player', name: '박병호', team: 'KT', seasons: '2022–2024', term: '3년', hint: '홈런왕의 30대 후반 이적', aav: 30 / 3 },
  { id: 'phm', type: 'player', name: '박해민', team: 'LG', seasons: '2022–2025', term: '4년', hint: '삼성 주장의 FA 이적', aav: 60 / 4 },
  { id: 'ces', type: 'player', name: '채은성', team: '한화', seasons: '2023–2028', term: '6년', hint: 'LG를 떠나 대전으로', aav: 90 / 6 },
  { id: 'psw', type: 'player', name: '박세웅', team: '롯데', seasons: '2023–2027', term: '5년', hint: '토종 선발의 비FA 다년계약', aav: 90 / 5 },
  { id: 'ojh', type: 'player', name: '오지환', team: 'LG', seasons: '2024–2029', term: '6년', hint: '우승 주장의 FA 잔류', aav: 124 / 6 },
  { id: 'rhj', type: 'player', name: '류현진', team: '한화', seasons: '2024–2031', term: '8년', hint: '12년 만의 친정 복귀', aav: 170 / 8 },
  { id: 'kdy', type: 'player', name: '김도영', team: 'KIA', seasons: '2025', term: '1년', hint: '4년 차 최고 연봉 신기록', aav: 5 },
  { id: 'trade', type: 'chance', kind: 'trade', name: '트레이드권', effect: '낙찰 즉시, 내 선수 1명과 상대 선수 1명을 직접 골라 교환해요. 교환할 선수가 없으면 그대로 사라져요.' },
  { id: 'release', type: 'chance', kind: 'release', name: '방출', effect: '가격이 1초마다 1개씩 올라가요. 가장 먼저 포기한 사람이 방출 카드를 받아 가장 최근에 영입한 자기 선수를 방출해요. 포기한 사람은 큐브를 내지 않고, 나머지 3명은 그 순간의 가격만큼 큐브를 내요.' },
  { id: 'double', type: 'chance', kind: 'double', name: '연봉 2배', effect: '결과를 합산할 때, 내 선수 중 연봉이 가장 낮은 선수의 연봉이 2배가 돼요.' }
];
