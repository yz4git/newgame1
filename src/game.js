const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const COLORS = ['#ff6b78', '#ffd66e', '#62e7b4'];
const NAMES = ['A', 'B', 'C'];

const SWITCHES = [
  { id: 0, x: .27, pair: [0, 1], label: '01' },
  { id: 1, x: .46, pair: [1, 2], label: '02' },
  { id: 2, x: .65, pair: [0, 1], label: '03' },
  { id: 3, x: .81, pair: [1, 2], label: '04' }
];

const SHIFTS = [
  { name:'FIRST BOARD', hint:'分岐器をタップして、列車を同じ色のホームへ', active:[0,1], maintenance:null, gap:2.45, speed:.075,
    schedule:[[0,1,0],[0,0,0],[2,1,0],[1,2,0],[2,2,0],[1,0,0]] },
  { name:'CROSS CURRENT', hint:'4つの分岐器を使い、先の列車まで準備する', active:[0,1,2,3], maintenance:null, gap:1.95, speed:.082,
    schedule:[[2,0,0],[0,2,0],[1,0,0],[0,1,0],[2,2,0],[1,2,0],[2,1,0],[0,0,0]] },
  { name:'EXPRESS WINDOW', hint:'金縁のEXPRESSは速い。進路を早めに作る', active:[0,1,2,3], maintenance:null, gap:1.62, speed:.086,
    schedule:[[0,2,1],[2,0,0],[1,1,0],[2,1,1],[0,0,0],[1,2,0],[0,1,1],[2,2,0],[1,0,0],[2,0,1]] },
  { name:'MAINTENANCE', hint:'02番は点検中。後段の分岐で迂回する', active:[0,1,2,3], maintenance:1, gap:1.52, speed:.089,
    schedule:[[2,1,0],[0,2,0],[1,0,1],[0,1,0],[2,2,0],[1,2,0],[0,0,1],[2,1,0],[1,1,0],[0,2,0],[2,2,1]] },
  { name:'DAWN RUSH', hint:'全分岐復旧。EXPRESSと普通列車を同時に捌く', active:[0,1,2,3], maintenance:null, gap:1.26, speed:.094,
    schedule:[[2,0,1],[0,2,0],[1,1,1],[2,1,0],[0,0,0],[1,2,1],[0,1,0],[2,2,1],[1,0,0],[0,2,1],[2,1,0],[1,1,0],[2,0,1],[0,0,0]] }
];

class AudioBus {
  constructor(){ this.enabled=true; this.ctx=null; }
  async unlock(){
    if(!this.enabled) return;
    try{
      if(!this.ctx) this.ctx=new (window.AudioContext||window.webkitAudioContext)();
      if(this.ctx.state==='suspended') await this.ctx.resume();
    }catch{ this.ctx=null; }
  }
  setEnabled(v){ this.enabled=v; if(v) this.unlock(); else this.ctx?.suspend?.().catch(()=>{}); }
  tone(freq,duration=.07,type='sine',gain=.025,end=null,delay=0){
    if(!this.enabled||!this.ctx||this.ctx.state!=='running') return;
    const t=this.ctx.currentTime+delay, o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,t);
    if(end) o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(gain,t+.008); g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t+duration+.02);
  }
  sw(){ this.tone(320,.055,'triangle',.025,520); }
  locked(){ this.tone(160,.07,'square',.018); }
  good(lane,streak){ const f=[520,620,740][lane]; this.tone(f,.1,'sine',.035,f*1.18); if(streak>=3)this.tone(f*1.5,.12,'triangle',.018,null,.06); }
  bad(){ this.tone(210,.22,'sawtooth',.03,90); }
  shift(){ [440,554,659].forEach((f,i)=>this.tone(f,.18,'sine',.022,null,i*.07)); }
}

