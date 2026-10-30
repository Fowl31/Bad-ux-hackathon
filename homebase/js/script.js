/*
 * Homebase - script.js
 * A deliberately awful account-deletion flow, built for a UI hackathon on "bad UX".
 *
 * Flow: login -> dashboard -> drag tiles into the bin (reason survey per tile)
 *       -> empty bin (retention offer, "Are you sure?", captcha, fake progress)
 *       -> roulette -> fake success.
 * Press Shift+D for demo mode (no dodging, shorter timers, guaranteed win).
 *
 * No dependencies and no build step. The state object `st` holds the whole session.
 */

const ICONS={
user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
chart:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
mail:'<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/>',
calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
folder:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
card:'<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
bell:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
home:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
alert:'<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
check:'<circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/>',
info:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
help:'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
};
const ic=(n,s=24)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
const TILES=[
{id:'profile',icon:'user',name:'Profile',stat:'1 person',color:'#0a64d4',guilt:'This is literally you.'},
{id:'messages',icon:'mail',name:'Messages',stat:'6 unread',color:'#f08a00',guilt:'6 people are waiting for a reply.'},
{id:'files',icon:'folder',name:'Files',stat:'212 files',color:'#d4a300',guilt:'You made all 212 of these.'},
{id:'photos',icon:'image',name:'Photos',stat:'1,038 photos',color:'#2f9e2f',guilt:'These are your memories.'},
{id:'billing',icon:'card',name:'Billing',stat:'Paid in full',color:'#8a3fc4',guilt:'You already paid for this month.'}
];
const T=Object.fromEntries(TILES.map(t=>[t.id,t]));
const $=i=>document.getElementById(i);
const grid=$('grid'),bin=$('bin'),modal=$('modal');
let st,dz,drag=null,idle=null,tt=null;

function fresh(demo){st={mode:'idle',bin:[],left:TILES.map(t=>t.id),busy:false,cap:3,lastDrop:-1e9,offered:false,drops:0,rounds:0,demo:!!demo};dz={};TILES.forEach(t=>{dz[t.id]={n:0,x:0,y:0,t:0}})}
function show(n){['login','app','roulette','done'].forEach(s=>{$(s).hidden=s!==n})}
function toast(m){const e=$('toast');e.textContent=m;e.hidden=false;clearTimeout(tt);tt=setTimeout(()=>{e.hidden=true},3200)}
function binMsg(m,shake){const e=$('binmsg');e.textContent=m;e.classList.remove('shake');if(shake){void e.offsetWidth;e.classList.add('shake')}}

function renderGrid(){
  grid.innerHTML='';
  st.left.forEach(id=>{
    const t=T[id],d=dz[id],c=document.createElement('div');
    c.className='cell';
    c.innerHTML=`<div class="tile${d.n>=3?' tamed':''}" data-id="${id}" style="--c:${t.color};transform:translate(${d.x}px,${d.y}px)">${ic(t.icon,40)}<div class="tt"><b>${t.name}</b><span>${t.stat}</span></div></div>`;
    grid.appendChild(c);
  });
  if(!st.left.length)grid.innerHTML='<p class="empty">Nothing left here. Empty the bin to finish.</p>';
  const n=st.left.length;
  $('count').textContent=`${n} item${n===1?'':'s'} left on your dashboard`+(st.bin.length?` · ${st.bin.length} in the bin`:'');
}
function renderBin(){
  const n=st.bin.length;
  $('binlabel').textContent=`Bin ${n}/${st.cap}`;
  $('slots').innerHTML=Array.from({length:st.cap},(_,i)=>i).map(i=>`<div class="slot${st.bin[i]?' full':''}">${st.bin[i]?ic(T[st.bin[i]].icon,30):''}</div>`).join('');
  $('empty').disabled=!n||st.busy;
  $('binmsg').hidden=st.busy;
  $('progress').hidden=!st.busy;
}
function reset(){
  fresh(st&&st.demo);
  grid.classList.remove('deleting');
  $('notice').hidden=true;$('del-acct').hidden=false;bin.classList.remove('gone');
  closeModal();
  renderGrid();renderBin();binMsg('The bin is empty.');
}

