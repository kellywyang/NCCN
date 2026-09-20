import {getDocument, GlobalWorkerOptions} from './vendor/build/pdf.mjs';
GlobalWorkerOptions.workerSrc = './vendor/build/pdf.worker.mjs';
'use strict';
const $ = id => document.getElementById(id);
const diseases = {
  ovarian: {name:'Ovarian / fallopian tube / primary peritoneal malignancy',pdf:'ovarian',focus:'Confirm primary site and histology; record relevant tumor and germline testing status.'},
  uterine: {name:'Endometrial / uterine malignancy',pdf:'uterine',focus:'Confirm histologic subtype and relevant molecular findings; select the appropriate disease-specific pathway.'},
  cervical: {name:'Cervical malignancy',pdf:'cervical',focus:'Confirm histology, extent of disease, and staging system; document relevant prior therapy.'},
  vulvar: {name:'Vulvar malignancy',pdf:'vulvar',focus:'Confirm histology, primary-site findings, and nodal evaluation status.'},
  vaginal: {name:'Vaginal malignancy',pdf:'vaginal',focus:'Confirm primary site and histology; distinguish a vaginal primary from involvement by another malignancy.'}
};
const visits = {
 consult:{name:'New consultation',hint:'Prepare the diagnostic summary, identify missing records, and enter the proposed workup or treatment discussion.',items:'[Confirm pathology, staging information, and missing records.]\n[Document proposed workup, treatment options, and multidisciplinary review as applicable.]\n[Document counseling only after it occurs.]'},
 treatment:{name:'Treatment review',hint:'Summarize the regimen and course, then record the proposed plan. Treatment clearance must be documented after clinical review.',items:'[Document regimen, intent, cycle, and prior treatment course.]\n[Review interval symptoms, toxicities, performance status, and required results.]\n[Document treatment decision after clinical review; not automatically cleared by this draft.]'},
 surveillance:{name:'Surveillance',hint:'Document the prior treatment course and available findings. Enter a patient-specific surveillance plan after guideline review.',items:'[Review interval symptoms and available results; examination findings pending visit.]\n[Document disease status after assessment; no disease-free status assumed.]\n[Specify individualized surveillance and indications for additional evaluation.]'}
};
const cervicalTreatmentPaths={
 ia1:[{page:11,label:'Fertility-sparing'},{page:13,label:'Non-fertility-sparing'}],
 ia2:[{page:11,label:'Fertility-sparing'},{page:15,label:'Non-fertility-sparing · meets conservative surgery criteria'}],
 ib1:[{page:11,label:'Fertility-sparing'},{page:15,label:'Non-fertility-sparing · meets conservative surgery criteria'},{page:16,label:'Primary treatment · does not meet conservative surgery criteria'}],
 ib2:[{page:11,label:'Fertility-sparing'},{page:16,label:'Non-fertility-sparing primary treatment'}],
 ib3:[{page:16,label:'Primary treatment'}],
 iia1:[{page:16,label:'Primary treatment'}],
 iia2:[{page:16,label:'Primary treatment'}],
 iib:[{page:18,label:'Primary treatment'}],
 iiia:[{page:18,label:'Primary treatment'}],
 iiib:[{page:18,label:'Primary treatment'}],
 iiic1:[{page:18,label:'Primary treatment'}],
 iiic2:[{page:18,label:'Primary treatment'}],
 iva:[{page:18,label:'Primary treatment'}],
 ivb:[{page:23,label:'Stage IVB / distant metastatic disease'}],
 'recurrence-distant':[{page:23,label:'Recurrence with distant metastases'}]
};
const cervicalTreatmentTree=[
 {keys:['ia1'],stage:'IA1',paths:cervicalTreatmentPaths.ia1},
 {keys:['ia2'],stage:'IA2',paths:cervicalTreatmentPaths.ia2},
 {keys:['ib1'],stage:'IB1',paths:cervicalTreatmentPaths.ib1},
 {keys:['ib2'],stage:'IB2',paths:cervicalTreatmentPaths.ib2},
 {keys:['ib3','iia1','iia2'],stage:'IB3 · IIA1 · IIA2',paths:cervicalTreatmentPaths.ib3},
 {keys:['iib','iiia','iiib','iiic1','iiic2','iva'],stage:'IIB · IIIA · IIIB · IIIC1–2 · IVA',paths:cervicalTreatmentPaths.iib},
 {keys:['ivb','recurrence-distant'],stage:'IVB or distant recurrence',paths:cervicalTreatmentPaths.ivb}
];
const fields=['grade','histology','stage','history','findings','markers','plan','followup','version','page'];
const clinicalFields=['grade','histology','stage','history','findings','markers','plan','followup'];
let manuallyEdited=false, pdfURL=null, pdfDisease=null, referenceMode='staging', activeTreatmentCategory='primary';
const library = new Map();
const DB_NAME='gyn-onc-prechart-local';
const DB_STORE='guidelines';
let activeDocument=null, currentPage=1, zoom=1, documentGeneration=0, renderGeneration=0, renderTask=null;
function openDatabase(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>request.result.createObjectStore(DB_STORE,{keyPath:'key'});
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
}
async function saveGuideline(key,file,verified){
 const db=await openDatabase();
 await new Promise((resolve,reject)=>{
  const transaction=db.transaction(DB_STORE,'readwrite');
  transaction.objectStore(DB_STORE).put({key,name:file.name,type:file.type||'application/pdf',blob:file,verified,savedAt:Date.now()});
  transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);
 });
 db.close();
}
async function forgetGuideline(key){
 const db=await openDatabase();
 await new Promise((resolve,reject)=>{
  const transaction=db.transaction(DB_STORE,'readwrite');
  transaction.objectStore(DB_STORE).delete(key);
  transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);
 });
 db.close();
}
async function restoreGuidelines(){
 try{
  const db=await openDatabase();
  const saved=await new Promise((resolve,reject)=>{
   const request=db.transaction(DB_STORE,'readonly').objectStore(DB_STORE).getAll();
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  db.close();
  saved.forEach(entry=>library.set(entry.key,{url:URL.createObjectURL(entry.blob),name:entry.name,verified:entry.verified}));
  showDocument();render();
 }catch(e){
  $('libraryStatus').textContent='Saved guideline storage is unavailable in this browser. You can still choose PDFs for this session.';
 }
}
async function drawPage(){
 if(!activeDocument)return;
 const generation=++renderGeneration;
 if(renderTask){renderTask.cancel();try{await renderTask.promise;}catch(e){}}
 const page=await activeDocument.getPage(currentPage);if(generation!==renderGeneration)return;
 const canvas=$('pdfCanvas'), base=page.getViewport({scale:1}), ratio=window.devicePixelRatio||1;
 const fit=Math.max(200,canvas.parentElement.clientWidth-18)/base.width;
 const viewport=page.getViewport({scale:fit*zoom*ratio});canvas.width=viewport.width;canvas.height=viewport.height;canvas.style.width=(viewport.width/ratio)+'px';canvas.style.height=(viewport.height/ratio)+'px';
 $('pageNumber').value=currentPage;$('pageCount').textContent='/ '+activeDocument.numPages;
 $('prevPage').disabled=currentPage<=1;$('nextPage').disabled=currentPage>=activeDocument.numPages;
 $('zoomOut').disabled=zoom<=1;$('zoomIn').disabled=zoom>=3.5;
 renderStagingQuickChoices();
 renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport});
 try{await renderTask.promise;}catch(e){if(e.name!=='RenderingCancelledException')$('pdfStatus').textContent='Page could not be rendered; use the separate-tab link.';}
}
async function openDocument(url,initialPage=1){
 const generation=++documentGeneration;++renderGeneration;currentPage=initialPage;zoom=1;
 if(renderTask)renderTask.cancel();
  if(activeDocument){
    if(typeof activeDocument.destroy==='function'){
      try{await activeDocument.destroy();}catch(error){console.warn('Unable to release previous PDF document',error);}
    }
    activeDocument=null;
  }
 $('pdfCanvas').getContext('2d').clearRect(0,0,$('pdfCanvas').width,$('pdfCanvas').height);
 if(!url)return;
 try{const doc=await getDocument({url,cMapUrl:'./vendor/cmaps/',cMapPacked:true,standardFontDataUrl:'./vendor/standard_fonts/',wasmUrl:'./vendor/wasm/'}).promise;
  if(generation!==documentGeneration){
    if(typeof doc.destroy==='function'){
      try{await doc.destroy();}catch(error){console.warn('Unable to release stale PDF document',error);}
    }
    return;
  }
  activeDocument=doc;
  await drawPage();
}
 catch(e){if(generation===documentGeneration)$('pdfStatus').textContent='Unable to render this PDF. Use the separate-tab link or choose another file.';}
}
function value(id, fallback){return $(id).value.trim() || '['+fallback+']';}
function render(){
 const d=diseases[$('disease').value],v=visits[$('visit').value];
 $('official').href=d.pdf?'https://www.nccn.org/professionals/physician_gls/pdf/'+d.pdf+'.pdf':'https://www.nccn.org/guidelines/category_1';
 $('visitHint').textContent=v.hint+' '+d.focus;
 if(manuallyEdited){$('status').textContent='Fields changed. Rebuild to replace your manually edited draft.';return;}
 $('note').value='PRECHART DRAFT — '+v.name+'\n\nASSESSMENT\n'+d.name+'\nHistology: '+value('histology','confirm histology')+'\nGrade: '+value('grade','document grade or unknown / not applicable')+'\nStage / system: '+value('stage','confirm stage and system')+'\nCourse / disease status: '+value('history','summarize confirmed history')+'\nFindings: '+value('findings','review symptoms, records, and results')+'\nBiomarkers / genetics: '+value('markers','document relevant results or testing status')+'\n\nPLAN\n'+value('plan','enter clinician-selected plan')+'\n\nVisit review items\n'+v.items+'\n\nFollow-up / pending items\n'+value('followup','specify follow-up and pending items')+'\n\nGuideline reference: '+value('version','verify current guideline version')+'; '+value('page','document page / algorithm branch')+'.\nDraft prepared before visit; confirm and update before signing.';
 $('status').textContent='Review before pasting into the chart.';
}
fields.forEach(id=>$(id).addEventListener('input',render));
$('visit').addEventListener('change',render);
let previousDisease=$('disease').value;
$('disease').addEventListener('change',()=>{
 if((manuallyEdited||clinicalFields.some(id=>$(id).value.trim()))&&!confirm('Switch disease and clear the current visit draft? Saved guideline PDFs will remain available.')){$('disease').value=previousDisease;return;}
 previousDisease=$('disease').value;fields.forEach(id=>$(id).value='');$('cervicalStage').value='';activeTreatmentCategory='primary';manuallyEdited=false;showDocument();render();
});
$('note').addEventListener('input',()=>{manuallyEdited=true;$('status').textContent='Draft edited directly. Field changes require rebuilding.';});
$('regenerate').addEventListener('click',()=>{if(manuallyEdited&&!confirm('Replace direct edits with a new draft from the fields?'))return;manuallyEdited=false;render();});
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('note').value);$('status').textContent='Copied. Review and complete bracketed items in the chart.';}catch(e){$('note').focus();$('note').select();$('status').textContent='Clipboard unavailable. The draft is selected; press ⌘C or Ctrl+C.';}});
function showDocument(){
 const disease=$('disease').value,entry=library.get(disease);
 const selectedPaths=disease==='cervical'&&referenceMode==='treatment'?cervicalTreatmentPaths[$('cervicalStage').value]:null;
 const categoryPage={adjuvant:17,surveillance:21,recurrence:22,systemic:57}[activeTreatmentCategory];
 const defaultPage=disease==='cervical'?(referenceMode==='staging'?63:(categoryPage||selectedPaths?.[0]?.page||1)):1;
 $('cervicalStageControl').hidden=disease!=='cervical';
 pdfURL=entry?.url||null; pdfDisease=entry?$('disease').value:null;
 $('pdfViewer').hidden=!entry;$('pdfEmpty').hidden=!!entry;$('removePdf').hidden=true;$('pdfFallback').hidden=!entry;
 openDocument(entry?.url,defaultPage); if(entry){$('pdfFallback').href=entry.url+(defaultPage>1?'#page='+defaultPage:'');}else{$('pdfFallback').removeAttribute('href');}
 $('filename').textContent=entry?entry.name:'No PDF loaded for this disease';
 $('shortcutControl').querySelector('span').textContent='Algorithm';
 $('shortcut').replaceChildren();
 const prompt=document.createElement('option');prompt.value='';prompt.textContent=entry?.verified?'Choose an algorithm page':'No saved guideline for this disease';$('shortcut').append(prompt);
 $('shortcut').disabled=!entry?.verified;
 if(entry?.verified){
  const meta=guidelineIndex[$('disease').value];
  const allowed=new Set(referenceSections[$('disease').value]?.[referenceMode]||meta.pages.map(([page])=>page));
  meta.pages.filter(([page])=>allowed.has(page)).forEach(([page,label])=>{const o=document.createElement('option');o.value=page;o.textContent=label+' · PDF p. '+page;$('shortcut').append(o);});
  $('version').value='NCCN '+meta.version+' ('+meta.date+')';
  if(defaultPage>1&&allowed.has(defaultPage)){
   const match=meta.pages.find(([page])=>page===defaultPage);
   $('shortcut').value=String(defaultPage);
   $('page').value=match[1]+' (PDF p. '+defaultPage+')';
  }
 }
 $('libraryStatus').textContent=library.size?library.size+' guideline PDF(s) saved privately on this device. Switch disease to change documents.':'No guidelines are saved on this device yet.';
 $('setupGuidelines').hidden=library.size>=4;
 $('pdfStatus').textContent=entry&&!entry.verified?'This file is not an indexed edition. Check its title/version and navigate with the PDF viewer.':'';
 renderStagingQuickChoices();
 renderTreatmentCategoryChoices();
 renderTreatmentPathChoices();
}
$('setupGuidelines').addEventListener('click',()=>$('pdf').click());
function guidelineKeyFromFilename(filename){
 const name=filename.toLowerCase().replace(/[^a-z0-9]+/g,' ');
 if(/\b(cervical|cervix)\b/.test(name))return 'cervical';
 if(/\b(ovarian|ovary|fallopian|peritoneal)\b/.test(name))return 'ovarian';
 if(/\b(uterine|uterus|endometrial|endometrium)\b/.test(name))return 'uterine';
 if(/\bvaginal\b/.test(name))return 'vaginal';
 return null;
}
$('pdf').addEventListener('change',async()=>{
 const files=Array.from($('pdf').files);let unrecognized=0,saved=0,storageFailures=0;
 for(const file of files){
  if(!/\.pdf$/i.test(file.name)||(file.type&&file.type!=='application/pdf')){unrecognized++;continue;}
  let key=null;
  try {const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');key=Object.keys(guidelineIndex).find(k=>guidelineIndex[k].sha256===hash);}catch(e){}
  if(!key)key=guidelineKeyFromFilename(file.name);
  const verified=!!key;
  if(!key&&files.length===1) key=$('disease').value;
  if(!key){unrecognized++;continue;}
  if(library.has(key))URL.revokeObjectURL(library.get(key).url);
  const url=URL.createObjectURL(file);
  library.set(key,{url,name:file.name,verified});
  try{await saveGuideline(key,file,verified);saved++;}catch(e){storageFailures++;}
 }
 if(!library.has($('disease').value)&&library.size&&!manuallyEdited&&!clinicalFields.some(id=>$(id).value.trim())){$('disease').value=library.keys().next().value;previousDisease=$('disease').value;$('version').value='';$('page').value='';}
 showDocument();render();
 const messages=[];
 if(saved)messages.push(saved+' guideline PDF'+(saved===1?'':'s')+' saved in this browser.');
 if(storageFailures)messages.push(storageFailures+' opened but could not be saved for future sessions.');
 if(unrecognized)messages.push(unrecognized+' file'+(unrecognized===1?' was':'s were')+' not recognized; use filenames containing cervical, ovarian, uterine, or vaginal.');
 if(messages.length)$('pdfStatus').textContent=messages.join(' ');
 $('pdf').value='';
});
function setGuidelinePage(page){
 if(!pdfURL)return;
 const meta=guidelineIndex[$('disease').value],match=meta.pages.find(p=>p[0]===page);
 currentPage=page;drawPage();$('pdfFallback').href=pdfURL+'#page='+page;
 if(Array.from($('shortcut').options).some(option=>Number(option.value)===page))$('shortcut').value=String(page);
 if(match)$('page').value=match[1]+' (PDF p. '+page+')';
 renderStagingQuickChoices();renderTreatmentCategoryChoices();renderTreatmentPathChoices();render();
}
$('shortcut').addEventListener('change',()=>{if($('shortcut').value)setGuidelinePage(Number($('shortcut').value));});
function renderStagingQuickChoices(){
 const box=$('stagingQuickChoices');
 const visible=$('disease').value==='cervical'&&referenceMode==='staging'&&!!library.get('cervical')?.verified;
 box.hidden=!visible;box.replaceChildren();
 if(!visible)return;
 [[63,'FIGO Staging'],[10,'Workup Overview'],[34,'Imaging Principles']].forEach(([page,label])=>{
  const button=document.createElement('button');button.type='button';button.textContent=label;button.classList.toggle('active',currentPage===page);button.addEventListener('click',()=>setGuidelinePage(page));box.append(button);
 });
}
function renderTreatmentCategoryChoices(){
 const box=$('treatmentCategoryChoices');
 const verified=!!library.get('cervical')?.verified;
 const visible=$('disease').value==='cervical'&&referenceMode==='treatment'&&verified;
 box.hidden=!visible;$('shortcutControl').hidden=$('disease').value==='cervical'&&referenceMode==='staging'&&verified;box.replaceChildren();
 if(!visible)return;
 const categories=[['primary','Primary Treatment'],['adjuvant','Surgical Findings & Adjuvant Treatment'],['surveillance','Surveillance'],['recurrence','Regional Recurrence'],['systemic','Systemic Therapy']];
 categories.forEach(([key,label])=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.classList.toggle('active',activeTreatmentCategory===key);button.addEventListener('click',()=>{activeTreatmentCategory=key;const page={adjuvant:17,surveillance:21,recurrence:22,systemic:57}[key];if(page)setGuidelinePage(page);else{const paths=cervicalTreatmentPaths[$('cervicalStage').value];if(paths?.length)setGuidelinePage(paths[0].page);else{renderTreatmentCategoryChoices();renderTreatmentPathChoices();}}});box.append(button);});
 configureCervicalTreatmentShortcut();
}
function configureCervicalTreatmentShortcut(){
 const pageSets={primary:[11,13,15,16,18,23],adjuvant:[17,56],surveillance:[21],recurrence:[22],systemic:[57]};
 const pages=pageSets[activeTreatmentCategory]||pageSets.primary;
 const meta=guidelineIndex.cervical;
 const select=$('shortcut');
 select.replaceChildren();
 const prompt=document.createElement('option');prompt.value='';prompt.textContent=activeTreatmentCategory==='adjuvant'?'Choose surgical or adjuvant page':'Choose a treatment page';select.append(prompt);
 pages.forEach(page=>{const match=meta.pages.find(item=>item[0]===page);if(!match)return;const option=document.createElement('option');option.value=page;option.textContent=match[1]+' · PDF p. '+page;select.append(option);});
 select.disabled=false;
 if(pages.includes(currentPage))select.value=String(currentPage);
 $('shortcutControl').querySelector('span').textContent='Pages';
}
function renderTreatmentPathChoices(){
 const box=$('treatmentChoices'),stage=$('cervicalStage').value;
 const visible=$('disease').value==='cervical'&&referenceMode==='treatment'&&activeTreatmentCategory==='primary';
 box.hidden=!visible;box.replaceChildren();
 if(!visible)return;
 const heading=document.createElement('p');
 if(!stage){
  heading.textContent='Select a cervical FIGO stage above to show its treatment branches.';
  box.append(heading);
  return;
 }
 const branch=cervicalTreatmentTree.find(item=>item.keys.includes(stage));
 if(!branch)return;
 heading.textContent='Stage '+($('cervicalStage').selectedOptions[0]?.textContent||branch.stage)+' treatment paths';
 const tree=document.createElement('div');tree.className='treatment-tree';
 const row=document.createElement('div');row.className='treatment-tree-row selected-stage';
 const stageNode=document.createElement('div');stageNode.className='treatment-stage-node';stageNode.textContent='Stage '+branch.stage;
 const arrow=document.createElement('span');arrow.className='tree-arrow';arrow.setAttribute('aria-hidden','true');
 const options=document.createElement('div');options.className='treatment-choice-buttons';
 branch.paths.forEach(path=>{const button=document.createElement('button');button.type='button';button.textContent=path.label+' · p. '+path.page;button.classList.toggle('active',currentPage===path.page);button.addEventListener('click',()=>setGuidelinePage(path.page));options.append(button);});
 row.append(stageNode,arrow,options);tree.append(row);
 box.append(heading,tree);
}
$('cervicalStage').addEventListener('change',()=>{
 const selected=$('cervicalStage').selectedOptions[0]?.textContent||'';
 $('stage').value=selected?'FIGO 2018 Stage '+selected:'';
 activeTreatmentCategory='primary';
 setReferenceMode('treatment',{scroll:true});render();
});
function setReferenceMode(mode,{openFirst=false,scroll=false}={}){
 referenceMode=mode;
 const staging=mode==='staging';
 $('stagingTab').classList.toggle('active',staging);$('stagingTab').setAttribute('aria-selected',String(staging));
 $('treatmentTab').classList.toggle('active',!staging);$('treatmentTab').setAttribute('aria-selected',String(!staging));
 $('referenceTitle').textContent=staging?'Staging & Workup Overview':'Treatment plan flow charts';
 $('referenceHelp').textContent=staging?'Review workup, pathology, imaging, and staging pathways for the selected disease site.':'Review primary treatment, adjuvant therapy, surveillance, recurrence, and systemic-therapy pathways.';
 showDocument();
 if(openFirst&&!$('shortcut').disabled&&$('shortcut').options.length>1&&!$('shortcut').value){$('shortcut').selectedIndex=1;$('shortcut').dispatchEvent(new Event('change'));}
 if(scroll)document.querySelector('.reference').scrollIntoView({behavior:'smooth',block:'start'});
}
$('stagingTab').addEventListener('click',()=>setReferenceMode('staging'));
$('treatmentTab').addEventListener('click',()=>setReferenceMode('treatment'));
$('viewStaging').addEventListener('click',()=>setReferenceMode('staging',{openFirst:true,scroll:true}));
$('removePdf').addEventListener('click',async()=>{
 const key=$('disease').value,entry=library.get(key);
 if(entry)URL.revokeObjectURL(entry.url);
 library.delete(key);
 try{await forgetGuideline(key);}catch(e){$('pdfStatus').textContent='This browser could not remove the saved PDF.';}
 $('version').value='';$('page').value='';showDocument();render();
});
const surveillanceStarters={
 uterine:'Endometrial carcinoma surveillance draft — confirm histology and applicability; not a uterine sarcoma template.\nPlan physical examination including pelvic examination every 3–6 months for the first 2–3 years, every 6–12 months through year 5, then annually. Select the next interval based on the treatment timeline and clinical context.\nConsider CA-125 monitoring when initially elevated or with serous histology. Obtain imaging for symptoms or examination findings concerning for recurrence. Assess late treatment effects and survivorship needs.\n[Document current symptoms, examination after the visit, and any indicated evaluation.]',
 cervical:'Cervical cancer surveillance draft — confirm applicability and prior treatment.\nPlan interval history and physical examination every 3–6 months for the first 2 years, every 6–12 months during years 3–5, then annually according to recurrence risk.\nSelect follow-up imaging using the stage-specific imaging guidance (CERV-B). Obtain laboratory assessment when indicated by concerning symptoms or findings. Consider annual cervical/vaginal cytology only when indicated to screen for lower genital tract neoplasia; it has limited value for recurrence detection and is not recommended after radiation unless another indication exists. Assess late treatment effects and survivorship needs.\n[Document symptoms, examination after the visit, and any evaluation for suspected recurrence.]',
 vaginal:'Vaginal cancer surveillance draft — confirm applicability and prior treatment.\nPlan interval history and physical examination every 3–6 months for the first 2 years, every 6–12 months during years 3–5, then annually according to recurrence risk.\nReview post-treatment response imaging at 3–4 months after treatment completion. Further imaging and laboratory assessment should be guided by concerning symptoms or examination findings. Consider cervical/vaginal cytology when indicated for lower genital tract neoplasia, recognizing limited recurrence-detection value and reduced accuracy after pelvic radiation. Assess late treatment effects and survivorship needs.\n[Document symptoms, examination after the visit, and any evaluation for suspected recurrence.]'
};
$('starter').addEventListener('click',()=>{
 if($('plan').value.trim()&&!confirm('Replace the current plan field with a visit starter?'))return;
 const key=$('disease').value, visit=$('visit').value;
 if(visit==='surveillance'&&surveillanceStarters[key]){
  $('plan').value=surveillanceStarters[key];
  const m=guidelineIndex[key], page={uterine:20,cervical:21,vaginal:10}[key];
  $('version').value='NCCN '+m.version+' ('+m.date+'); supplied edition, confirm currency';
  $('page').value=m.pages.find(p=>p[0]===page)[1]+' (PDF p. '+page+')';
 }else if(visit==='consult'){
  $('plan').value='Confirm pathology, histologic subtype, and available staging information. Obtain [missing records / pathology review / imaging] as clinically indicated.\nReview [appropriate guideline branch] after confirming [key eligibility criteria, relevant biomarkers, prior therapy, and patient goals].\nProposed management: [clinician-selected plan and rationale]. Consider multidisciplinary discussion and relevant clinical trials.\nCounseling planned: [options, risks, benefits, alternatives, and fertility goals where relevant]. Document discussion after the visit.';
 }else if(visit==='treatment'){
  $('plan').value='Proposed regimen / intent / cycle: [enter].\nReview interval symptoms, performance status, toxicities, required laboratory results, and response assessment.\nTreatment decision pending clinical review: [proceed / hold / modify, with rationale and verified regimen-specific parameters].\nSupportive care and toxicity management: [individualized plan].\nNext treatment / response assessment: [timing and tests].';
 }else{
  $('plan').value='Review interval symptoms, prior treatment, and surveillance timeline. Examination and disease-status assessment are pending the visit.\nConfirm the current disease-specific surveillance guidance and enter [examination interval, indications for testing/imaging, and next visit].\nAssess treatment sequelae and survivorship needs. Investigate symptoms or findings concerning for recurrence as clinically indicated.';
 }
 render();
});
$('reset').addEventListener('click',()=>{if(!confirm('Clear the visit fields and draft? Saved guideline PDFs will remain on this device.'))return;fields.forEach(id=>$(id).value='');manuallyEdited=false;showDocument();render();});
window.addEventListener('pagehide',()=>{library.forEach(e=>URL.revokeObjectURL(e.url));});
showDocument();render();restoreGuidelines();

$('prevPage').addEventListener('click',()=>{if(activeDocument&&currentPage>1){currentPage--;drawPage();}});
$('nextPage').addEventListener('click',()=>{if(activeDocument&&currentPage<activeDocument.numPages){currentPage++;drawPage();}});
$('pageNumber').addEventListener('change',()=>{if(activeDocument){currentPage=Math.max(1,Math.min(activeDocument.numPages,Math.round(Number($('pageNumber').value)||1)));drawPage();}});
$('zoomIn').addEventListener('click',()=>{zoom=Math.min(zoom+.3,3.5);drawPage();});
$('zoomOut').addEventListener('click',()=>{zoom=Math.max(zoom-.3,1);drawPage();});
let lastCanvasWidth=0;
new ResizeObserver(entries=>{
 const width=Math.round(entries[0]?.contentRect.width||0);
 if(!width||Math.abs(width-lastCanvasWidth)<2)return;
 lastCanvasWidth=width;
 if(activeDocument)drawPage();
}).observe(document.querySelector('.canvas-wrap'));
