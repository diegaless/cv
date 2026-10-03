import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DESIGN_CATALOG, DESIGN_GROUPS, canSelectDesign} from '../assets/cv-design-catalog.js';
import {DRAFT_TEMPLATES} from '../drafts/templates/catalog.mjs';
import {FLOW_TEMPLATES} from '../drafts/flowcv/catalog.mjs';
import {normalizeState} from '../assets/cv-model.js';

test('the design gallery keeps every additional template in More templates',()=>{
  assert.equal(DESIGN_CATALOG.length,144);
  assert.equal(new Set(DESIGN_CATALOG.map(t=>t.id)).size,144);
  const additional=[...Object.keys(DRAFT_TEMPLATES).filter(id=>id!=='cvapp-classic').map(id=>'cvapp-'+id),...Object.keys(FLOW_TEMPLATES)];
  assert.deepEqual(DESIGN_CATALOG.filter(t=>t.group==='more').map(t=>t.id).sort(),additional.sort());
  assert.deepEqual(DESIGN_GROUPS,[{id:'app',name:'Nuestras plantillas'},{id:'more',name:'Más plantillas'}]);
  assert.deepEqual(DESIGN_CATALOG.filter(t=>t.group==='app').map(t=>t.id),['classic','compact']);
  for(const t of DESIGN_CATALOG)assert.ok(t.name&&DESIGN_GROUPS.some(g=>g.id===t.group));
});

test('only Classic can be selected while draft styles remain rejected',()=>{
  assert.deepEqual(DESIGN_CATALOG.filter(t=>canSelectDesign(t.id)).map(t=>t.id),['classic']);
  assert.equal(canSelectDesign('missing'),false);
  for(const t of DESIGN_CATALOG.filter(t=>t.group!=='app'))assert.equal(normalizeState({design:{template:t.id}}).design.template,'classic');
  assert.equal(normalizeState({design:{template:'compact'}}).design.template,'compact','preserve already saved Compact CVs');
});

test('public previews contain only local WebP samples, never draft rendering code',async()=>{
  for(const t of DESIGN_CATALOG) {
    assert.deepEqual(Object.keys(t).sort(),['available','group','id','name','preview']);
    assert.match(t.preview,/^\.\/media\/template-previews\/[a-z0-9-]+\.webp$/);
    const image=await readFile(new URL('../assets/'+t.preview,import.meta.url));
    assert.equal(image.toString('ascii',0,4),'RIFF');assert.equal(image.toString('ascii',8,12),'WEBP');assert.ok(image.length>1000);
  }
  for(const file of ['assets/cv-design-catalog.js','assets/cv-design-gallery.js','assets/cv-builder.js']) {
    assert.doesNotMatch(await readFile(new URL('../'+file,import.meta.url),'utf8'),/import[^;]*drafts\//);
  }
});