/* fleeing tiles */
function spread(src,px,py){
  grid.querySelectorAll('.tile').forEach(o=>{
    if(o===src)return;
    const d=dz[o.dataset.id],r=o.getBoundingClientRect();
    let vx=r.left+r.width/2-px,vy=r.top+r.height/2-py;
    const m=Math.hypot(vx,vy);if(!d||!m||m>230)return;
    vx/=m;vy/=m;
    d.x=Math.max(-50,Math.min(50,d.x+vx*28));d.y=Math.max(-50,Math.min(50,d.y+vy*28));
    o.style.transform=`translate(${d.x}px,${d.y}px)`;
  });
}
function dodge(el,px,py){
  const d=dz[el.dataset.id];if(!d||d.n>=3)return;
  const r=el.getBoundingClientRect();
  let vx=r.left+r.width/2-px,vy=r.top+r.height/2-py;
  const m=Math.hypot(vx,vy)||1;vx/=m;vy/=m;
  d.x=Math.max(-50,Math.min(50,d.x+vx*60));
  d.y=Math.max(-50,Math.min(50,d.y+vy*60));
  d.n++;d.t=performance.now();
  el.style.transform=`translate(${d.x}px,${d.y}px)`;
  if(d.n>=3)el.classList.add('tamed');
  spread(el,px,py);
}
const over=e=>{if(st.binGone)return false;const r=bin.getBoundingClientRect();return e.clientY>r.top&&e.clientX>=r.left&&e.clientX<=r.right};

