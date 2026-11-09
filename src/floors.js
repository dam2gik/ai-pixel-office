export const FLOOR_IDS=[-6,-5,-4,-3,-2,-1,1,2,3,4,5];
export const floorElevation=floor=>Number(floor)<0?Number(floor)*6:(Number(floor)-1)*6;
export const floorLabel=floor=>Number(floor)<0?`B${Math.abs(Number(floor))}`:`${floor}F`;
export const FLOOR_NAMES={'1':'1층 · 가든','2':'2층','-1':'B1 · 웰니스','-2':'B2 · 구내식당','-3':'B3 · 탄광','-4':'B4 · 심층 탄광','-5':'B5 · 몬스터 갱도','-6':'B6 · 심층 마굴'};

Object.assign(FLOOR_NAMES,{'3':'3F · 연구·제작','4':'4F · 문화·놀이','5':'5F · 스카이 정원'});
