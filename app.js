
const defaults={m:{b:3,y:1.2,n:.025,s:.005,fixedArea:null,material:'gravel',shape:'rectangle',profile:structuredClone(RECTANGLE)},w:{b:2,h:.6,z:1,fixedTotal:null}};const states=structuredClone(defaults);let mode='m';
const configs={m:[['b','Channel width',.5,8,.1,'m'],['y','Maximum water depth',.1,3,.05,'m'],['s','Bed slope S₀',0,.03,.0001,'m/m']],w:[['b','Crest width',.2,6,.1,'m'],['h','Head above crest',.05,2,.05,'m'],['z','Crest height',.2,3,.05,'m']]};
const $=id=>document.getElementById(id);const fmt=(v,d=3)=>Number(v).toLocaleString('en',{maximumFractionDigits:d,minimumFractionDigits:d});
function areaFactor(p){return polygonArea(p.shape==='custom'?p.profile:RECTANGLE)}
function dimensionBounds(m,p,k){
 const c=configs[m].find(c=>c[0]===k);let min=c[2],max=c[3];
 if(m==='m'&&p.shape==='custom'&&(k==='b'||k==='y'))return [Math.min(.01,p[k]/10),Math.max(c[3],p[k]*2)];
 if(m==='m'&&p.fixedArea!==null){const product=p.fixedArea/areaFactor(p);if(k==='b'){min=Math.max(min,product/3);max=Math.min(max,product/.1)}if(k==='y'){min=Math.max(min,product/8);max=Math.min(max,product/.5)}}
 if(m==='w'&&p.fixedTotal!==null){if(k==='h'){min=Math.max(min,p.fixedTotal-3);max=Math.min(max,p.fixedTotal-.2)}if(k==='z'){min=Math.max(min,p.fixedTotal-2);max=Math.min(max,p.fixedTotal-.05)}}
 if(Math.abs(max-min)<1e-10)max=min;
 return [min,max];
}
function enforceConstraint(m,p,changed=[]){
 if(m==='m'&&p.s<0)throw Error('Bed slope must be zero or positive.');
 const near=(a,b)=>Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(b));
 if(m==='m'&&p.fixedArea!==null){
  const factor=areaFactor(p),target=p.fixedArea,product=target/factor;
  if(!Number.isFinite(target)||target<=0||(p.shape!=='custom'&&(target<factor*.05-1e-10||target>factor*24+1e-10)))throw Error(`This outline allows a fixed area from ${fmt(factor*.05,4)} to ${fmt(factor*24,4)} m² within the width/depth limits.`);
  if(changed.includes('b')&&changed.includes('y')){if(!near(p.b*p.y,product))throw Error('These dimensions do not match the fixed area. Change only width or depth, or release the area lock.');}
  else if(changed.includes('y'))p.b=product/p.y;
  else if(changed.includes('b'))p.y=product/p.b;
  else if(p.shape==='custom'){const scale=Math.sqrt(target/sectionGeometry(p).a);p.b*=scale;p.y*=scale}
  else{p.b=Math.max(Math.max(.5,product/3),Math.min(Math.min(8,product/.1),p.b));p.y=product/p.b}
 }
 if(m==='w'&&p.fixedTotal!==null){
  const total=p.fixedTotal;if(!Number.isFinite(total)||total<.25||total>5)throw Error('H + Z must be between 0.25 and 5 m.');
  if(changed.includes('h')&&changed.includes('z')){if(!near(p.h+p.z,total))throw Error('H and Z do not match the fixed sum. Change only one, or release the sum lock.');}
  else if(changed.includes('z'))p.h=total-p.z;
  else{if(!changed.includes('h'))p.h=Math.max(Math.max(.05,total-3),Math.min(Math.min(2,total-.2),p.h));p.z=total-p.h}
 }
 for(const [key,label,min,max] of configs[m])if(!Number.isFinite(p[key])||(m==='m'&&p.shape==='custom'&&(key==='b'||key==='y')?p[key]<=0:p[key]<min-1e-9||p[key]>max+1e-9))throw Error(`${label} would exceed its allowed range. Choose a different value or release the lock.`);
 return p;
}
function commitFlowState(m,next){if(m==='m'&&JSON.stringify(next.profile)===JSON.stringify(states[m].profile))next.profile=states[m].profile;Object.assign(states[m],next)}
function lockError(message=''){if($('lockError'))$('lockError').textContent=message}
function syncControlValues(){
 const p=states[mode];for(const [k]of configs[mode]){const [min,max]=dimensionBounds(mode,p,k);for(const id of [k,'num-'+k]){const el=$(id);if(!el)continue;el.min=min;el.max=max;el.step='any';if(document.activeElement!==el||el.type!=='number')el.value=Number(p[k].toPrecision(12));el.setCustomValidity('')}const ends=$(k)?.parentElement.querySelector('.ends');if(ends){ends.children[0].textContent=fmt(min,3);ends.children[1].textContent=fmt(max,3)}}
 const fixed=mode==='m'?p.fixedArea:p.fixedTotal;
 if($('fixValue')){$('fixValue').checked=fixed!==null;$('fixedTarget').disabled=fixed===null;$('fixedTarget').setCustomValidity('');$('fixedTarget').value=Number((fixed??(mode==='m'?sectionGeometry(p).a:p.h+p.z)).toPrecision(12));const lo=mode==='m'?(p.shape==='custom'?Number.MIN_VALUE:areaFactor(p)*.05):.25,hi=mode==='m'?(p.shape==='custom'?Infinity:areaFactor(p)*24):5;$('fixedTarget').min=lo;if(Number.isFinite(hi))$('fixedTarget').max=hi;else $('fixedTarget').removeAttribute('max')}
}
function controls(){
 const p=states[mode];
 const choices=mode==='m'?`<div class="control"><label for="material">Channel material</label><select id="material" class="full-select">${Object.entries(MATERIALS).map(([id,m])=>`<option value="${id}" ${p.material===id?'selected':''}>${m.label}</option>`).join('')}</select><div id="roughnessInfo" class="material-note"></div></div><div class="control"><label for="sectionShape">Cross-section</label><select id="sectionShape" class="full-select"><option value="rectangle" ${p.shape==='rectangle'?'selected':''}>Rectangular</option><option value="custom" ${p.shape==='custom'?'selected':''}>Draw by hand</option></select><p class="material-note">For a drawn section, width and maximum depth scale the entire wetted outline.</p></div>`:'';
 const constraint=`<div class="constraint-box"><label class="constraint-toggle"><input type="checkbox" id="fixValue"> ${mode==='m'?'Fix cross-section area A':'Fix total height H + Z'}</label><div class="constraint-target"><label for="fixedTarget">${mode==='m'?'Area A':'H + Z'}</label><input id="fixedTarget" type="number" step="any"><span>${mode==='m'?'m²':'m'}</span></div><p>${mode==='m'?'Width and depth adjust together. A new drawing scales evenly to preserve area and the proportions you draw.':'Changing H adjusts Z, and vice versa. The H/Z validity limit still applies.'}</p><div id="lockError" role="status"></div></div>`;
 $('inputs').innerHTML=choices+constraint+configs[mode].map(([k,label,min,max,step,unit])=>`<div class="control"><div class="labelrow"><label for="${k}"><em>${k==='h'?'H':k==='z'?'Z':k==='s'?'S₀':k}</em>${label}</label><div class="value"><input aria-label="${label} value" type="number" id="num-${k}" min="${min}" max="${max}" step="any" value="${p[k]}">${unit}</div></div><input id="${k}" type="range" min="${min}" max="${max}" step="any" value="${p[k]}"><div class="ends"><span>${min}</span><span>${max} ${unit}</span></div></div>`).join('');
 configs[mode].forEach(([k])=>{for(const id of [k,'num-'+k])$(id).addEventListener('input',e=>{const [min,max]=dimensionBounds(mode,p,k),v=Number(e.target.value);try{if(e.target.value===''||!Number.isFinite(v)||v<min-1e-9||v>max+1e-9)throw Error(`Enter a value from ${fmt(min,6)} to ${fmt(max,6)}.`);const next=structuredClone(p);next[k]=v;enforceConstraint(mode,next,[k]);commitFlowState(mode,next);lockError();render()}catch(error){e.target.setCustomValidity(error.message);lockError(error.message)}})});
 $('fixValue').onchange=e=>{const next=structuredClone(p);if(mode==='m')next.fixedArea=e.target.checked?sectionGeometry(p).a:null;else next.fixedTotal=e.target.checked?p.h+p.z:null;commitFlowState(mode,enforceConstraint(mode,next));lockError();render()};
 $('fixedTarget').onchange=e=>{try{if(e.target.value==='')throw Error('Enter a fixed value.');const next=structuredClone(p);next[mode==='m'?'fixedArea':'fixedTotal']=Number(e.target.value);commitFlowState(mode,enforceConstraint(mode,next));lockError();render()}catch(error){e.target.setCustomValidity(error.message);lockError(error.message)}};
 if(mode==='m'){
  $('material').onchange=e=>{p.material=e.target.value;p.n=MATERIALS[p.material].n;render()};
  $('sectionShape').onchange=e=>{try{const next=structuredClone(p);if(e.target.value==='custom'&&next.fixedArea===null)next.fixedArea=sectionGeometry(p).a;next.shape=e.target.value;commitFlowState(mode,enforceConstraint(mode,next));lockError();render()}catch(error){e.target.value=p.shape;lockError(error.message)}};
 }
 render();
}
const defs=`<defs><linearGradient id="water" x2="0" y2="1"><stop stop-color="#69d8dc" stop-opacity=".7"/><stop offset="1" stop-color="#2ba7b4" stop-opacity=".9"/></linearGradient><pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#deebec"/></pattern><marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse"><path d="M0 0L6 3L0 6" fill="none" stroke="#487a80"/></marker></defs><rect width="780" height="310" fill="url(#grid)"/>`;
const dim=(x1,y1,x2,y2,label,tx,ty)=>`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#487a80" marker-start="url(#arrow)" marker-end="url(#arrow)"/><text x="${tx}" y="${ty}">${label}</text>`;
function calculate(){const p=states[mode];if(mode==='m'){const {a,per}=sectionGeometry(p),r=a/per,n=MATERIALS[p.material].n,q=a*Math.pow(r,2/3)*Math.sqrt(p.s)/n;return {q,a,per,r,v:q/a,n}}const ratio=p.h/p.z,cd=.564+.0846*ratio;return{ratio,cd,q:ratio<=2?cd*p.b*Math.sqrt(9.81)*Math.pow(p.h,1.5):null}}
function renderLegacy(){const p=states[mode],r=calculate();$('q').textContent=r.q===null?'—':fmt(r.q);if(mode==='m'){
$('diagramTitle').textContent='Uniform open-channel flow';$('assumptions').innerHTML='Steady, uniform flow in a channel of constant cross-section along its length.<br>α = 1.0 in SI units. Wetted perimeter includes banks and bed, never the free surface.';const material=MATERIALS[p.material];$('roughnessInfo').innerHTML=`<strong>Manning n = ${fmt(material.n)}</strong><br>Published range: ${material.range}. Representative teaching value; condition and vegetation matter.<br><a href="https://www.txdot.gov/manuals/des/hyd/chapter-4--hydrology/section-11--time-of-concentration/manning-s-roughness-coefficient-values.html" target="_blank" rel="noopener">Source: TxDOT Table 4-7 ↗</a>`;$('metric2').textContent='Mean velocity';$('v2').textContent=fmt(r.v,2);$('u2').textContent='m/s';$('metric3').textContent='Hydraulic radius';$('v3').textContent=fmt(r.r,2);$('u3').textContent='m';
$('formula').innerHTML='Q = (α/n) A R<sub>h</sub><sup>2/3</sup> S<sub>0</sub><sup>1/2</sup>';$('substitution').innerHTML=`A${p.fixedArea!==null?' (fixed)':''} ${p.shape==='rectangle'?'= b y':'(drawn area)'} = ${fmt(r.a)} m²<br>P ${p.shape==='rectangle'?'= b + 2y':'(drawn banks + bed)'} = ${fmt(r.per)} m<br>R<sub>h</sub> = A/P = ${fmt(r.r)} m · n = ${fmt(r.n)}`;$('explanation').innerHTML='<b>A larger channel carries more water.</b><br>Increasing depth enlarges both area and hydraulic radius. A steeper bed accelerates the flow; greater roughness slows it down.<br><br>Double the slope → discharge × √2.<br>Double n → discharge is halved.';
}
else{$('diagramTitle').textContent='Flow over a sharp-crested weir';$('assumptions').innerHTML='Free, ventilated overflow over a rectangular sharp crest. H is measured upstream of the drawdown. g = 9.81 m/s².';$('metric2').textContent='Coefficient · Cᵈ';$('v2').textContent=r.q===null?'—':fmt(r.cd);$('u2').textContent='';$('metric3').textContent='Head ratio · H/Z';$('v3').textContent=fmt(r.ratio,2);$('u3').textContent='';$('formula').innerHTML='Q = C<sub>d</sub> b g<sup>1/2</sup> H<sup>3/2</sup>';$('substitution').innerHTML=`C<sub>d</sub> ≈ 0.564 + 0.0846 H/Z<br>H/Z = ${fmt(r.ratio)} · valid for H/Z ≤ 2<br>H + Z = ${fmt(p.h+p.z)} m${p.fixedTotal!==null?' (fixed)':''}`;$('explanation').innerHTML='<b>The head has a powerful effect.</b><br>Discharge grows with H³ᐟ² and with the coefficient Cᵈ, which also increases with H/Z. Doubling the width doubles the flow.'+(r.ratio>2?'<div class="warning">H/Z exceeds 2. This coefficient approximation is outside its stated range, so discharge is not calculated. Reduce H or increase Z.</div>':'<br><br>The air gap beneath the falling sheet represents a ventilated nappe.');}}
function render(){syncControlValues();renderLegacy();if(typeof renderPhysics === "function")renderPhysics();if(typeof syncDrawingEditor === "function")syncDrawingEditor();if(typeof syncPhoneUI === "function")syncPhoneUI()}
function setMode(m){mode=m;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-selected',b.dataset.mode===m));controls()}
document.querySelectorAll('[data-mode]').forEach(b=>{b.onclick=()=>setMode(b.dataset.mode);b.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const m=mode==='m'?'w':'m';setMode(m);$(m+'Tab').focus()}}});$('reset').onclick=()=>{states[mode]=structuredClone(defaults[mode]);controls()};controls();
function configureFlow(input){
 if(!input||!configs[input.equation]||!input.parameters||typeof input.parameters!=='object')throw Error('Invalid equation or parameters');
 const m=input.equation,next=structuredClone(states[m]);
 for(const [k,v] of Object.entries(input.parameters)){const c=configs[m].find(c=>c[0]===k);if(!c||!Number.isFinite(v))throw Error('Invalid parameter '+k);next[k]=v}
 if(input.material!==undefined){if(m!=='m'||!Object.hasOwn(MATERIALS,input.material))throw Error('Invalid channel material');next.material=input.material;next.n=MATERIALS[input.material].n}
 if(m==='m'&&(input.section==='custom'||input.points!==undefined)&&input.fixedArea===undefined&&next.fixedArea===null)next.fixedArea=sectionGeometry(states.m).a;
 if(input.section!==undefined){if(m!=='m'||!['rectangle','custom'].includes(input.section))throw Error('Invalid section');next.shape=input.section}
 if(input.points!==undefined){if(m!=='m')throw Error('Drawn sections apply to Manning flow');next.profile=validateSection(input.points);next.shape='custom'}
 if(input.fixedArea!==undefined){if(m!=='m')throw Error('Fixed area applies to Manning flow');next.fixedArea=input.fixedArea}
 if(input.fixedTotal!==undefined){if(m!=='w')throw Error('Fixed H + Z applies to the weir');next.fixedTotal=input.fixedTotal}
 enforceConstraint(m,next,Object.keys(input.parameters));commitFlowState(m,next);setMode(m);return calculate();
}
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'configure_flow',description:'Set hydraulic dimensions, channel material and an optional drawn wetted outline. Points are normalized [x,depth] from [0,0] at the left waterline to [1,0] at the right; the deepest point is scaled to maximum water depth. Fixed constraints preserve their targets when one dimension changes; incompatible simultaneous dimensions are rejected. Returns SI discharge.',inputSchema:{type:'object',properties:{equation:{type:'string',enum:['m','w']},parameters:{type:'object',additionalProperties:{type:'number'}},material:{type:'string',enum:Object.keys(MATERIALS)},section:{type:'string',enum:['rectangle','custom']},fixedArea:{type:['number','null'],description:'Lock area in m²; null releases it.'},fixedTotal:{type:['number','null'],description:'Lock H + Z in m; null releases it.'},points:{type:'array',items:{type:'array',items:{type:'number'},minItems:2,maxItems:2}}},required:['equation','parameters'],additionalProperties:false},annotations:{readOnlyHint:false},execute:configureFlow})).catch(()=>{})}catch{}}
