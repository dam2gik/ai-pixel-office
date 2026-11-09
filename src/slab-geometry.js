// Rectangular subtraction keeps stair and lift shafts physically open in the
// large foundation slabs as well as in their decorative floor tiles.
export function slabWithVoids({root,box,x,y,z,w,h,d,color,kind,voids=[]}){
  let rects=[{left:x-w/2,right:x+w/2,back:z-d/2,front:z+d/2}];
  for(const hole of voids){
    const out=[];
    for(const r of rects){
      const left=Math.max(r.left,hole.x-hole.w/2),right=Math.min(r.right,hole.x+hole.w/2),back=Math.max(r.back,hole.z-hole.d/2),front=Math.min(r.front,hole.z+hole.d/2);
      if(left>=right||back>=front){out.push(r);continue;}
      out.push({left:r.left,right:left,back:r.back,front:r.front},{left:right,right:r.right,back:r.back,front:r.front},{left,right,back:r.back,front:back},{left,right,back:front,front:r.front});
    }
    rects=out.filter(r=>r.right-r.left>1e-6&&r.front-r.back>1e-6);
  }
  for(const r of rects)box(root,(r.left+r.right)/2,y,(r.back+r.front)/2,r.right-r.left,h,r.front-r.back,color,kind,'slab');
}
