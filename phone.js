const phoneQuery=matchMedia('(max-width:700px), (max-width:950px) and (max-height:500px)');
const phoneActions=document.createElement('div');phoneActions.className='phone-actions';phoneActions.innerHTML='<button id="phoneNotes" type="button">Equations</button><button id="phoneDraw" type="button" hidden>Draw</button><button id="phoneReset" type="button">Reset ↺</button>';document.querySelector('.layout').append(phoneActions);
const phoneDialog=document.createElement('dialog');phoneDialog.className='phone-dialog';phoneDialog.setAttribute('aria-labelledby','phoneDialogTitle');phoneDialog.innerHTML='<div class="dialog-head"><h2 id="phoneDialogTitle"></h2><button id="closePhoneDialog" type="button">Close</button></div><div id="phoneDialogBody"></div>';document.body.append(phoneDialog);
let phoneDialogKind=null;
function closePhoneDialog(){phoneDialog.close()}
phoneDialog.addEventListener('close',()=>{if(phoneDialogKind==='draw')document.querySelector('.right').prepend(drawingPanel);phoneDialogKind=null;syncPhoneUI()});
$('closePhoneDialog').onclick=closePhoneDialog;
$('phoneReset').onclick=()=>$('reset').click();
$('phoneDraw').onclick=()=>{phoneDialogKind='draw';$('phoneDialogTitle').textContent='Edit cross-section';$('phoneDialogBody').replaceChildren(drawingPanel);phoneDialog.showModal()};
$('phoneNotes').onclick=()=>{phoneDialogKind='notes';$('phoneDialogTitle').textContent='Equation & model notes';const body=$('phoneDialogBody');body.replaceChildren();for(const source of [document.querySelector('.equationbox'),$('roughnessInfo'),$('assumptions'),document.querySelector('.model-note')]){if(!source)continue;const node=source.cloneNode(true);node.removeAttribute('id');node.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));body.append(node)}phoneDialog.showModal()};
function syncPhoneUI(){
 const mobile=phoneQuery.matches;phoneActions.hidden=!mobile;$('phoneDraw').hidden=mode!=='m'||states.m.shape!=='custom';
 const materialLabel=document.querySelector('label[for="material"]');if(materialLabel)materialLabel.textContent=mobile?`Material · n ${fmt(MATERIALS[states.m.material].n)}`:'Channel material';
 const shapeLabel=document.querySelector('label[for="sectionShape"]');if(shapeLabel)shapeLabel.textContent=mobile?'Section shape':'Cross-section';
 if(mobile)$('scene').setAttribute('viewBox',mode==='m'?'20 65 740 245':'20 65 720 220');else $('scene').setAttribute('viewBox','0 0 780 330');
 if(!mobile&&phoneDialog.open)phoneDialog.close();
}
phoneQuery.addEventListener('change',syncPhoneUI);syncPhoneUI();
// Keep responsive overrides after the animation/editor styles inserted at runtime.
document.head.append(document.querySelector('link[href="phone.css"]'));
