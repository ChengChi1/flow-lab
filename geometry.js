// Representative teaching values within TxDOT Hydraulic Design Manual Table 4-7 ranges.
const MATERIALS = {
 concrete: {label:'Concrete · trowel finish',n:.013,range:'0.011–0.015'},
 unfinished: {label:'Concrete · unfinished',n:.017,range:'0.014–0.020'},
 brick: {label:'Brick in cement mortar',n:.015,range:'0.012–0.018'},
 earth: {label:'Earth · clean, newly excavated',n:.018,range:'0.016–0.020'},
 gravel: {label:'Gravel · clean, uniform channel',n:.025,range:'0.022–0.030'},
 grass: {label:'Earth · short grass, few weeds',n:.028,range:'0.022–0.033'},
 riprap: {label:'Riprap lining',n:.030,range:'0.020–0.035'},
 stream: {label:'Natural stream · clean, straight',n:.030,range:'0.025–0.033'}
};
const RECTANGLE=[[0,0],[0,1],[1,1],[1,0]];
function polygonArea(points){let sum=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];sum+=a[0]*b[1]-b[0]*a[1]}return Math.abs(sum)/2}
function sectionGeometry(p){const points=p.shape==='custom'?p.profile:RECTANGLE;let per=0;for(let i=1;i<points.length;i++)per+=Math.hypot((points[i][0]-points[i-1][0])*p.b,(points[i][1]-points[i-1][1])*p.y);return {a:polygonArea(points)*p.b*p.y,per,points}}
function crossing(a,b,c,d){
 const eps=1e-9,cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
 const on=(p,q,r)=>Math.abs(cross(p,q,r))<eps&&r[0]>=Math.min(p[0],q[0])-eps&&r[0]<=Math.max(p[0],q[0])+eps&&r[1]>=Math.min(p[1],q[1])-eps&&r[1]<=Math.max(p[1],q[1])+eps;
 const u=cross(a,b,c),v=cross(a,b,d),w=cross(c,d,a),z=cross(c,d,b);
 return (u*v<0&&w*z<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);
}
function validateSection(points){
 if(!Array.isArray(points)||points.length<3||points.length>500)throw Error('Draw banks and a bed using 3 to 500 points.');
 if(points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0||v>1)))throw Error('Keep the outline inside the drawing area.');
 const a=points[0],b=points[points.length-1];
 if(a[1]!==0||b[1]!==0||a[0]>=b[0])throw Error('Draw from the left waterline to the right waterline.');
 if(points.slice(1,-1).some(p=>p[1]<.00001))throw Error('Keep the bed below the waterline; use one connected section.');
 for(let i=1;i<points.length;i++)if(Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1])<1e-7)throw Error('Remove duplicate adjacent points.');
 const n=points.length;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){if(j===i+1||(i===0&&j===n-1))continue;if(crossing(points[i],points[(i+1)%n],points[j],points[(j+1)%n]))throw Error('The outline crosses or touches itself. Draw one open basin without loops or islands.');}
 if(polygonArea(points)<1e-10)throw Error('Draw banks and a bed with a visible enclosed area.');
 const maxDepth=Math.max(...points.map(p=>p[1]));return points.map(p=>[p[0],p[1]/maxDepth]);
}
// Remove sub-pixel hand jitter without replacing the drawn outline with a preset.
function simplifyStroke(points,epsilon=.003){
 if(points.length<3)return points;
 const a=points[0],b=points[points.length-1],dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;
 let max=0,index=0;for(let i=1;i<points.length-1;i++){const p=points[i],t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)):0;const d=Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);if(d>max){max=d;index=i}}
 if(max<=epsilon)return[a,b];return [...simplifyStroke(points.slice(0,index+1),epsilon).slice(0,-1),...simplifyStroke(points.slice(index),epsilon)];
}
