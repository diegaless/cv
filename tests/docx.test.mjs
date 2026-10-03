import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {createDocx} from "../assets/cv-docx.js";
import {sample} from "./fixture.mjs";

test("Word download is a valid OOXML package with every CV section", async () => {
  const blob = await createDocx(sample);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(String.fromCharCode(...bytes.slice(0,2)),"PK");
  const zip = await JSZip.loadAsync(bytes);
  assert.ok(zip.file("[Content_Types].xml"));
  const xml = await zip.file("word/document.xml").async("string");
  for (const text of ["María García López","28001 Madrid España","Perfil profesional","Competencias","Idiomas","Inglés · B2","Certificación de accesibilidad","https://example.com/portfolio"]) assert.ok(xml.includes(text),text);
  assert.ok(xml.includes('w:w="11906"')); // A4 width in twips
  const styles=await zip.file("word/styles.xml").async("string");
  assert.ok(styles.includes("Times New Roman"));
  assert.ok(xml.includes("María García López, Desarrolladora web"));
  assert.ok(xml.includes('<w:jc w:val="center"/>'));
  assert.ok(xml.includes('<w:gridCol w:w="2725"/>'));
  assert.ok(xml.includes('w:left="504"'));
  assert.ok(await zip.file("word/footer1.xml").async("string"));
});
test("Word respects section order, selected accent, photo, and manual page breaks",async () => {
  const state = structuredClone(sample);
  state.formSectionOrder = ["languages","experience"];
  state.design = {template:"compact",accent:"#24745c"};
  state.experience = undefined;
  state.data.experience[0].page_break_before = true;
  state.photoSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1nQAAAAASUVORK5CYII=";
  const zip = await JSZip.loadAsync(await (await createDocx(state)).arrayBuffer());
  const xml = await zip.file("word/document.xml").async("string");
  const styles = await zip.file("word/styles.xml").async("string");
  assert.ok(xml.indexOf("Idiomas") < xml.indexOf("Experiencia profesional"));
  assert.ok(xml.includes("w:pageBreakBefore"));
  assert.ok(styles.includes("24745c"));
  assert.ok(styles.includes("Arial"));
  assert.equal(Object.keys(zip.files).filter(name => /word\/media\/.+\.png$/.test(name)).length,1);
});
test("Word retains clickable inline links and the selected page-number prefix", async () => {
  const state=structuredClone(sample);
  state.data.awards[0].text="Más información. Link";
  state.data.awards[0].links=[{target:"text",label:"Link",url:"https://example.com/award"}];
  state.design.pageNumberPrefix="Page";
  const zip=await JSZip.loadAsync(await (await createDocx(state)).arrayBuffer());
  assert.ok((await zip.file("word/document.xml").async("string")).includes("w:hyperlink"));
  assert.ok((await zip.file("word/_rels/document.xml.rels").async("string")).includes("https://example.com/award"));
  assert.ok((await zip.file("word/footer1.xml").async("string")).includes("Page "));
});
