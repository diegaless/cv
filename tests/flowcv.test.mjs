import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {FLOW_TEMPLATES,flowTemplate} from '../drafts/flowcv/catalog.mjs';
import {normalizeState} from '../assets/cv-model.js';

test('the legacy catalog routes 105 locked designs to our own compositions',async()=>{
  const values=Object.values(FLOW_TEMPLATES);
  assert.equal(values.length,105);assert.equal(new Set(values.map(t=>t.name)).size,105);
  for(const t of values) {
    assert.equal(t.available,false);assert.equal(t.provider,t.engine==='original'?'original':'flowcv');assert.equal(flowTemplate(t.id),t);
    assert.equal(t.engine,'original');assert.equal('shell' in t,false);assert.equal('decor' in t,false);
    assert.equal(normalizeState({design:{template:t.id}}).design.template,'classic');
    if(t.engine==='original') {assert.equal(t.origin,'original');assert.equal(t.width,595.28);assert.equal(t.height,841.89);continue;}
    const columns=t.columns.map(c=>c.id);
    for(const key of ['summary','experience','education','skills','languages','awards','websites'])assert.ok(columns.includes(t.routing[key]),`${t.name}: ${key}`);
    const slots=[];function walk(n){if(n.slot==='flow')slots.push(n.id);for(const c of n.children||[])walk(c);}walk(t.shell);
    assert.deepEqual(slots.sort(),columns.sort(),t.name);
    assert.ok(t.font&&t.nameFont&&t.headings.experience);assert.equal(t.page.width,'210mm');assert.equal(t.page.height,'297mm');
  }
  assert.throws(()=>flowTemplate('missing'),/desconocida/);
});

test('retained open font assets are local and attributed',async()=>{
  const fonts=JSON.parse(await readFile(new URL('../drafts/flowcv/font-sources.json',import.meta.url),'utf8'));
  assert.equal(fonts.length,33);
  const families=new Set(fonts.map(f=>f.family));
  for(const t of Object.values(FLOW_TEMPLATES)) {
    if(t.engine==='original')continue;
    assert.ok(families.has(t.font));assert.ok(families.has(t.nameFont));
    for(const file of t.decor)await access(new URL('../drafts/flowcv/'+file,import.meta.url));
    assert.doesNotMatch(JSON.stringify(t.shell),/url\(["']?https?:/);
  }
  for(const family of fonts) {
    assert.ok(family.license);assert.ok(family.fonts.some(f=>f.weight===400&&f.style==='normal'));
    for(const font of family.fonts)await access(new URL('../drafts/flowcv/'+font.file,import.meta.url));
  }
});

test('FlowCV font files match their registered weight and italic style',async()=>{
  const families=JSON.parse(await readFile(new URL('../drafts/flowcv/font-sources.json',import.meta.url),'utf8'));
  for(const family of families)for(const face of family.fonts) {
    const data=await readFile(new URL('../drafts/flowcv/'+face.file,import.meta.url));
    const tables=new Map();
    for(let i=0;i<data.readUInt16BE(4);i++) {
      const offset=12+i*16;tables.set(data.toString('ascii',offset,offset+4),data.readUInt32BE(offset+8));
    }
    const os2=tables.get('OS/2'),head=tables.get('head'),label=`${family.family}: ${face.weight} ${face.style}`;
    assert.ok(os2&&head,label);
    assert.equal(data.readUInt16BE(os2+4),face.weight,label);
    assert.equal(Boolean((data.readUInt16BE(head+44)&2)||(data.readUInt16BE(os2+62)&1)),face.style==='italic',label);
  }
});

test('FlowCV rendering code cannot enter the public app or Pages build',async()=>{
  assert.match(await readFile(new URL('../_config.yml',import.meta.url),'utf8'),/^  - drafts$/m);
  for(const file of ['index.html','builder.html','resumes.html','account.html','assets/cv-builder.js','assets/cv-preview.js','assets/cv-thumbnail.js','assets/resumes-dashboard.js']) {
    const source=await readFile(new URL('../'+file,import.meta.url),'utf8');assert.doesNotMatch(source,/drafts\/flowcv\/|FLOW_TEMPLATES/);
    assert.doesNotMatch(source,/data-(?:design|template-choice)=["']flow-/);
  }
});
