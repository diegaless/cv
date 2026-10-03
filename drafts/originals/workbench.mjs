import {ORIGINAL_DESIGNS} from './catalog.mjs';
import {renderOriginalPreview} from './preview.mjs';
import {draftSample,longDraftSample,samplePortrait} from '../templates/fixtures.mjs';
const select=document.querySelector('#template'),scenario=document.querySelector('#scenario'),photo=document.querySelector('#photo'),gallery=document.querySelector('#gallery'),status=document.querySelector('#status');
select.add(new Option('Todas las alternativas','all'));
for(const design of Object.values(ORIGINAL_DESIGNS))select.add(new Option(design.name,design.id));
const params=new URLSearchParams(location.search),requested=params.get('template');
if(requested&&ORIGINAL_DESIGNS[requested])select.value=requested;else if(requested&&ORIGINAL_DESIGNS['cvapp-'+requested])select.value='cvapp-'+requested;
if(params.get('scenario')==='long')scenario.value='long';
let rendering;
async function render(){
 if(rendering)return;select.disabled=scenario.disabled=photo.disabled=true;
 rendering=true;
 try{
  gallery.replaceChildren();gallery.classList.toggle('single',select.value!=='all');
  const designs=select.value==='all'?Object.values(ORIGINAL_DESIGNS):[ORIGINAL_DESIGNS[select.value]];
  let completed=0;
  for(const design of designs){
   const card=document.createElement('section');card.className='card';
   const title=document.createElement('h2'),link=document.createElement('a');link.textContent=design.name;link.href='?template='+encodeURIComponent(design.id);title.append(link);
   const frame=document.createElement('div');frame.className='frame';const pages=document.createElement('div');frame.append(pages);card.append(title,frame);gallery.append(card);
   const state=structuredClone(scenario.value==='long'?longDraftSample():draftSample);
   if(photo.checked&&design.supportsPhoto)state.photoSrc=await samplePortrait();
   const result=await renderOriginalPreview(pages,state,{template:design.id});
   const note=document.createElement('p');note.className='note';note.textContent=result.pages+' página(s) · Alternativa bloqueada';card.append(note);
   status.textContent='Preparadas '+(++completed)+' de '+designs.length;
  }
 }catch(error){status.textContent=error.message;throw error;}finally{rendering=false;select.disabled=scenario.disabled=photo.disabled=false;}
}
for(const control of [select,scenario,photo])control.addEventListener('change',render);
document.querySelector('#print').addEventListener('click',()=>window.print());
await render();
