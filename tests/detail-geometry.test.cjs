const {test}=require('node:test'),assert=require('node:assert/strict');
test('carved geometry stays closed, outward facing, and within the original picking footprint',async()=>{
  const {createDetailGeometry}=await import('../src/detail-geometry.js');
  const shapes=createDetailGeometry(),positions=shapes.carved.attributes.position,edges=new Map();
  const key=p=>p.map(n=>Math.round(n*1e6)).join(',');
  for(let i=0;i<positions.count;i+=3){
    const points=[0,1,2].map(j=>[positions.getX(i+j),positions.getY(i+j),positions.getZ(i+j)]);
    for(const p of points)for(const v of p)assert.ok(Math.abs(v)<=.5);
    const [a,b,c]=points,u=b.map((v,j)=>v-a[j]),v=c.map((n,j)=>n-a[j]);
    const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    assert.ok(normal.reduce((sum,n,j)=>sum+n*a[j],0)>0,'no inverted or degenerate faces');
    for(let j=0;j<3;j++){const edge=[key(points[j]),key(points[(j+1)%3])].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}
  }
  for(const count of edges.values())assert.equal(count,2,'no open edges');
  shapes.dispose();
});
