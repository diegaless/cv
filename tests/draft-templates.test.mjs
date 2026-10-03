import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {DRAFT_TEMPLATES, draftTemplate} from "../drafts/templates/catalog.mjs";
import {normalizeState} from "../assets/cv-model.js";

test("the compatibility catalog contains 37 own compositions and the public classic renderer",async()=>{
  assert.equal(Object.keys(DRAFT_TEMPLATES).length,38);
  for(const t of Object.values(DRAFT_TEMPLATES)) {
    assert.ok(t.width>0&&t.height>0);
    assert.equal(t.engine,t.id==='cvapp-classic'?'classic':'original');
    assert.equal(typeof t.supportsPhoto,'boolean');
    assert.equal('reference' in t,false);
  }
});

test("draft templates cannot be activated by importing a public CV",()=>{
  for(const id of Object.keys(DRAFT_TEMPLATES)) {
    assert.equal(draftTemplate(id).available,false);
    assert.equal(normalizeState({design:{template:id}}).design.template,"classic");
  }
  assert.throws(()=>draftTemplate("missing"),/desconocida/);
});

test("draft rendering code is excluded from Pages and public entry points",async()=>{
  assert.match(await readFile(new URL("../_config.yml",import.meta.url),"utf8"),/^  - drafts$/m);
  for(const file of ["builder.html","resumes.html","account.html","index.html","assets/cv-builder.js","assets/cv-preview.js","assets/cv-thumbnail.js","assets/resumes-dashboard.js"]) {
    const source=await readFile(new URL(`../${file}`,import.meta.url),"utf8");
    assert.doesNotMatch(source,/["'](?:\.\.\/|\.\/)*drafts\/templates\//);
    assert.doesNotMatch(source,new RegExp(`data-(?:design|template-choice)=["'](?:${Object.keys(DRAFT_TEMPLATES).join("|")})["']`));
  }
});