grid.addEventListener('pointerdown',e=>{
  if(st.mode!=='delete'||drag||(e.pointerType==='mouse'&&e.button!==0))return;
  const el=e.target.closest('.tile');if(!el)return;
  if(st.busy){toast('The bin is busy emptying. Wait for it to finish.');return}
  const d=dz[el.dataset.id];
  if(!st.demo&&d.n<3){dodge(el,e.clientX,e.clientY);return}
  e.preventDefault();
  const r=el.getBoundingClientRect(),g=el.cloneNode(true);
  g.classList.add('ghost');
  g.style.cssText=`--c:${T[el.dataset.id].color};left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
  document.body.appendChild(g);
  el.style.opacity='.25';
  drag={el,g,dx:e.clientX-r.left,dy:e.clientY-r.top,id:el.dataset.id};
});
addEventListener('pointermove',e=>{
  if(drag){
    drag.g.style.left=(e.clientX-drag.dx)+'px';drag.g.style.top=(e.clientY-drag.dy)+'px';
    bin.classList.toggle('hot',over(e));return;
  }
  if(!st||st.mode!=='delete'||st.demo||e.pointerType!=='mouse')return;
  const now=performance.now();
  grid.querySelectorAll('.tile').forEach(el=>{
    const d=dz[el.dataset.id];if(!d)return;
    const r=el.getBoundingClientRect();
    const dist=Math.hypot(r.left+r.width/2-e.clientX,r.top+r.height/2-e.clientY);
    if(dist>260){if(d.n||d.x||d.y){d.n=0;d.x=0;d.y=0;el.style.transform='';el.classList.remove('tamed')}return}
    if(d.n>=3||now-d.t<350)return;
    if(dist<Math.max(r.width,r.height)*.75)dodge(el,e.clientX,e.clientY);
  });
});
function endDrag(e,drop){
  if(!drag)return;
  const{el,g,id}=drag;drag=null;g.remove();el.style.opacity='';bin.classList.remove('hot');
  if(drop&&over(e))toBin(id);
}
addEventListener('pointerup',e=>endDrag(e,true));
addEventListener('pointercancel',e=>endDrag(e,false));

function toBin(id){
  if(st.bin.length>=st.cap){binMsg('Bin full. Empty it to continue.',true);return}
  const gap=performance.now()-st.lastDrop;
  if(!st.demo&&gap<5000){binMsg(`Too many deletions at once. Try again in ${Math.ceil((5000-gap)/1000)}s.`,true);return}
  survey(id);
}
function commit(id){
  st.bin.push(id);st.left=st.left.filter(x=>x!==id);touch();st.lastDrop=performance.now();
  renderGrid();renderBin();
  binMsg(T[id].guilt+(st.bin.length===st.cap?' Bin full. Empty it to continue.':''));
  if(++st.drops===2&&!st.demo)newsletter();
}

/* interruptions: retention offer, newsletter popup, session expiry */
function offer(){
  modal.hidden=false;
  modal.innerHTML=`<div class="dlg" role="dialog" aria-modal="true">${ic('info',40)}<h2>Wait! Stay for 3 months free.</h2><p>Your plan, no charge. Cancel any time. You will not have to do all this again.</p><button class="primary" id="claim" type="button">Claim 3 months free</button><button class="link" id="nothx" type="button">No thanks, I like paying</button></div>`;
  $('claim').onclick=()=>{reset();toast('3 months added. Your items are back where they were.')};
  $('nothx').onclick=()=>{closeModal();askSure()};
}
function newsletter(){
  modal.hidden=false;
  modal.innerHTML=`<div class="dlg" role="dialog" aria-modal="true"><button class="tinyx" id="nlx" type="button" aria-label="Close">x</button><h2>Before you go</h2><p>Get weekly tips about the account you are deleting.</p><button class="primary" id="nlsub" type="button">Subscribe</button><button class="link" id="nlno" type="button">No thanks, I don't like good news</button></div>`;
  $('nlsub').onclick=()=>{closeModal();toast('Subscribed. You will hear from us daily.')};
  $('nlno').onclick=closeModal;$('nlx').onclick=closeModal;
}
function expire(){
  let tries=0;
  modal.hidden=false;
  modal.innerHTML=`<div class="dlg" role="dialog" aria-modal="true"><h2>Your session expired</h2><p>For your security, log in again to continue deleting.</p><input class="sel" id="xemail" readonly><input class="sel" id="xpw" type="password" placeholder="Password" autocomplete="current-password"><p class="err" id="xerr" role="alert"></p><button class="primary" id="xgo" type="button">Log in</button></div>`;
  $('xemail').value=$('who').textContent;
  $('xgo').onclick=()=>{
    if($('xpw').value.length<4){$('xerr').textContent='Password must be at least 4 characters.';return}
    if(tries++===0){$('xerr').textContent='Incorrect password. Try again.';$('xpw').value='';return}
    closeModal();toast('Welcome back. Your progress was saved.');
  };
}

/* required reason survey */
const REASONS=['My cat asked me to','It is a Tuesday','The tile looked at me','Mercury is in retrograde','I am a toaster','For legal reasons','Reason not listed'];
function survey(id){
  let rejected=null,first=true;
  const NEED=st.demo?0:30;
  modal.hidden=false;
  modal.innerHTML=`<div class="dlg" role="dialog" aria-modal="true"><h2>Why are you deleting ${T[id].name}?</h2><p>Required. Two short questions.</p><label class="q" for="why">1. Pick the closest reason</label><select id="why" class="sel"></select><label class="q" for="more">2. Tell us more (<span id="need">${NEED}</span> more characters)</label><textarea id="more" class="sel" rows="3" placeholder="Typing only. Pasting is disabled."></textarea><p class="err" id="whyerr" role="alert"></p><button class="primary" id="whygo" type="button" disabled>Submit</button></div>`;
  const upd=()=>{const left=Math.max(0,NEED-$('more').value.trim().length);$('need').textContent=left;$('whygo').disabled=!$('why').value||left>0};
  const fill=()=>{
    const keep=$('why').value,o=REASONS.slice().sort(()=>Math.random()-.5);
    $('why').innerHTML='<option value="" disabled>Select a reason</option>'+o.map(x=>`<option${x===keep?' selected':''}>${x}</option>`).join('');
    if(!keep)$('why').selectedIndex=0;
    upd();
  };
  $('why').onchange=()=>{$('whyerr').textContent='';fill()};
  $('more').oninput=upd;
  $('more').onpaste=e=>{e.preventDefault();$('whyerr').textContent='Pasting is disabled. Please type your answer.'};
  $('whygo').onclick=()=>{
    const v=$('why').value,err=$('whyerr');
    if(v==='Reason not listed'){err.textContent='That reason is not listed. Pick a listed reason.';$('why').value='';fill();return}
    if(!st.demo&&first){first=false;rejected=v;err.textContent='That reason is too common. Pick a different one.';$('why').value='';fill();return}
    if(rejected&&v===rejected){err.textContent='You already tried that one. Pick a different reason.';$('why').value='';fill();return}
    closeModal();commit(id);
  };
  fill();
}

/* delete flow */
$('del-acct').onclick=()=>{
  st.mode='delete';grid.classList.add('deleting');
  $('notice').innerHTML=ic('info',20)+'<div><b>To delete your account, remove every item below.</b><br>Drag each one to the bin. The bin changes size every time it is emptied.</div>';
  $('notice').hidden=false;$('del-acct').hidden=true;
  binMsg('Drag items here.');
};
$('empty').onclick=askSure;

function closeModal(){modal.hidden=true;modal.innerHTML='';clearInterval(idle)}
function askSure(){
  if(!st.bin.length||st.busy)return;
  if(!st.offered&&!st.demo){st.offered=true;offer();return}
  const n=st.bin.length;
  modal.hidden=false;
  modal.innerHTML=`<div class="dlg" role="dialog" aria-modal="true">${ic('alert',40)}<h2>Are you sure?</h2><p>This permanently deletes ${n} item${n>1?'s':''} from your account. This cannot be undone.</p><div class="btns" id="btns"><button class="primary" id="keep" type="button">Keep my account</button><button class="link" id="del" type="button">Delete</button></div><p class="fine" id="win"></p></div>`;
  let flips=0,last=0;
  const swap=()=>{const now=performance.now();if(flips>=4||now-last<500)return;flips++;last=now;$('btns').classList.toggle('flip')};
  $('keep').onpointerenter=swap;$('del').onpointerenter=swap;
  $('keep').onclick=()=>{reset();toast('Account kept. Everything is back where it was.')};
  $('del').onclick=()=>{closeModal();startEmpty()};
  clearInterval(idle);
  const end=performance.now()+(st.demo?3000:10000);
  const tick=()=>{const s=Math.ceil((end-performance.now())/1000);if(s<=0){clearInterval(idle);captcha();return}$('win').textContent=`You have ${s}s to answer.`};
  tick();idle=setInterval(tick,250);
}
function captcha(){
  const target='eybdoog';let pos=0;
  const letters='eybdooglmtra'.split('').sort(()=>Math.random()-.5);
  modal.innerHTML=`<div class="dlg" role="dialog" aria-modal="true"><h2>Verify you are human</h2><p>Spell <b>goodbye</b> backwards. Click the letters in order.</p><div class="typed" id="typed"></div><div class="letters" id="letters">${letters.map(l=>`<button type="button" class="ltr">${l}</button>`).join('')}</div><p class="err" id="cmsg" role="alert"></p></div>`;
  const draw=()=>{$('typed').textContent=target.split('').map((c,i)=>i<pos?c:'_').join(' ')};
  draw();
  $('letters').onclick=e=>{
    const b=e.target.closest('.ltr');if(!b||b.disabled)return;
    if(b.textContent===target[pos]){
      b.disabled=true;pos++;draw();
      if(pos===target.length){closeModal();startEmpty()}
    }else{
      pos=0;document.querySelectorAll('.ltr').forEach(x=>{x.disabled=false});
      $('cmsg').textContent='Wrong letter. Start again.';draw();
    }
  };
}

/* fake progress */
const P=[[0,0],[.15,35],[.28,52],[.34,41],[.5,78],[.58,99],[.7,99],[.701,0],[1,100]];
function prog(t){for(let i=1;i<P.length;i++){if(t<=P[i][0]){const a=P[i-1],b=P[i];return a[1]+(b[1]-a[1])*(t-a[0])/(b[0]-a[0])}}return 100}
function stage(t,n){return t<.15?`Deleting ${n} item${n>1?'s':''}...`:t<.34?'Locating your data...':t<.58?'Almost there...':t<.7?'Finalizing. Do not close this page.':t<.8?'Connection lost. Starting over.':'Retrying...'}
const LIES=['8s','2 min','45s','1s','3 min','12s','almost no time'];
function startEmpty(){
  st.busy=true;renderBin();
  let lastSec=-1;
  const D=st.demo?3000:14000,t0=performance.now(),n=st.bin.length;
  const iv=setInterval(()=>{
    const el=performance.now()-t0,t=Math.min(1,el/D);
    const p=prog(t);
    const pc=Math.round(p);
    $('bar').style.width=pc+'%';
    $('ptext').textContent=`${stage(t,n)} ${pc}%`;
    const sec=Math.floor(el/1000);
    if(sec!==lastSec){lastSec=sec;$('psec').textContent=LIES[Math.random()*LIES.length|0]+' left'}
    if(t>=1){clearInterval(iv);finishEmpty()}
  },100);
}
function finishEmpty(){
  st.bin=[];st.busy=false;
  renderBin();renderGrid();
  if(!st.left.length){roulette();return}
  const prev=st.cap;let c;
  do{c=(1+Math.random()*3)|0}while(c===prev);
  st.cap=c;renderBin();
  binMsg(`Bin emptied. It now holds ${c} item${c>1?'s':''}. ${st.left.length} item${st.left.length>1?'s':''} to go.`);
  toast('Bin emptied.');
  if(++st.rounds===2&&!st.demo)expire();
}

/* roulette: 2 of 6 segments delete the account, the rest restart everything */
const COLS=['#e5483b','#f2a21b','#3b7bd8','#a64bd6'];
const SEG=['DELETED','RESTART','RESTART','DELETED','RESTART','RESTART'];
function wheelSVG(){
  const n=SEG.length,R=140,c=150,f=v=>v.toFixed(1);let out='';
  SEG.forEach((s,i)=>{
    const a0=i/n*2*Math.PI-Math.PI/2,a1=(i+1)/n*2*Math.PI-Math.PI/2,am=(a0+a1)/2,win=s==='DELETED';
    const tx=f(c+R*.62*Math.cos(am)),ty=f(c+R*.62*Math.sin(am));
    out+=`<path d="M${c} ${c}L${f(c+R*Math.cos(a0))} ${f(c+R*Math.sin(a0))}A${R} ${R} 0 0 1 ${f(c+R*Math.cos(a1))} ${f(c+R*Math.sin(a1))}Z" fill="${win?'#2f9e2f':COLS[i%4]}" stroke="#111" stroke-width="2"/>`;
    out+=`<text x="${tx}" y="${ty}" transform="rotate(${f(am*180/Math.PI)} ${tx} ${ty})" text-anchor="middle" dominant-baseline="central" font-family="Arial,sans-serif" font-weight="700" font-size="13" fill="#fff">${s}</text>`;
  });
  return out+`<circle cx="${c}" cy="${c}" r="14" fill="#fff" stroke="#111" stroke-width="2"/>`;
}
function roulette(){
  show('roulette');
  const g=$('wheelg');g.style.transition='none';g.style.transform='rotate(0deg)';void g.getBoundingClientRect();
  $('spin').disabled=false;$('rres').textContent='';
  $('odds').textContent=st.demo?'Demo mode: guaranteed.':'Odds of deletion: 2 in 6.';
}
$('spin').onclick=()=>{
  $('spin').disabled=true;
  const wins=[0,3],k=st.demo?wins[Math.random()*2|0]:(Math.random()*6|0);
  const base=((360-((k+.5)*60))%360)+(Math.random()-.5)*44;
  const dur=matchMedia('(prefers-reduced-motion: reduce)').matches?1:5;
  const g=$('wheelg');
  g.style.transition=`transform ${dur}s cubic-bezier(.12,.6,.1,1)`;
  g.style.transform=`rotate(${1800+base}deg)`;
  setTimeout(()=>{
    if(SEG[k]==='DELETED'){$('rres').textContent='DELETED';setTimeout(finale,1200)}
    else{
      $('rres').textContent='RESTART. Account not deleted.';
      setTimeout(()=>{show('app');reset();toast('Not deleted. Everything is back. Start again.')},2200);
    }
  },dur*1000+250);
};

/* fake success */
function confetti(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const c=$('confetti'),x=c.getContext('2d');
  c.width=innerWidth;c.height=innerHeight;c.hidden=false;
  const cols=['#1d4ed8','#b42318','#f59e0b','#15803d','#7c3aed'];
  const ps=Array.from({length:120},()=>({x:innerWidth/2,y:innerHeight/2.2,vx:(Math.random()-.5)*14,vy:-Math.random()*13-3,s:5+Math.random()*6,c:cols[Math.random()*5|0],r:Math.random()*6}));
  let f=0;
  (function go(){
    x.clearRect(0,0,c.width,c.height);
    ps.forEach(p=>{p.vy+=.35;p.x+=p.vx;p.y+=p.vy;p.r+=.2;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/2,p.s,p.s*.6);x.restore()});
    if(++f<140)requestAnimationFrame(go);else c.hidden=true;
  })();
}
function finale(){
  show('done');$('twist').hidden=true;
  confetti();
  setTimeout(()=>{$('twist').hidden=false},2600);
}
$('again').onclick=()=>{$('pw').value='';show('login')};

