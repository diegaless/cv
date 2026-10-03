import test from "node:test";
import assert from "node:assert/strict";
import {normalizeData, normalizeState, normalizeOrder, resumeText, progress, escapeHtml, linkedTextParts} from "../assets/cv-model.js";
import {CvRepository} from "../assets/cv-store.js";
import {sample, MemoryStorage} from "./fixture.mjs";

test("all editable sections and contact fields survive the common export model", () => {
  const exported = resumeText(sample);
  for (const value of ["28001 Madrid España","PERFIL PROFESIONAL","Accesibilidad web","Inglés · B2","https://example.com/portfolio","Certificación de accesibilidad"]) assert.ok(exported.includes(value),value);
  assert.equal(progress(sample.data).percent,100);
  assert.equal(progress(normalizeData()).percent,0);
  const reordered = resumeText({...sample,formSectionOrder:["languages","skills"]});
  assert.ok(reordered.indexOf("IDIOMAS") < reordered.indexOf("EXPERIENCIA"));
});
test("old section order migrates and malformed imports cannot inject markup or image URLs", () => {
  assert.deepEqual(normalizeOrder(["profile","areas","letters","profile"]).slice(0,2),["summary","skills"]);
  assert.equal(normalizeState({photoSrc:'https://tracker.invalid/me'}).photoSrc,"");
  assert.equal(normalizeState({photoSrc:'data:image/svg+xml;base64,PHN2Zz4='}).photoSrc,"");
  assert.equal(normalizeState({design:{accent:'red;display:none'}}).design.accent,"#212121");
  assert.deepEqual(normalizeData({skills:[{},null," SQL "],experience:[null]}).skills,["SQL"]);
  assert.equal(escapeHtml('<script>"&'),"&lt;script&gt;&quot;&amp;");
});
test("guest CV survives reload and same-tab PDF routing; copies are independent",async () => {
  const temporary = new MemoryStorage();
  const local = new MemoryStorage();
  const first = new CvRepository({temporary,local});
  const created = await first.create(sample,"CV de prueba");
  const reloaded = new CvRepository({temporary,local});
  assert.deepEqual((await reloaded.get(created.id)).state,sample);
  assert.ok(reloaded.url("builder.html",created.id).endsWith("&guest=1"));
  const copied = await reloaded.create(created.state,"Copia");
  await reloaded.rename(copied.id,"Otro puesto");
  assert.equal((await reloaded.get(created.id)).title,"CV de prueba");
  await reloaded.remove(copied.id);
  assert.equal(await reloaded.get(copied.id),null);
  assert.equal(new CvRepository({temporary:new MemoryStorage(),local}).guestDocuments().length,0);
});
test("pending drafts are isolated by account and never fall back to another user's storage", () => {
  const local = new MemoryStorage(), temporary = new MemoryStorage();
  const a = new CvRepository({user:{uid:"a"},auth:{currentUser:{uid:"a"}},local,temporary});
  const b = new CvRepository({user:{uid:"b"},auth:{currentUser:{uid:"b"}},local,temporary});
  a.saveDraft({id:"same-id",title:"A",state:sample});
  assert.equal(a.readDraft("same-id").record.title,"A");
  assert.equal(b.readDraft("same-id"),null);
  assert.equal(new CvRepository({local,temporary}).readDraft("same-id"),null);
  a.auth.currentUser = {uid:"b"};
  assert.throws(() => a.saveDraft({id:"same-id"}),/sesión ha cambiado/);
});
test("legacy guest CVs remain available without migrating unrelated cover letters", async () => {
  const temporary = new MemoryStorage();
  temporary.setItem("cv-builder-documents-v1-guest",JSON.stringify([{id:"old-cv",title:"Anterior",state:sample},{id:"letter",kind:"cover-letter"}]));
  const repo = new CvRepository({temporary,local:new MemoryStorage()});
  assert.equal(repo.guestDocuments().length,1);
  assert.equal((await repo.get("old-cv")).state.data.name,sample.data.name);
});
test("existing default CVs recover the classic layout without losing content or chosen colors", () => {
  const existing={...structuredClone(sample),design:{template:"professional",accent:"#1a91f0"}};
  existing.data.awards[0].text="Un párrafo sin viñetas.\nSegunda línea.";
  const restored=normalizeState(existing);
  assert.deepEqual(restored.design,{template:"classic",accent:"#212121",pageNumbers:true,pageNumberPrefix:"Página"});
  assert.deepEqual(restored.data,existing.data);
  assert.ok(resumeText(restored).includes("Un párrafo sin viñetas.\nSegunda línea."));
  assert.equal(normalizeState({...existing,design:{template:"professional",accent:"#24745c",pageNumbers:false}}).design.accent,"#24745c");
  assert.equal(normalizeState({...existing,design:{template:"classic",pageNumbers:false}}).design.pageNumbers,false);
});
test("inline links preserve labels and destinations while rejecting executable URLs", () => {
  const item=normalizeData({awards:[{title:"Premio",text:"Detalles. Link",links:[
    {target:"text",label:"Link",url:"https://example.com/details"},
    {target:"text",label:"Detalles",url:"javascript:alert(1)"},
  ]}]}).awards[0];
  assert.equal(item.links.length,1);
  assert.deepEqual(linkedTextParts(item.text,item.links),[{text:"Detalles. "},{text:"Link",url:"https://example.com/details"}]);
  assert.deepEqual(linkedTextParts(item.text,item.links,"bullet:0"),[{text:item.text}]);
  assert.equal(normalizeState({design:{pageNumberPrefix:" Page "}}).design.pageNumberPrefix,"Page");
});

test("entry formatting preserves deliberate spaces and bounds additional spacing", () => {
  const data=normalizeData({education:[{title:"Título con  doble espacio",meta:"Dato  adicional",spaceAfter:0.625},{spaceAfter:-2},{spaceAfter:999},{spaceAfter:"invalid"}]});
  assert.equal(data.education[0].title,"Título con  doble espacio");
  assert.equal(data.education[0].meta,"Dato  adicional");
  assert.deepEqual(data.education.map(item=>item.spaceAfter),[0.625,0,36,0]);
});
