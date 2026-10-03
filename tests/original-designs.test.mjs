import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {ORIGINAL_DESIGNS} from '../drafts/originals/catalog.mjs';
import {DRAFT_TEMPLATES} from '../drafts/templates/catalog.mjs';
import {FLOW_TEMPLATES} from '../drafts/flowcv/catalog.mjs';
import {DESIGN_CATALOG,canSelectDesign} from '../assets/cv-design-catalog.js';
import {normalizeState} from '../assets/cv-model.js';

test('redesigned templates keep their gallery IDs and stay locked',()=>{
  assert.equal(Object.keys(ORIGINAL_DESIGNS).length,142);
  for(const [id,design] of Object.entries(ORIGINAL_DESIGNS)) {
    const publicCard=DESIGN_CATALOG.find(t=>t.id===id);
    const internal=id.startsWith('cvapp-')?DRAFT_TEMPLATES[id.slice(6)]:FLOW_TEMPLATES[id];
    assert.equal(publicCard.name,design.name);
    assert.equal(internal.engine,'original');assert.equal(internal.available,false);
    assert.equal(canSelectDesign(id),false);
    assert.equal(normalizeState({design:{template:id}}).design.template,'classic');
    assert.match(publicCard.preview,/\/(?:original-[a-z]+|owned-\d{3})\.webp$/);
  }
  assert.equal(canSelectDesign('classic'),true);
  assert.equal(normalizeState({design:{template:'compact'}}).design.template,'compact');
});

test('replacement composers use local licensed fonts and no provider ornaments',async()=>{
  for(const file of ['assets/fonts/InterVariable.woff2','assets/fonts/OFL-Inter.txt','drafts/templates/fonts/EBGaramond-Regular.ttf','drafts/templates/fonts/EBGaramond-Italic.ttf','drafts/templates/fonts/EBGaramond-OFL.txt'])await access(new URL('../'+file,import.meta.url));
  for(const file of ['drafts/originals/catalog.mjs','drafts/originals/designs.css','drafts/originals/preview.mjs']) {
    const text=await readFile(new URL('../'+file,import.meta.url),'utf8');
    assert.doesNotMatch(text,/https?:\/\/|referenceImage|cape-town|\.\/decor\//);
  }
  const remaining=Object.values(ORIGINAL_DESIGNS).filter(t=>t.collection==='owned-20261003');
  assert.equal(remaining.length,132);
  assert.equal(new Set(remaining.map(t=>t.theme)).size,12);
  assert.equal(new Set(remaining.map(t=>t.name)).size,132);
  for(const design of remaining)assert.equal(design.origin,'original');
});
