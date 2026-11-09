// Original voxel interpretations of the proportions and construction in the
// reference board. No downloaded product geometry or textures are embedded.
const C={frame:'#65766f',wood:'#aa7954',cream:'#e5e4dc',green:'#739587',rust:'#bd836b',glass:'#b3d4d4'};
export function paintFurniture(type,g,box){
  const b=(x,y,z,w,h,d,c,kind='mineral')=>box(g,x,y,z,w,h,d,c,kind);
  const feet=(x,z,h=.22)=>{for(const a of [-x,x])for(const c of [-z,z])b(a,h/2,c,.065,h,.065,C.frame);};
  if(type==='armchair'){
    feet(.38,.32);b(0,.4,0,.94,.3,.87,C.wood,'wood');
    b(0,.59,.045,.81,.18,.76,C.green,'fabric');b(0,.92,-.39,.9,.52,.16,C.green,'fabric');
    for(const x of [-.47,.47]){b(x,.62,0,.15,.27,.9,C.wood,'wood');b(x,.78,0,.16,.08,.9,C.green,'fabric');}
    b(0,.9,-.286,.7,.32,.06,C.green,'fabric');
  }else if(type==='ottoman'){
    feet(.24,.24,.12);b(0,.24,0,.66,.27,.66,C.rust,'fabric');b(0,.4,0,.68,.1,.68,C.rust,'fabric');
    for(const x of [-.23,.23])b(x,.453,0,.012,.006,.48,C.cream,'fabric');
  }else if(type==='sideboard'){
    feet(.94,.2,.16);b(0,.59,0,2.06,.88,.51,C.green);
    for(const x of [-1.02,-.34,.34,1.02])b(x,.59,.26,.025,.91,.025,C.cream);
    for(const y of [.15,.58,1.04])b(0,y,.26,2.08,.025,.025,C.cream);
    for(const x of [-.68,0,.68])for(const y of [.37,.81])b(x,y,.26,.045,.045,.025,C.frame);
    b(0,1.055,0,2.1,.035,.55,C.cream);b(-.65,1.13,0,.45,.12,.28,C.rust,'wood');
    for(let i=0;i<3;i++)b(.6,1.1+i*.045,0,.44,.04,.3,[C.green,C.cream,C.wood][i],'fabric');
  }else if(type==='coffeeTable'){
    feet(.61,.29,.4);b(0,.39,0,1.45,.055,.8,C.glass,'glass');
    for(const x of [-.72,.72])b(x,.4,0,.025,.04,.83,C.frame);
    for(const z of [-.4,.4])b(0,.4,z,1.46,.04,.025,C.frame);
    b(0,.17,0,1.25,.045,.63,C.wood,'wood');b(-.25,.435,0,.32,.055,.25,C.rust,'fabric');
  }else if(type==='cafeSet'){
    b(0,.79,0,.82,.085,.82,C.cream,'marble');b(0,.4,0,.08,.74,.08,C.frame);b(0,.07,0,.48,.08,.48,C.frame);
    for(const x of [-.78,.78]){
      b(x,.48,0,.5,.1,.5,C.wood,'wood');for(const dx of [-.17,.17])for(const z of [-.17,.17])b(x+dx,.24,z,.045,.46,.045,C.frame);
      b(x,.76,-.22,.47,.49,.07,C.green,'fabric');
    }
    b(0,.88,0,.14,.13,.14,C.wood,'wood');b(0,1,0,.19,.14,.19,C.green,'leaf');
  }else if(type==='floorLamp'){
    b(0,.04,0,.5,.07,.5,C.frame);b(0,.88,0,.045,1.7,.045,C.frame);
    b(0,1.68,0,.52,.34,.52,C.cream,'fabric');b(0,1.86,0,.4,.04,.4,C.wood,'wood');b(0,1.49,0,.34,.025,.34,'#ecd7a3');
  }else if(type==='privacySofa'){
    feet(.99,.43,.2);b(0,.42,0,2.25,.43,1.13,C.rust,'fabric');
    b(0,1.2,-.53,2.38,1.25,.18,C.rust,'fabric');
    for(const x of [-1.1,1.1])b(x,1.2,0,.18,1.25,1.22,C.rust,'fabric');
    for(const x of [-.53,.53]){b(x,.69,.08,.98,.16,.84,C.cream,'fabric');b(x,1.02,-.36,.93,.48,.15,C.cream,'fabric');}
    for(let i=0;i<7;i++)b(-.9+i*.3,1.27,-.428,.012,1.05,.012,C.cream,'fabric');
  }else if(type==='displayShelf'){
    feet(.7,.2,.1);for(const x of [-.77,.77])for(const z of [-.24,.24])b(x,.95,z,.045,1.8,.045,C.frame);
    for(let row=0;row<4;row++){
      const y=.15+row*.54;b(0,y,0,1.57,.065,.53,C.wood,'wood');
      if(row<3)for(let i=0;i<5;i++)b(-.55+i*.22,y+.2,0,.13,.32-(i%2)*.055,.25,[C.green,C.cream,C.rust][i%3],'fabric');
    }
    b(.43,1.86,0,.25,.13,.25,C.cream);b(.43,2,0,.36,.2,.32,C.green,'leaf');
  }else return false;
  return true;
}