export class MidnightJunctionGame {
  constructor(canvas){
    this.canvas=canvas; this.ctx=canvas.getContext('2d',{alpha:false}); this.audio=new AudioBus();
    this.dpr=1; this.width=1; this.height=1; this.state='title'; this.paused=false; this.globalTime=0;
    this.lastFrame=performance.now(); this.acc=0; this.step=1/60; this.shiftIndex=0; this.score=0; this.service=3;
    this.streak=0; this.bestStreakThisRun=0; this.deliveredThisShift=0; this.failedThisShift=0;
    this.switches=SWITCHES.map(s=>Object.assign({},s,{cross:false,pulse:0,reject:0}));
    this.trains=[]; this.spawnCursor=0; this.spawnTimer=0; this.shiftClearTimer=0; this.tutorialDone=false; this.ripples=[];
    this.onChange=()=>{}; this.onToast=()=>{}; this.onTrainQueue=()=>{}; this.onFx=()=>{};
    this.records=this.loadRecords(); this.resize(); this.frame=this.frame.bind(this);
    window.addEventListener('resize',()=>this.resize(),{passive:true}); requestAnimationFrame(this.frame);
  }
  setOnChange(f){this.onChange=f||(()=>{});} setToastCallback(f){this.onToast=f||(()=>{});}
  setQueueCallback(f){this.onTrainQueue=f||(()=>{});} setFxCallback(f){this.onFx=f||(()=>{});}
  setAudioEnabled(v){this.audio.setEnabled(v);} getRecords(){return Object.assign({},this.records);}
  loadRecords(){ try{const p=JSON.parse(localStorage.getItem('midnightJunctionRecordsV1')||'{}'); return {bestScore:Number(p.bestScore)||0,bestStreak:Number(p.bestStreak)||0,clears:Number(p.clears)||0};}catch{return {bestScore:0,bestStreak:0,clears:0};}}
  saveRecords(){try{localStorage.setItem('midnightJunctionRecordsV1',JSON.stringify(this.records));}catch{}}
  get config(){return SHIFTS[this.shiftIndex];}
  resize(){const r=this.canvas.getBoundingClientRect(); this.dpr=Math.min(window.devicePixelRatio||1,1.8); this.width=Math.max(1,r.width); this.height=Math.max(1,r.height); this.canvas.width=Math.round(this.width*this.dpr); this.canvas.height=Math.round(this.height*this.dpr);}
  start(){this.audio.unlock(); this.state='playing'; this.paused=false; this.shiftIndex=0; this.score=0; this.service=3; this.streak=0; this.bestStreakThisRun=0; this.tutorialDone=false; this.startShift(0,true); this.onChange('start');}
  startAgain(){this.start();}
  returnToTitle(){this.state='title';this.paused=false;this.trains.length=0;this.onChange('title');}
  setPaused(v){if(this.state!=='playing')return;this.paused=v;this.onChange(v?'pause':'resume');}
  startShift(i,first=false){
    this.shiftIndex=i; this.trains.length=0; this.spawnCursor=0; this.spawnTimer=first?1.05:1.4; this.shiftClearTimer=0;
    this.deliveredThisShift=0; this.failedThisShift=0;
    this.switches.forEach(s=>{s.cross=false;s.pulse=0;s.reject=0;});
    this.onTrainQueue(this.getUpcoming());
    if(!first)this.onToast('SHIFT '+String(i+1).padStart(2,'0')+' · '+this.config.name,this.config.hint);
    this.onChange('shift',this.getSnapshot());
  }
  getUpcoming(limit=4){return this.config.schedule.slice(this.spawnCursor,this.spawnCursor+limit).map((e,k)=>({source:e[0],target:e[1],express:Boolean(e[2]),order:this.spawnCursor+k}));}
  getSnapshot(){return {state:this.state,paused:this.paused,shiftIndex:this.shiftIndex,shiftName:this.config?.name||'',shiftHint:this.config?.hint||'',score:this.score,service:this.service,streak:this.streak,bestStreak:this.bestStreakThisRun,delivered:this.deliveredThisShift,failed:this.failedThisShift,resolved:this.deliveredThisShift+this.failedThisShift,total:this.config?.schedule.length||0,upcoming:this.getUpcoming(),maintenance:this.config?.maintenance??null};}
  spawnTrain(){
    const e=this.config.schedule[this.spawnCursor]; if(!e)return; this.spawnCursor++;
    this.trains.push({x:.055,lane:e[0],visualLane:e[0],targetLane:e[1],speed:this.config.speed*(e[2]?1.34:1),express:Boolean(e[2]),passed:new Set(),transition:null,glow:1,alive:true});
    this.onTrainQueue(this.getUpcoming());
  }
  isSwitchLocked(id){const s=this.switches[id];return this.trains.some(t=>t.alive&&s.pair.includes(t.lane)&&Math.abs(t.x-s.x)<.045);}
  toggleSwitch(id,point=null){
    if(this.state!=='playing'||this.paused)return false; const s=this.switches[id];
    if(!s||!this.config.active.includes(id)||this.config.maintenance===id){if(s)s.reject=1;this.audio.locked();this.onFx('locked',id);return false;}
    if(this.isSwitchLocked(id)){s.reject=1;this.audio.locked();this.onToast('ROUTE LOCKED','列車が分岐器を通過中');this.onFx('locked',id);return false;}
    s.cross=!s.cross;s.pulse=1;this.audio.sw();this.onFx('switch',id);
    if(point)this.ripples.push({x:point.x,y:point.y,t:0,good:true});
    if(this.shiftIndex===0&&id===0&&!this.tutorialDone){this.tutorialDone=true;this.onToast('ROUTE SET','列車が通る前なら、何度でも組み替えられる');}
    return true;
  }
  handlePointer(cx,cy){
    if(this.state!=='playing'||this.paused)return false; const r=this.canvas.getBoundingClientRect(),x=cx-r.left,y=cy-r.top,rad=Math.max(34,Math.min(this.width,this.height)*.055);
    let best=null; for(const s of this.switches){const p=this.switchPoint(s),d=Math.hypot(x-p.x,y-p.y);if(d<=rad&&(!best||d<best.d))best={s,p,d};}
    if(!best){this.ripples.push({x,y,t:0,good:false});return false;} return this.toggleSwitch(best.s.id,best.p);
  }
  keyboard(code){if(/^Digit[1-4]$/.test(code))return this.toggleSwitch(Number(code.slice(-1))-1);return false;}
  update(dt){
    if(this.state!=='playing'||this.paused)return; this.globalTime+=dt;
    this.switches.forEach(s=>{s.pulse=Math.max(0,s.pulse-dt*2.6);s.reject=Math.max(0,s.reject-dt*3.2);});
    this.ripples.forEach(r=>r.t+=dt);this.ripples=this.ripples.filter(r=>r.t<.55);
    if(this.shiftClearTimer>0){this.shiftClearTimer-=dt;if(this.shiftClearTimer<=0)this.advanceShift();return;}
    if(this.spawnCursor<this.config.schedule.length){this.spawnTimer-=dt;if(this.spawnTimer<=0){this.spawnTrain();this.spawnTimer+=this.config.gap;}}
    for(const t of this.trains){
      if(!t.alive)continue; const old=t.x; let speed=t.speed; const leader=this.findLeader(t);
      if(leader&&leader.x-t.x<.075)speed*=clamp((leader.x-t.x-.025)/.05,.18,1);
      t.x+=speed*dt;t.glow=Math.max(0,t.glow-dt*.7);
      for(const s of this.switches){
        if(t.passed.has(s.id)||old>s.x||t.x<s.x)continue;t.passed.add(s.id);
        if(!this.config.active.includes(s.id)||!s.pair.includes(t.lane))continue;
        if(this.config.maintenance!==s.id&&s.cross){const next=t.lane===s.pair[0]?s.pair[1]:s.pair[0];t.lane=next;t.transition={from:t.visualLane,to:next,t:0,duration:t.express?.22:.3};}
      }
      if(t.transition){t.transition.t+=dt;const q=clamp(t.transition.t/t.transition.duration,0,1),smooth=q*q*(3-2*q);t.visualLane=lerp(t.transition.from,t.transition.to,smooth);if(q>=1){t.visualLane=t.transition.to;t.transition=null;}}else t.visualLane=t.lane;
      if(t.x>=.945){this.deliverTrain(t);if(this.state!=='playing')break;}
    }
    this.trains=this.trains.filter(t=>t.alive&&t.x<1.03);
    if(this.spawnCursor>=this.config.schedule.length&&this.trains.length===0&&this.shiftClearTimer<=0&&this.state==='playing'){
      this.shiftClearTimer=1.45; const perfect=this.failedThisShift===0;
      if(perfect){const bonus=350+this.shiftIndex*100;this.score+=bonus;this.onToast('SHIFT CLEAR · PERFECT','無誤配 +'+bonus);}else this.onToast('SHIFT CLEAR',this.deliveredThisShift+'/'+this.config.schedule.length+' 列車を正しく誘導');
      this.service=Math.min(3,this.service+1);this.audio.shift();this.onChange('score',this.getSnapshot());
    }
  }
  findLeader(t){let leader=null,dx=Infinity;for(const o of this.trains){if(o===t||!o.alive||o.lane!==t.lane||o.x<=t.x)continue;const d=o.x-t.x;if(d<dx){dx=d;leader=o;}}return leader;}
  deliverTrain(t){
    if(!t.alive)return;t.alive=false;const correct=t.lane===t.targetLane;
    if(correct){this.streak++;this.bestStreakThisRun=Math.max(this.bestStreakThisRun,this.streak);this.deliveredThisShift++;const pts=100+Math.min(300,(this.streak-1)*18)+(t.express?70:0);this.score+=pts;this.audio.good(t.targetLane,this.streak);this.onToast(this.streak>=3?'ON TIME · STREAK ×'+this.streak:'ON TIME','HOME '+NAMES[t.targetLane]+' +'+pts);this.onFx('deliver',t.targetLane);}
    else{this.failedThisShift++;this.service--;this.streak=0;this.audio.bad();this.onToast('MISROUTE','HOME '+NAMES[t.targetLane]+' が目的地');this.onFx('miss',t.targetLane);if(this.service<=0){this.finish(false);return;}}
    this.onChange('score',this.getSnapshot());
  }
  advanceShift(){if(this.state!=='playing')return;if(this.shiftIndex>=SHIFTS.length-1)this.finish(true);else this.startShift(this.shiftIndex+1);}
  finish(victory){
    this.state=victory?'victory':'gameover';this.paused=false;const oldScore=this.records.bestScore,oldStreak=this.records.bestStreak;
    this.records.bestScore=Math.max(this.records.bestScore,this.score);this.records.bestStreak=Math.max(this.records.bestStreak,this.bestStreakThisRun);if(victory)this.records.clears++;this.saveRecords();
    this.onChange(this.state,{isScoreRecord:this.score>oldScore,isStreakRecord:this.bestStreakThisRun>oldStreak,victory});
  }
  boardRect(){const land=this.width/this.height>1.15,pad=land?Math.max(58,this.width*.075):Math.max(34,this.width*.08),top=land?Math.max(92,this.height*.21):Math.max(120,this.height*.22),bottom=land?Math.max(72,this.height*.17):Math.max(96,this.height*.17);return{x:pad,y:top,w:this.width-pad*2,h:Math.max(160,this.height-top-bottom)};}
  laneY(lane){const b=this.boardRect(),r=[.18,.5,.82],lo=Math.floor(lane),hi=Math.ceil(lane);if(lo===hi)return b.y+b.h*r[lo];const t=lane-lo;return lerp(b.y+b.h*r[lo],b.y+b.h*r[hi],t);}
  xPos(n){const b=this.boardRect();return b.x+b.w*n;} switchPoint(s){return{x:this.xPos(s.x),y:(this.laneY(s.pair[0])+this.laneY(s.pair[1]))*.5};}
  frame(now){const raw=Math.min(.05,Math.max(0,(now-this.lastFrame)/1000));this.lastFrame=now;this.acc+=raw;while(this.acc>=this.step){this.update(this.step);this.acc-=this.step;}this.render();requestAnimationFrame(this.frame);}
  render(){const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);this.drawBackground(c);this.drawBoard(c);if(this.state==='title')this.drawTitleDemo(c);else this.drawTrains(c);this.drawRipples(c);}
  drawBackground(c){
    const g=c.createLinearGradient(0,0,this.width,this.height);g.addColorStop(0,'#08111c');g.addColorStop(.55,'#0a1520');g.addColorStop(1,'#050b12');c.fillStyle=g;c.fillRect(0,0,this.width,this.height);
    c.globalAlpha=.3;c.strokeStyle='rgba(150,190,210,.08)';c.lineWidth=1;for(let x=0;x<this.width;x+=34){c.beginPath();c.moveTo(x,0);c.lineTo(x,this.height);c.stroke();}for(let y=0;y<this.height;y+=34){c.beginPath();c.moveTo(0,y);c.lineTo(this.width,y);c.stroke();}c.globalAlpha=1;
  }
  drawBoard(c){
    const b=this.boardRect(),active=this.state==='title'?[0,1,2,3]:this.config.active,maintenance=this.state==='title'?null:this.config.maintenance;c.save();c.lineCap='round';c.lineJoin='round';
    for(let lane=0;lane<3;lane++){const y=this.laneY(lane);c.strokeStyle='rgba(135,167,181,.16)';c.lineWidth=8;c.beginPath();c.moveTo(this.xPos(.03),y);c.lineTo(this.xPos(.965),y);c.stroke();c.strokeStyle='rgba(183,212,220,.42)';c.lineWidth=1.5;c.beginPath();c.moveTo(this.xPos(.03),y);c.lineTo(this.xPos(.965),y);c.stroke();for(let x=this.xPos(.04);x<this.xPos(.955);x+=21){c.strokeStyle='rgba(160,186,194,.18)';c.beginPath();c.moveTo(x,y-5);c.lineTo(x,y+5);c.stroke();}}
    for(const s of this.switches){
      const p=this.switchPoint(s),x0=this.xPos(s.x-.055),x1=this.xPos(s.x+.055),ya=this.laneY(s.pair[0]),yb=this.laneY(s.pair[1]),enabled=active.includes(s.id)&&maintenance!==s.id,locked=this.state!=='title'&&this.isSwitchLocked(s.id),cross=this.state==='title'?(s.id%2===0):s.cross;
      c.strokeStyle='rgba(122,150,162,.20)';c.lineWidth=5;c.beginPath();c.moveTo(x0,ya);c.lineTo(x1,yb);c.stroke();c.beginPath();c.moveTo(x0,yb);c.lineTo(x1,ya);c.stroke();
      if(enabled){c.strokeStyle=locked?'#ff6975':'#73e0db';c.lineWidth=2.6+s.pulse*1.8;c.shadowBlur=16+s.pulse*14;c.shadowColor=c.strokeStyle;if(cross){c.beginPath();c.moveTo(x0,ya);c.lineTo(x1,yb);c.stroke();c.beginPath();c.moveTo(x0,yb);c.lineTo(x1,ya);c.stroke();}else{c.beginPath();c.moveTo(x0,ya);c.lineTo(x1,ya);c.stroke();c.beginPath();c.moveTo(x0,yb);c.lineTo(x1,yb);c.stroke();}c.shadowBlur=0;}
      const r=14+s.pulse*4;c.fillStyle=maintenance===s.id?'rgba(255,164,78,.18)':enabled?'#081a1e':'#10181d';c.strokeStyle=s.reject>0?'#ff6b78':maintenance===s.id?'#ffa44e':enabled?'#75ddd7':'#51636a';c.lineWidth=s.reject>0?3:1.5;c.beginPath();c.roundRect(p.x-r,p.y-r,r*2,r*2,5);c.fill();c.stroke();c.fillStyle=maintenance===s.id?'#ffb86e':enabled?'#d8fffb':'#63757d';c.font='700 9px ui-monospace,monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(s.label,p.x,p.y+.5);
      if(maintenance===s.id||locked){c.fillStyle=maintenance===s.id?'#ffb86e':'#ff8790';c.font='700 8px system-ui';c.fillText(maintenance===s.id?'MNT':'LOCK',p.x,p.y+25);}
    }
    for(let lane=0;lane<3;lane++)this.drawTerminal(c,lane);c.fillStyle='rgba(190,216,224,.42)';c.font='700 9px ui-monospace,monospace';c.textAlign='left';c.fillText('INBOUND',b.x,b.y-18);c.textAlign='right';c.fillText('PLATFORMS',b.x+b.w,b.y-18);
    if(this.state==='playing'&&this.shiftIndex===0&&!this.tutorialDone){const p=this.switchPoint(this.switches[0]);c.fillStyle='#dffffa';c.font='800 12px system-ui';c.textAlign='center';c.fillText('ここをタップ',p.x,p.y-45);}
    c.restore();
  }
  drawTerminal(c,lane){const x=this.xPos(.965),y=this.laneY(lane),color=COLORS[lane];c.save();c.shadowColor=color;c.shadowBlur=16;c.fillStyle=color;c.beginPath();c.roundRect(x-5,y-19,10,38,4);c.fill();c.shadowBlur=0;c.fillStyle='#061016';c.font='900 10px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(NAMES[lane],x,y+.5);c.fillStyle=color;c.font='700 9px ui-monospace,monospace';c.textAlign='right';c.fillText('HOME '+NAMES[lane],x-12,y-25);c.restore();}
  drawTrains(c){for(const t of this.trains)if(t.alive)this.drawTrain(c,this.xPos(t.x),this.laneY(t.visualLane),t);}
  drawTrain(c,x,y,t){const color=COLORS[t.targetLane],w=t.express?48:42,h=t.express?17:15;c.save();c.translate(x,y);c.shadowColor=color;c.shadowBlur=13+(t.glow||0)*8;c.fillStyle='#dce9ec';c.strokeStyle=t.express?'#ffeaa1':color;c.lineWidth=t.express?2.4:1.5;c.beginPath();c.roundRect(-w/2,-h/2,w,h,5);c.fill();c.stroke();c.shadowBlur=0;c.fillStyle='#102029';c.beginPath();c.roundRect(-w*.34,-h*.25,w*.48,h*.5,2);c.fill();c.fillStyle=color;c.beginPath();c.arc(w*.29,0,4.7,0,TAU);c.fill();c.fillStyle='#071016';c.font='900 8px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(NAMES[t.targetLane],w*.29,.5);if(t.express){c.fillStyle='#ffeaa1';c.font='800 7px ui-monospace';c.fillText('EXP',0,-h*.95);}c.restore();}
  drawTitleDemo(c){const s=[{x:.18,lane:0,targetLane:2,express:false},{x:.47,lane:2,targetLane:0,express:true},{x:.72,lane:1,targetLane:1,express:false}];for(const t of s)this.drawTrain(c,this.xPos(t.x),this.laneY(t.lane),t);}
  drawRipples(c){for(const r of this.ripples){const t=clamp(r.t/.55,0,1);c.save();c.globalAlpha=1-t;c.strokeStyle=r.good?'#82f1e8':'rgba(190,208,215,.45)';c.lineWidth=1.5;c.beginPath();c.arc(r.x,r.y,8+t*30,0,TAU);c.stroke();c.restore();}}
}