/* login */
$('loginform').addEventListener('submit',e=>{
  e.preventDefault();
  const em=$('email').value.trim(),pw=$('pw').value,err=$('loginerr');
  if(!/^\S+@\S+\.\S+$/.test(em)){err.textContent='Enter a valid email address.';return}
  if(pw.length<4){err.textContent='Password must be at least 4 characters.';return}
  err.textContent='';
  $('who').textContent=em;
  show('app');reset();
});
$('logout').onclick=()=>show('login');

/* shortcut: Shift+D toggles demo mode (no fleeing, short timers) */
addEventListener('keydown',e=>{
  if(e.key!=='D'||!e.shiftKey||/INPUT|TEXTAREA/.test(e.target.tagName))return;
  st.demo=!st.demo;$('demotag').hidden=!st.demo;
});

/* static icons */
$('logobrand').innerHTML=ic('home',30)+'<span>Homebase</span>';
$('apphome').innerHTML=ic('home',22)+'<span>Homebase</span>';
$('topicons').innerHTML=ic('search',20)+ic('bell',20);
$('binicon').innerHTML=ic('trash',112);
$('doneicon').innerHTML=ic('check',96);
$('wheelg').innerHTML=wheelSVG();
/* respawn: after 15s of no progress, one deleted tile comes back */
let lastAct=performance.now();
const touch=()=>{lastAct=performance.now()};
setInterval(()=>{
  if(!st||st.mode!=='delete'||st.busy||drag||!modal.hidden||$('app').hidden){touch();return}
  if(performance.now()-lastAct<(st.demo?60000:15000))return;
  touch();
  const gone=TILES.map(t=>t.id).filter(id=>!st.left.includes(id)&&!st.bin.includes(id));
  if(!gone.length)return;
  const id=gone[Math.random()*gone.length|0];
  dz[id]={n:0,x:0,y:0,t:0};st.left.push(id);
  renderGrid();toast('Item restored for your convenience!');
},1000);
/* the bin vanishes for a few seconds at random */
let nextVan=performance.now()+9000;
setInterval(()=>{
  if(!st||st.mode!=='delete'){nextVan=performance.now()+9000;return}
  if(st.demo||st.busy||st.binGone||drag||!modal.hidden||$('app').hidden)return;
  if(performance.now()<nextVan)return;
  st.binGone=true;bin.classList.add('gone');
  setTimeout(()=>{bin.classList.remove('gone');if(st)st.binGone=false;nextVan=performance.now()+8000+Math.random()*8000},3000+Math.random()*2000);
},1000);
fresh(false);
new ResizeObserver(()=>{document.body.style.paddingBottom=(bin.offsetHeight+24)+'px'}).observe(bin);
