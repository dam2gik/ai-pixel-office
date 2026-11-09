export const HIGH_ROOMS=[
  {id:'makerspace',floor:3,name:'3F · 메이커 공방',subtitle:'3D 프린터와 제작 벤치가 있는 실험 공방',x:-8,z:-6,label:[-8,0,-2]},
  {id:'server-lab',floor:3,name:'3F · 서버 연구실',subtitle:'서버 랙·네트워크·모니터링 월',x:9,z:-6,label:[9,0,-2]},
  {id:'project-lab',floor:3,name:'3F · 프로젝트 랩',subtitle:'협업 테이블과 프로토타입 보드',x:-8,z:6,label:[-8,0,9]},
  {id:'exhibition',floor:3,name:'3F · 쇼케이스',subtitle:'제품과 시제품을 전시하는 갤러리',x:9,z:6,label:[9,0,9]},
  {id:'auditorium',floor:4,name:'4F · 강당',subtitle:'발표 무대·대형 스크린·관람석',x:-8,z:4,label:[-8,0,9]},
  {id:'recording',floor:4,name:'4F · 녹음 스튜디오',subtitle:'방음 부스와 카메라·마이크·믹싱 콘솔',x:9,z:-6,label:[9,0,-2]},
  {id:'arcade',floor:4,name:'4F · 게임 라운지',subtitle:'아케이드 캐비닛과 콘솔 게임 소파',x:9,z:6,label:[9,0,9]},
  {id:'greenhouse',floor:5,name:'5F · 온실 정원',subtitle:'채광 프레임과 식물 재배 선반',x:-8,z:-6,label:[-8,0,-2]},
  {id:'sky-cafe',floor:5,name:'5F · 스카이 카페',subtitle:'커피 바와 전망 창가 좌석',x:9,z:-6,label:[9,0,-2]},
  {id:'yoga',floor:5,name:'5F · 요가·명상',subtitle:'요가 매트·돌 정원·작은 수경 공간',x:-8,z:6,label:[-8,0,9]},
  {id:'sky-lounge',floor:5,name:'5F · 전망 라운지',subtitle:'도시와 캠퍼스를 내려다보는 휴식 공간',x:9,z:6,label:[9,0,9]}
];
export const HIGH_STATIONS=[
  {id:'maker-work',kind:'maker',room:'makerspace',x:-9,z:-5,floor:3,y:12,yaw:Math.PI,seconds:16,lines:['새 프로토타입을 만들고 있어요.']},
  {id:'server-check',kind:'research',room:'server-lab',x:9,z:-2.7,floor:3,y:12,yaw:Math.PI,seconds:13,lines:['서버 상태와 실험 결과를 확인 중.']},
  {id:'auditorium-seat',kind:'talk',room:'auditorium',x:-8,z:4.6,floor:4,y:18,yaw:Math.PI,seconds:18,lines:['팀 발표를 듣고 있어요.']},
  {id:'studio-record',kind:'studio',room:'recording',x:9,z:-4.8,floor:4,y:18,yaw:Math.PI,seconds:14,lines:['스튜디오에서 녹음 중이에요.']},
  {id:'arcade-play',kind:'gaming',room:'arcade',x:9,z:4.9,floor:4,y:18,yaw:Math.PI,seconds:15,lines:['잠깐 게임 한 판으로 리프레시!']},
  {id:'greenhouse-care',kind:'greenhouse',room:'greenhouse',x:-10,z:-5.4,floor:5,y:24,yaw:0,seconds:14,lines:['온실 식물에 물을 주는 중.']},
  {id:'sky-cafe-tea',kind:'skytea',room:'sky-cafe',x:9,z:-2.5,floor:5,y:24,yaw:Math.PI,seconds:12,lines:['높은 층에서 즐기는 커피 한 잔.']},
  {id:'yoga-stretch',kind:'yoga',room:'yoga',x:-7,z:4,floor:5,y:24,yaw:0,seconds:14,lines:['호흡을 고르고 몸을 풀어요.']}
];
