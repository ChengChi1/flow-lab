/* Educational, depth-averaged kinematics; not a CFD solution. */
const motion = { time: 0, rate: 1, paused: matchMedia('(prefers-reduced-motion: reduce)').matches, tracks: [], last: null };
const animationBar = document.createElement('div');
animationBar.className = 'animation-bar';
animationBar.innerHTML = '<button id="pauseFlow" type="button">Pause</button><label for="flowRate">Playback</label><select id="flowRate"><option value="0.25">¼ speed</option><option value="0.5">½ speed</option><option value="1" selected>Real time</option></select><span id="motionStatus"></span>';
$('scene').after(animationBar);
const modelNote = document.createElement('p');
modelNote.className = 'model-note';
animationBar.after(modelNote);
const style = document.createElement('style');
style.textContent = '.animation-bar{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:8px 0 14px;font-size:14px}.animation-bar button,.animation-bar select{font:inherit;border:1px solid #a7c5c9;border-radius:6px;background:#fff;color:#1e5159;padding:7px 11px}.animation-bar span{margin-left:auto;color:#587c82;font-size:13px}.model-note{font-size:13px;line-height:1.55;margin:0 0 18px}.model-note a{color:#147078}.jet-tracer,.jet-tracer *{transition:none!important;animation:none!important}.tracer{fill:#f2ffff;stroke:#167f8c;stroke-width:.65;pointer-events:none}';
document.head.append(style);
function playbackLabel(){ $('pauseFlow').textContent=motion.paused?'Play':'Pause';$('pauseFlow').setAttribute('aria-pressed',String(motion.paused)); }
$('pauseFlow').onclick=()=>{motion.paused=!motion.paused;playbackLabel()};
$('flowRate').onchange=e=>{motion.rate=Number(e.target.value)};
playbackLabel();
const point=(x,y)=>({x,y});
const pathOf=points=>points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join(' ');
function traceMarkup(tracks){
 let html='';motion.tracks=[];
 tracks.forEach((track,j)=>{for(let i=0;i<track.count;i++){
  const id=`tracer-${j}-${i}`;
  // Uneven spacing and a visible trailing streak prevent the repeating-pattern
  // (wagon-wheel) illusion in the fast, short downstream flight.
  const phase=(i+(track.downstream?.17*Math.sin(i*2.4+j):0)+.37*j)/track.count;
  const radius=(track.radius||2.2)*(track.downstream?(i%2?.8:1.15):1);
  html+=track.downstream?`<g id="${id}" class="jet-tracer"><path fill="none" stroke="#efffff" stroke-width="1.3" stroke-linecap="round"/><circle class="tracer" r="${radius}"/></g>`:`<circle id="${id}" class="tracer" r="${radius}"/>`;
  motion.tracks.push({id,track,phase,cycle:null});
 }});return html;
}
function drawTracers(){
 for(const p of motion.tracks){
  const age=(p.track.stationary?0:motion.time)+p.phase*p.track.duration,cycle=Math.floor(age/p.track.duration);
  const t=age-cycle*p.track.duration,xy=p.track.at(t),el=document.getElementById(p.id);
  if(!el)continue;
  if(p.track.downstream){
   // A completed particle disappears before its replacement is positioned at
   // the crest. Never show a right-to-left reset as part of its trajectory.
   const wrapped=p.cycle!==null&&cycle!==p.cycle;
   const progress=t/p.track.duration;
   el.setAttribute('opacity',wrapped?0:Math.min(1,progress/.12,(1-progress)/.12));
   const circle=el.querySelector('circle'),tail=el.querySelector('path');
   circle.setAttribute('cx',xy.x);circle.setAttribute('cy',xy.y);
   const previous=p.track.at(Math.max(0,t-.025));
   tail.setAttribute('d',`M${previous.x} ${previous.y}L${xy.x} ${xy.y}`);
  }else{el.setAttribute('cx',xy.x);el.setAttribute('cy',xy.y)}
  p.cycle=cycle;
 }
}
function jetModel(p,q){
  const flux=q/p.b,g=9.81;
  // Choose the smaller positive thickness satisfying q/b = d*u,
  // u²/(2g) + d/2 = H (negligible upstream velocity head).
  let low=0,high=p.h;
  for(let i=0;i<64;i++){const d=(low+high)/2;if(d*Math.sqrt(2*g*(p.h-d/2))<flux)low=d;else high=d}
  const d=(low+high)/2,u=flux/d,flight=Math.sqrt(2*(p.z+d/2)/g);
  return {d,u,flight,flux,at(t,f=0){const vy=g*t,v=Math.hypot(u,vy),thickness=flux/v;return{x:u*t-f*thickness*vy/v,y:-d/2+.5*g*t*t+f*thickness*u/v,thickness,v}}};
}
function renderPhysics(){
 const p=states[mode],r=calculate(),scene=$('scene');
 scene.setAttribute('viewBox','0 0 780 330');
 let svg=defs,tracks=[];
 if(mode==='m'){
   const scale=27.5,length=12,depth=p.y*scale,start=35,end=start+length*scale,bed=235,drop=length*p.s*scale;
   svg+=`<text x="32" y="34">12 m CHANNEL REACH</text><path d="M${start} ${bed-depth}L${end} ${bed+drop-depth}V${bed+drop}L${start} ${bed}Z" fill="url(#water)"/><path d="M${start} ${bed}L${end} ${bed+drop}" stroke="#285b61" stroke-width="4"/><path d="M${start} ${bed-depth}L${end} ${bed+drop-depth}" stroke="#2294a3" stroke-width="2"/><text x="40" y="90">V = Q/A = ${fmt(r.v,2)} m/s →</text><text x="40" y="113">Steady depth · parallel surface and bed</text>`;
   for(const fraction of [.2,.5,.8])tracks.push({count:13,stationary:r.v===0,duration:r.v===0?1:length*Math.hypot(1,p.s)/r.v,radius:Math.min(2.2,Math.max(.7,depth/10)),at(t){const x=r.v===0?t*length:r.v*t/Math.hypot(1,p.s);return point(start+x*scale,bed-depth*fraction+x*p.s*scale)}});
   svg+=dim(start,281,end,281,'12 m',183,306);
   const sectionScale=Math.min(250/p.b,153/p.y),left=574-p.b*sectionScale/2,right=574+p.b*sectionScale/2,top=241-p.y*sectionScale;
   const outline=sectionGeometry(p).points.map(v=>point(left+v[0]*p.b*sectionScale,top+v[1]*p.y*sectionScale));
   svg+=`<text x="440" y="34">${p.shape==='custom'?'HAND-DRAWN':'RECTANGULAR'} CROSS SECTION</text><path d="${pathOf(outline)}Z" fill="url(#water)"/><path d="${pathOf(outline)}" fill="none" stroke="#285b61" stroke-width="4" stroke-linejoin="round"/><path d="M${left} ${top}H${right}" stroke="#2294a3" stroke-width="2"/><text x="448" y="62">A = ${fmt(r.a,2)} m² · P = ${fmt(r.per,2)} m</text>`;
   svg+=dim(left,281,right,281,`b = ${fmt(p.b,1)} m`,530,306)+dim(right+18,top,right+18,241,'y',right+27,(top+241)/2);
   $('motionStatus').textContent=r.v===0?'Zero slope · no uniform flow':`12 m transit: ${fmt(length*Math.hypot(1,p.s)/r.v,1)} s`;
   modelNote.textContent='Particles move at the calculated depth-averaged velocity V = Q/A. The side view uses equal horizontal and vertical scales; cross section is enlarged separately. Near-wall shear and turbulence are not resolved.';
 }else{
   const valid=r.q!==null;
   // Invalid coefficient ranges have geometry only; no extrapolated discharge or jet.
   if(!valid){const scale=190/(p.z+p.h),crest=260-p.z*scale,level=260-(p.z+p.h)*scale;svg+=`<path d="M35 ${level}H320V260H35Z" fill="url(#water)"/><path d="M320 260V${crest}" stroke="#285b61" stroke-width="5"/><text x="370" y="145">Animation unavailable: H/Z &gt; 2</text><text x="370" y="171">Reduce H or increase Z.</text>`+dim(90,level,90,crest,'H',108,(level+crest)/2)+dim(90,crest,90,260,'Z',108,(crest+260)/2);$('motionStatus').textContent='Outside formula range';modelNote.textContent='The discharge coefficient is outside its stated validity range. No flow trajectory is estimated.';
   }else{
    const jet=jetModel(p,r.q),scale=Math.min(180/(p.z+p.h),365/(jet.u*jet.flight+jet.d)),launch=320,floor=260,crest=floor-p.z*scale,level=crest-p.h*scale;
    const xy=(t,f=0)=>{const a=jet.at(t,f);return point(launch+a.x*scale,crest+a.y*scale)};
    const upper=[],lower=[];for(let i=0;i<=90;i++){const t=jet.flight*i/90;upper.push(xy(t,-.5));lower.push(xy(t,.5))}
    const water=`M35 ${level}H220C275 ${level} 280 ${upper[0].y} ${launch} ${upper[0].y} ${pathOf(upper).replace(/^M/,'L')} ${pathOf([...lower].reverse()).replace(/^M/,'L')} L${launch} ${floor}H35Z`;
    svg+=`<defs><clipPath id="aboveFloor"><rect x="0" y="0" width="780" height="260"/></clipPath><clipPath id="wetRegion"><path d="${water}"/></clipPath></defs><text x="32" y="34">FREE OVERFLOW · SIDE VIEW</text><g clip-path="url(#aboveFloor)"><path d="${water}" fill="url(#water)"/><path d="M35 ${level}H220C275 ${level} 280 ${upper[0].y} 320 ${upper[0].y} ${pathOf(upper).replace(/^M/,'L')}" fill="none" stroke="#2294a3" stroke-width="2"/><path d="${pathOf(lower)}" fill="none" stroke="#2695a2" stroke-width="1.4"/></g><path d="M35 260H740" stroke="#78979b" stroke-width="3"/><path d="M320 260V${crest}L329 ${crest+12}V260Z" fill="#5c777d"/><path d="M63 ${crest}H320" stroke="#8aa9ad" stroke-dasharray="4 5"/>`;
    svg+=dim(85,level,85,crest,`H = ${fmt(p.h,2)} m`,100,(level+crest)/2)+dim(85,crest,85,floor,`Z = ${fmt(p.z,2)} m`,100,(crest+floor)/2);
    // Approximate converging upstream streamlines, with residence times obtained
    // by integrating ds/v and v=q/(b*local depth). Ballistic paths use exact t.
    const depth0=p.z+p.h;
    for(const f of [-.3,0,.3]){
      const samples=[];let total=0;
      for(let i=0;i<=100;i++){const x=35+(launch-35)*i/100,k=Math.max(0,(x-205)/(launch-205)),smooth=k*k*(3-2*k),depth=depth0+(jet.d-depth0)*smooth,center=(level+floor)/2+((crest-jet.d*scale/2)-(level+floor)/2)*smooth,y=center+f*depth*scale,v=jet.flux/depth;if(i){const previous=samples[i-1];total+=Math.hypot(x-previous.x,y-previous.y)/scale/((v+previous.v)/2)}samples.push({x,y,t:total,v})}
      tracks.push({count:12,duration:total,at(t){let lo=0,hi=samples.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(samples[mid].t<t)lo=mid;else hi=mid}const a=samples[lo],b=samples[hi],w=(t-a.t)/(b.t-a.t);return point(a.x+w*(b.x-a.x),a.y+w*(b.y-a.y))}});
      tracks.push({count:Math.max(2,Math.floor(jet.flight/.16)),downstream:true,duration:jet.flight,at:t=>xy(t,f),radius:Math.min(2.2,Math.max(.6,jet.d*scale/9))});
    }
    svg+=`<text x="360" y="52">Gravity accelerates the falling sheet</text><text x="360" y="75">Its thickness decreases as speed increases</text><text x="360" y="302">Crest width b = ${fmt(p.b,1)} m (into page)</text>`;
    $('motionStatus').textContent=`Launch ≈ ${fmt(jet.u,2)} m/s · fall ≈ ${fmt(jet.flight,2)} s`;
    modelNote.innerHTML='Simplified ventilated nappe: x = u₀t, downward Δy = ½gt²; sheet thickness δ = Q/(b|v|). Launch speed and thickness use continuity and an approximate energy balance, neglecting approach velocity head. Upstream convergence is illustrative; pressure, turbulence, and impact are not simulated. <a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ballistic-flight-equations/" target="_blank" rel="noopener">Ballistic-motion basis ↗</a>';
   }
 }
 svg+=`<g ${mode==='w'?'clip-path="url(#aboveFloor)"':''}><g ${mode==='w'?'clip-path="url(#wetRegion)"':''}>${traceMarkup(tracks)}</g></g>`;
 scene.innerHTML=svg;
 scene.setAttribute('aria-label',mode==='m'?'Channel tracers moving at computed mean velocity with constant depth':'Gravity-driven weir sheet accelerating and thinning downstream');
 drawTracers();
}
function animateFlow(now){if(motion.last!==null&&!motion.paused&&!document.hidden)motion.time+=Math.min((now-motion.last)/1000,.1)*motion.rate;motion.last=now;drawTracers();requestAnimationFrame(animateFlow)}
renderPhysics();requestAnimationFrame(animateFlow);
