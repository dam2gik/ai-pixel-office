import {floorElevation} from './floors.js';
import {LIFT} from './transport-config.js';
const move=(value,target,step)=>value+Math.sign(target-value)*Math.min(Math.abs(target-value),step);
export class ElevatorLife{
  constructor(){this.reset();this.completedTrips=0;}
  reset(){this.y=0;this.phase='idle';this.doorOpen=0;this.queue=[];this.job=null;this.timer=0;}
  request(person,toFloor){
    if(this.queue.some(q=>q.id===person.id)||this.job?.id===person.id&&!this.job.canceled)return;
    this.queue.push({id:person.id,from:person.position.floor||1,to:toFloor,journey:person.mode});
    person.mode='lift-waiting';person.transport={kind:'elevator',stage:'waiting',from:person.position.floor||1,to:toFloor};
  }
  isRiding(id){return this.job?.id===id&&['boarding','closing','travel','arriving','exiting'].includes(this.phase);}
  cancel(id){this.queue=this.queue.filter(q=>q.id!==id);if(this.job?.id===id&&!this.isRiding(id))this.job.canceled=true;}
  tick(dt,people){
    const landed=[];
    if(this.phase==='idle'){
      this.doorOpen=move(this.doorOpen,0,dt*2);
      while(this.queue.length&&!this.job){const job=this.queue.shift();if(people.get(job.id)?.mode==='lift-waiting')this.job=job;}
      if(!this.job)return landed;this.phase='pickup';
    }
    const job=this.job,p=people.get(job?.id);
    if(!job){this.phase='idle';return landed;}
    const position=(floor,z)=>({x:LIFT.x,z,y:floorElevation(floor),floor,lift:true});
    if(this.phase==='pickup'){
      this.y=move(this.y,floorElevation(job.from),LIFT.speed*dt);
      if(this.y===floorElevation(job.from)){if(job.canceled||!p){this.job=null;this.phase='idle';}else this.phase='opening';}
    }else if(this.phase==='opening'){
      if(job.canceled||!p){this.job=null;this.phase='idle';return landed;}
      this.doorOpen=move(this.doorOpen,1,dt*2);
      if(this.doorOpen===1){this.phase='boarding';this.timer=0;p.mode='lift-boarding';}
    }else if(this.phase==='boarding'){
      this.timer=Math.min(1,this.timer+dt);if(p){p.yaw=0;p.position=position(job.from,LIFT.entryZ+(LIFT.z-LIFT.entryZ)*this.timer);p.transport.stage='boarding';}
      if(this.timer===1){this.phase='closing';if(p)p.mode='lift-riding';}
    }else if(this.phase==='closing'){
      this.doorOpen=move(this.doorOpen,0,dt*2);if(this.doorOpen===0){this.phase='travel';if(p)p.transport.stage='riding';}
    }else if(this.phase==='travel'){
      this.y=move(this.y,floorElevation(job.to),LIFT.speed*dt);
      if(p){p.position={...position(job.from,LIFT.z),y:this.y};p.transport.stage='riding';}
      if(this.y===floorElevation(job.to))this.phase='arriving';
    }else if(this.phase==='arriving'){
      this.doorOpen=move(this.doorOpen,1,dt*2);if(p)p.position=position(job.to,LIFT.z);
      if(this.doorOpen===1){this.phase='exiting';this.timer=0;if(p)p.mode='lift-exiting';}
    }else if(this.phase==='exiting'){
      this.timer=Math.min(1,this.timer+dt);
      if(p){p.yaw=Math.PI;p.position=position(job.to,LIFT.z+(LIFT.entryZ-LIFT.z)*this.timer);p.transport.stage='exiting';}
      if(this.timer===1){
        if(p){p.position={x:LIFT.x,z:LIFT.entryZ,y:floorElevation(job.to),floor:job.to};p.mode=job.journey;delete p.transport;landed.push(p.id);}
        this.completedTrips++;this.job=null;this.phase='idle';
      }
    }
    return landed;
  }
  snapshot(){return {phase:this.phase,y:this.y,doorOpen:this.doorOpen,passenger:this.job?.id||null,from:this.job?.from||null,to:this.job?.to||null,queue:this.queue.map(q=>q.id),completedTrips:this.completedTrips};}
}
