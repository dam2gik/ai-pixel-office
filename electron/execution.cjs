function executionPath(goal, strategy = 'auto') {
  if (strategy === 'solo') return 'direct';
  if (strategy === 'team') return 'team';
  // Only clearly bounded requests bypass planning; ambiguous goals keep the team flow.
  const broad = /병렬|여러\s*(파일|기능|페이지)|통합|협업|독립.*(?:검증|검토)|별도.*(?:검증|검토)|QA.*검증|보안|인증|결제|마이그레이션|리팩터링|아키텍처|(?:전체|전면).*(구현|개편|개발)|(?:앱|웹사이트|플랫폼|서비스).*(?:만들|개발|구현)|(?:build|create|develop).*(?:app\b|website|platform)|그리고|\n\s*(?:[-*]|\d+[.)])/i;
  const small = /오타|띄어쓰기|문구|색상|라벨|번역|요약|README|typo|translate|summari[sz]e|(?:파일|문서).*(?:하나|한\s*개)|(?:버튼|제목|이름).*(?:변경|바꿔|수정)/i;
  return goal.length <= 500 && small.test(goal) && !broad.test(goal) ? 'direct' : 'team';
}
function directPlan(goal, agents, pmId) {
  const workers = agents.filter(a => a.id !== pmId);
  const role = /디자인|색상|화면|버튼|라벨|design|color/i.test(goal) ? /디자이너|design/i : /검증|테스트|test|검사/i.test(goal) ? /QA|테스터/i : /조사|리서치|research/i.test(goal) ? /리서처|research/i : /개발|developer/i;
  const worker = workers.find(a => role.test(a.role)) || workers[0] || agents.find(a => a.id === pmId);
  return { title:goal.slice(0,48), tasks:[{ id:'direct', title:goal.replace(/\s+/g,' ').slice(0,48), agentId:worker.id, eligibleAgentIds:[worker.id], instructions:`${goal}\n이 요청을 직접 수행하고 필요한 검증까지 같은 작업에서 완료하세요. 결과, 실제 파일 경로, 수행한 검증과 남은 문제를 간결하게 보고하세요.`, dependsOn:[] }] };
}
function eligibleAgents(task, agents) {
  if (task.eligibleAgentIds?.length) return agents.filter(a => task.eligibleAgentIds.includes(a.id));
  const owner = agents.find(a => a.id === task.agentId);
  return agents.filter(a => a.role === owner?.role);
}
function prioritize(tasks) {
  const depths = new Map();
  function depth(id) {
    if (!depths.has(id)) depths.set(id,1+Math.max(0,...tasks.filter(t=>t.dependsOn.includes(id)).map(t=>depth(t.id))));
    return depths.get(id);
  }
  return tasks.filter(t=>t.status==='queued').sort((a,b)=>depth(b.id)-depth(a.id));
}
function handoff(task) {
  const text = String(task.result || '');
  return { title:task.title, result:text.slice(0,1600), truncated:text.length>1600, directory:task.directory, handoffFile:task.directory ? require('node:path').join(task.directory,'HANDOFF.md') : null };
}
function directReport(project) {
  const task=project.tasks[0];
  return `CEO 요청\n${project.goal}\n\n담당자 결과\n${task.result || '완료된 결과 없음'}\n\n담당 업무 상태: ${task.status==='completed'?'작업 완료 · 사용자 검수 대기':task.status}${task.error ? `\n실패 사유: ${task.error}` : ''}${task.directory ? `\n산출물 폴더: ${task.directory}` : ''}\n\n이 보고서는 담당자의 결과를 그대로 취합했습니다. 별도의 PM 검토는 수행하지 않았습니다. 프로젝트는 사용자가 검수 완료할 때까지 유지됩니다.`;
}
module.exports={executionPath,directPlan,eligibleAgents,prioritize,handoff,directReport};
