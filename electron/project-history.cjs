const fs=require('node:fs');
const path=require('node:path');
const allTasks=p=>[...(p.rounds||[]).flatMap(r=>r.tasks||[]),...(p.tasks||[])];
function normalizeProject(p){
  p.rounds ||= [];p.roundNumber ||= 1;p.originalGoal ||= p.goal||p.title||'';
  p.messages ||= [p.goal&&{role:'user',text:p.goal,at:p.createdAt,round:1},p.report&&{role:'assistant',text:p.report,at:p.runCompletedAt||p.completedAt,round:1}].filter(Boolean);
  if(p.status==='completed'&&!p.userCompletedAt){p.status='review';p.runCompletedAt ||= p.completedAt;delete p.completedAt;}
}
function writeHistory(p){
  if(p.mode!=='codex'||!p.directory)return;
  fs.mkdirSync(p.directory,{recursive:true});
  const text=(p.messages||[]).map(m=>`## ${m.round||1}차 · ${m.role==='user'?'사용자 요청':m.role==='assistant'?'작업 결과':'프로젝트 상태'}\n\n${m.text}`).join('\n\n');
  const file=path.join(p.directory,'PROJECT-HISTORY.md');fs.writeFileSync(file+'.tmp',text);fs.renameSync(file+'.tmp',file);
}
function updateWithHistory(p,change){
  const previous=structuredClone(p);
  try{change();writeHistory(p);}catch(e){for(const key of Object.keys(p))delete p[key];Object.assign(p,previous);throw e;}
}
function previousContext(p){
  if(!p.rounds?.length)return '';
  const rounds=p.rounds.slice(-3).map(r=>({round:r.number,status:r.status,error:r.error,request:String(r.goal||'').slice(0,800),report:r.report?.slice(0,1600),artifacts:(r.tasks||[]).map(t=>({title:t.title,status:t.status,directory:t.directory}))}));
  return `같은 프로젝트의 추가 요청입니다. 원래 목표: ${p.originalGoal}\n이전 요청과 결과 발췌: ${JSON.stringify(rounds)}\n전체 대화·검수 이력: ${p.directory?path.join(p.directory,'PROJECT-HISTORY.md'):'프로젝트 대화 이력'}\n이전 산출물을 읽고 필요한 파일을 현재 작업 폴더로 가져와 수정·검증하세요. 이전 결과를 처음부터 불필요하게 다시 만들지 마세요. 이전 작업 폴더는 보존하세요.\n\n`;
}
module.exports={allTasks,normalizeProject,writeHistory,previousContext,updateWithHistory};
