// Keep using the configured folder unless this request explicitly changes it.
function createRequestStarter(engine,codex,chooseFolder) {
  let selecting=false;
  return async (goal,options={})=>{
    if(selecting)throw new Error('업무를 준비 중입니다. 잠시 후 다시 시도해 주세요.');
    selecting=true;
    try{
      const project=options?.projectId?engine.validateContinue(options.projectId,goal):null;
      if(!project)engine.validateStart(goal);
      if((project?.mode||engine.state.settings.mode)==='codex'){
        const {account}=await codex.request('account/read');
        if(account?.type!=='chatgpt')throw new Error('ChatGPT 계정 로그인이 필요합니다. 설정에서 로그인해 주세요.');
      }
      if(project){
        if(options.chooseProjectFolder)throw new Error('기존 프로젝트의 폴더는 유지됩니다. 폴더를 바꾸려면 새 프로젝트를 시작해 주세요.');
        return engine.continueProject(project.id,goal);
      }
      if(options?.chooseProjectFolder===true){
        const result=await chooseFolder();
        if(result.canceled||!result.filePaths?.[0])return null;
        return engine.start(goal,result.filePaths[0]);
      }
      return engine.start(goal);
    }finally{selecting=false;}
  };
}
module.exports={createRequestStarter};
