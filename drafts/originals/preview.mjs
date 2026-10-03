import {normalizeState,sectionsForCv,escapeHtml as esc} from '../../assets/cv-model.js';
import {contactLink,entryMarkup,fragmentEntry} from '../templates/content.mjs';
import {originalDesign} from './catalog.mjs';

let stylesReady;
function loadStyles() {
  if(!stylesReady) stylesReady=new Promise((resolve,reject)=>{
    const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./designs.css',import.meta.url).href;
    link.onload=resolve;link.onerror=()=>reject(new Error('No se pudieron cargar los diseños propios.'));document.head.append(link);
  });
  return stylesReady;
}
function headerMarkup(state,design) {
  const d=state.data,name=d.name||[d.firstName,d.lastName].filter(Boolean).join(' ')||'Nombre Apellidos';
  const location=[d.postalCode,d.city,d.country].filter(Boolean).join(', ');
  const contacts=[d.email&&contactLink(d.email,'email'),d.phone&&esc(d.phone),location&&esc(location),d.linkedin&&contactLink(d.linkedin,'web')].filter(Boolean);
  const photo=design.supportsPhoto&&state.photoSrc?'<img class="own-photo draft-photo flow-photo" src="'+esc(state.photoSrc)+'" alt="">':'';
  return '<header class="own-header'+(photo?' own-header--photo':'')+'"><div class="own-identity"><h1>'+esc(name)+'</h1>'+(d.title?'<p class="own-job">'+esc(d.title)+'</p>':'')+'</div>'+photo+(contacts.length?'<address class="own-contacts">'+contacts.map(c=>'<span>'+c+'</span>').join('')+'</address>':'')+'<span class="own-header-mark" aria-hidden="true"></span></header>';
}

// This pager reuses only neutral data/word-fragment utilities. Layout and CSS are
// specified here without measured provider DOM, background images or ornaments.
export async function renderOriginalPreview(container,input,options={}) {
  const design=originalDesign(options.template);
  const state=normalizeState(input),sections=sectionsForCv({...state,design:{...state.design,template:'compact'}});
  const two=design.layout==='sidebar-right';
  container.classList.remove('catalog-classic','draft-preview','flow-preview');container.classList.add('original-preview');
  container.dataset.originalDesign=design.id;container.dataset.paginating='true';
  for(const key of ['reference','layout'])delete container.dataset[key];
  container.style.setProperty('--draft-zoom','1');container.style.setProperty('--flow-zoom','1');
  await loadStyles();
  await Promise.all([document.fonts.load('400 12px "CV Own Sans"'),document.fonts.load('600 12px "CV Own Sans"'),document.fonts.load('400 36px "CV Own Serif"'),document.fonts.load('italic 400 36px "CV Own Serif"')]);
  await document.fonts.ready;
  container.replaceChildren();
  const pages=[];
  const margin=design.margin||39,bottomMargin=39;
  function pageAt(index) {
    if(pages[index])return pages[index];
    const page=document.createElement('article');page.className='original-page draft-page flow-page';page.dataset.ownTheme=design.theme;page.dataset.ownLayout=two?'two':'one';
    page.setAttribute('aria-label',design.name+' · Página '+(index+1));
    for(const [key,value] of Object.entries({accent:design.accent,secondary:design.secondary||design.accent,soft:design.soft,'name-font':'"'+design.nameFont+'"','name-size':design.nameSize+'pt','rail-width':(design.rail||30)+'%','body-size':(design.bodySize||9)+'pt','section-gap':(design.sectionGap||20)+'pt','entry-gap':(design.entryGap||11)+'pt'}))page.style.setProperty('--own-'+key,value);
    page.style.padding=margin+'pt '+margin+'pt '+bottomMargin+'pt';
    page.innerHTML='<div class="own-page-body draft-page-body flow-page-body">'+(index===0?headerMarkup(state,design):'')+'<div class="own-layout"><div class="own-flow flow-content" data-column="main"></div>'+(two?'<aside class="own-flow own-rail flow-content" data-column="side"></aside>':'')+'</div></div><footer class="own-folio draft-folio flow-folio">'+(index+1)+'</footer>';
    container.append(page);pages.push(page);return page;
  }
  function bottom(page) {return page.getBoundingClientRect().bottom-bottomMargin*4/3;}
  try {
    const first=pageAt(0);
    await Promise.all([...first.querySelectorAll('img')].map(img=>img.decode()));
    if(first.querySelector('.own-header').getBoundingClientRect().bottom>bottom(first)-60)throw new Error('El encabezado es demasiado largo para esta página.');
    function pager(column) {
      let index=0,flow=first.querySelector('[data-column="'+column+'"]'),section,body,definition;
      function start(def,continued=false) {
        definition=def;section=document.createElement('section');section.className='own-section';section.dataset.section=def.key;section.dataset.continuation=String(continued);
        section.innerHTML='<h2>'+esc(def.title)+(continued?' · continuación':'')+'</h2><div class="own-section-body"></div>';flow.append(section);body=section.lastElementChild;
      }
      const overflow=()=>flow.getBoundingClientRect().bottom>bottom(pages[index])+.5;
      const hasContent=()=>body.children.length>0||flow.children.length>1;
      function advance() {
        const continued=body.children.length>0||section.dataset.continuation==='true';
        if(!body.children.length)section.remove();
        // An empty first-page flow still has the identity header above it.
        index++;flow=pageAt(index).querySelector('[data-column="'+column+'"]');start(definition,continued);
      }
      function append(item) {body.insertAdjacentHTML('beforeend',entryMarkup(item,definition.key));const block=body.lastElementChild;block.classList.add('own-entry','flow-entry');return block;}
      async function place(item) {
        if(item.page_break_before&&hasContent())advance();
        let block=append(item);if(!overflow())return;block.remove();
        if(hasContent()||index===0){advance();block=append(item);if(!overflow())return;block.remove();}
        const fragments=fragmentEntry(item,200);
        if(!fragments.length)throw new Error(design.name+': el título de una entrada no cabe en la página.');
        for(const [part,fragment] of fragments.entries()) {
          if(part&&part%8===0)await new Promise(resolve=>setTimeout(resolve,0));
          block=append(fragment);
          if(overflow()&&(body.children.length>1||flow.children.length>1)){block.remove();advance();block=append(fragment);}
          if(overflow())throw new Error(design.name+': una palabra o un encabezado es demasiado largo.');
        }
      }
      return {start,place};
    }
    const main=pager('main'),side=two?pager('side'):main;
    for(const def of sections) {
      const target=two&&design.sideSections.includes(def.key)?side:main;target.start(def);
      for(const item of def.entries)await target.place(item);
    }
    const zoom=String(Math.min(1.5,Math.max(.12,container.parentElement.clientWidth/(design.width*4/3))));
    container.style.setProperty('--draft-zoom',zoom);container.style.setProperty('--flow-zoom',zoom);
    return {template:options.resultId||design.id,pages:pages.length,available:false,origin:'original'};
  }finally{container.dataset.paginating='false';}
}
