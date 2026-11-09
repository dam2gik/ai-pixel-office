// Use the actual paged picker rather than clicking hidden room cards.
exports.focusRoom=async function focusRoom(page,id){
  if(id==='all'){await page.locator('[data-floor=all]').click();return;}
  const {ROOMS}=await import('../src/office-life.js'),room=ROOMS.find(r=>r.id===id);if(!room)throw new Error('Unknown room '+id);
  if(!await page.locator('#spaceBrowserPanel').isVisible())await page.locator('#browseSpaces').click();
  const floor=room.floor||1;await page.locator('#spaceFloor').selectOption(String(floor));const index=ROOMS.filter(r=>(r.floor||1)===floor).findIndex(r=>r.id===id);
  for(let i=0;i<Math.floor(index/4);i++)await page.locator('#spacesNext').click();await page.locator('[data-room="'+id+'"]').click();
};
