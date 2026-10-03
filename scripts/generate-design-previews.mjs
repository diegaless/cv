// Playwright is a development-only tool; production does not import this file.
const {chromium}=await import('playwright').catch(()=>import('../.tools/node_modules/playwright/index.mjs'));
import {writeFile,mkdir} from 'node:fs/promises';
import {DESIGN_CATALOG} from '../assets/cv-design-catalog.js';
import {ORIGINAL_DESIGNS} from '../drafts/originals/catalog.mjs';
const base=(process.argv[2]||'http://127.0.0.1:59647').replace(/\/$/,'');
const output='.tools/owned-design-previews';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1300,height:1600},deviceScaleFactor:1});
const records=[];
const requested=process.argv[3]?.split(',');
const selected=requested?DESIGN_CATALOG.filter(t=>requested.includes(t.id)):DESIGN_CATALOG;
if(requested&&selected.length!==requested.length)throw new Error('Unknown or repeated template ID');
let next=0;
const worker=async()=>{
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url());});
  await page.goto(base+'/tests/design-preview-render.html');
  await page.waitForFunction(()=>window.ready);
  await page.emulateMedia({media:'print'});
  while(next<selected.length){
    const entry=selected[next++];
    const info=await page.evaluate(id=>window.renderDesign(id),entry.id);
    if(!info.text.includes('María García López')||/diego\s*ayala/i.test(info.text))throw new Error('Unexpected fixture '+entry.id);
    if(info.pages<1||info.fonts.some(font=>/TT Talent|TT Commons/.test(font)))throw new Error('Invalid composition '+entry.id);
    if(info.photos!==Number(info.photoExpected)||!info.photoDecoded)throw new Error('Missing or invalid sample portrait '+entry.id);
    if(['cvapp-creative','cvapp-pastel','cvapp-visionary','cvapp-confetti'].includes(entry.id)&&await page.locator('#preview .catalog-decoration').count())throw new Error('Extracted decoration remains '+entry.id);
    const image=await page.locator('#preview > *').first().screenshot();
    await writeFile(output+'/'+entry.id+'.png',image);
    records.push({id:entry.id,name:entry.name,group:entry.group,file:entry.preview.split('/').at(-1),origin:ORIGINAL_DESIGNS[entry.id]?'original':'legacy',renderer:ORIGINAL_DESIGNS[entry.id]?'renderOriginalPreview':entry.group==='app'?'renderPreview':entry.id.startsWith('cvapp-')?'renderDraftPreview':'renderFlowPreview',pages:info.pages,fonts:info.fonts,photo:info.photos===1});
    if(records.length%24===0)console.log('Rendered '+records.length+' / '+selected.length);
    if(errors.length)throw new Error(errors.join('\n'));
  }
  await page.close();
};
try{
  await Promise.all(Array.from({length:3},worker));
  const previous=requested?JSON.parse(await (await import('node:fs/promises')).readFile(output+'/renders.json','utf8')):[];
  const combined=[...previous.filter(t=>!records.some(r=>r.id===t.id)),...records];
  combined.sort((a,b)=>DESIGN_CATALOG.findIndex(t=>t.id===a.id)-DESIGN_CATALOG.findIndex(t=>t.id===b.id));
  await writeFile(output+'/renders.json',JSON.stringify(combined,null,2)+'\n');
  console.log(JSON.stringify({rendered:records.length,source:'own HTML/CSS and fictional fixture',pdfsCreated:0}));
}finally{await browser.close();}
