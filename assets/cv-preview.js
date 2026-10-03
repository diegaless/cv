import {normalizeState, sectionsForCv, contactParts, linkedTextParts, escapeHtml as esc} from "./cv-model.js";
import {typesetClassic, typesetClassicEntry, vectorizeClassicPage} from "./cv-typeset.js";

function textFragments(value, max = 600) {
  const words = String(value || "").split(/\s+/);
  const result = [];
  let line = "";
  for (const word of words) {
    if (line && line.length + word.length > max) {result.push(line); line = "";}
    line += `${line ? " " : ""}${word}`;
  }
  if (line) result.push(line);
  return result;
}
function safeLink(value) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {return "";}
}
function entryHtml(item, key, continued = false) {
  const inline = (value,target) => linkedTextParts(value,item.links,target).map(part => part.url ? `<a href="${esc(part.url)}" rel="noopener noreferrer">${esc(part.text)}</a>` : esc(part.text)).join("").replaceAll("\n", "<br>");
  const link = key === "websites" && safeLink(item.text);
  const text = item.text ? `<p class="cv-paragraph">${link ? `<a href="${esc(link)}" rel="noopener noreferrer">${esc(item.text)}</a>` : inline(item.text,"text")}</p>` : "";
  const heading = item.title || item.meta ? `<h3><span>${esc(item.title)}</span>${item.meta ? ` <span class="meta">${esc(item.meta)}</span>` : ""}${continued ? " <small>(continuación)</small>" : ""}</h3>` : "";
  return `<article class="cv-item cv-item--${key}${item.date ? "" : " cv-item--undated"}" data-space-after="${item.spaceAfter || 0}" style="padding-bottom:${item.spaceAfter || 0}pt"><time>${esc((item.date || "").replace(/\s[-–—]\s/g, " — "))}</time><div class="item-body">${heading}${text}${item.bullets?.length ? `<ul>${item.bullets.map((value,index) => `<li>${inline(value,`bullet:${index}`)}</li>`).join("")}</ul>` : ""}</div></article>`;
}

// Measure the actual font and selected template; the print layout uses the same pages.
export function renderPreview(preview, input) {
  const state = normalizeState(input);
  preview.dataset.template = state.design.template;
  preview.style.setProperty("--cv-accent", state.design.accent);
  const parentStyle = getComputedStyle(preview.parentElement);
  const available = preview.parentElement.clientWidth - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight);
  const screenZoom = Math.min(2, Math.max(.2, available / 794));
  // Paginate at the print scale; enlarging the screen preview must not move words
  // or change page breaks in the downloaded PDF.
  preview.style.setProperty("--preview-zoom", "1");
  preview.innerHTML = "";
  let page;
  let flow;
  let footer;
  let section;
  let pageNumber = 0;
  function newPage() {
    page = document.createElement("article");
    page.className = "cv-page";
    page.setAttribute("aria-label", `Página ${++pageNumber} del currículum de ${state.data.name || "Nombre Apellidos"}`);
    preview.append(page);
    flow = document.createElement("div");
    flow.className = "cv-page-body";
    page.append(flow);
    footer = null;
    if (state.design.pageNumbers) {
      footer = document.createElement("footer");
      footer.className = "cv-page-number";
      footer.textContent = [state.design.pageNumberPrefix,pageNumber].filter(Boolean).join(" ");
      page.append(footer);
      if (state.design.template === "classic") {footer.style.width = `${footer.getBoundingClientRect().width}px`; typesetClassic(footer,{singleLine:true});}
    }
    section = null;
  }
  function startSection(title, continuation = false) {
    section = document.createElement("section");
    section.className = "cv-section";
    section.innerHTML = `<h2 class="section-title">${esc(title)}${continuation ? " · continuación" : ""}</h2>`;
    flow.append(section);
    if (state.design.template === "classic") typesetClassic(section.querySelector("h2"),{uppercase:true});
  }
  function isOverflowing() {
    const rect = page.getBoundingClientRect();
    const scale = rect.width / page.offsetWidth;
    const padding = parseFloat(getComputedStyle(page).paddingBottom) * scale;
    const last = flow.lastElementChild;
    if (last.getBoundingClientRect().bottom > rect.bottom - padding + 1) return true;
    // The reference places the folio alongside the last lines. Check actual text
    // rectangles so a short line may fit there, but text can never cover the folio.
    if (footer) {
      const folio = footer.getBoundingClientRect();
      const inkTop = folio.top + (state.design.template === "classic" ? 1.4323 * scale : 0);
      if (last.getBoundingClientRect().bottom <= folio.top) return false;
      const nodes = document.createTreeWalker(last, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      while (nodes.nextNode()) {
        range.selectNodeContents(nodes.currentNode);
        if ([...range.getClientRects()].some(box => box.bottom > inkTop && box.top < folio.bottom && box.right > folio.left - 6 * scale)) return true;
      }
    }
    return false;
  }
  function appendBlock(html) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    const block = wrapper.firstElementChild;
    section.append(block);
    if (state.design.template === "classic") typesetClassicEntry(block);
    return block;
  }
  newPage();
  const header = document.createElement("header");
  header.className = `cv-header${state.photoSrc ? " cv-header--photo" : ""}`;
  const classic = state.design.template === "classic";
  const contacts = classic
    ? [state.data.phone, state.data.email, state.data.linkedin, [state.data.postalCode, state.data.city, state.data.country].filter(Boolean).join(" ")].filter(Boolean)
    : contactParts(state.data);
  const heading = `<h1>${esc(state.data.name || "Nombre Apellidos")}${classic && state.data.title ? `, ${esc(state.data.title)}` : ""}</h1>`;
  const contactHtml = contacts.map(value => {
    const href = value === state.data.email ? `mailto:${encodeURI(value)}` : value === state.data.linkedin ? safeLink(value) : "";
    return href ? `<a href="${esc(href)}">${esc(value)}</a>` : esc(value);
  }).join(classic ? ", " : " · ");
  header.innerHTML = `<div>${heading}${!classic && state.data.title ? `<p class="cv-job-title">${esc(state.data.title)}</p>` : ""}${contacts.length ? `<p class="contact">${contactHtml}</p>` : ""}</div>${state.photoSrc ? `<img class="profile-photo" src="${state.photoSrc}" alt="Foto de ${esc(state.data.name)}" />` : ""}`;
  flow.append(header);
  if (classic) for (const element of header.querySelectorAll("h1, .contact")) typesetClassic(element);
  for (const {key, title, entries} of sectionsForCv(state)) {
    startSection(title);
    for (const item of entries) {
      if (item.page_break_before && (flow.children.length > 1 || section.children.length > 1)) {
        if (section.children.length === 1) section.remove();
        newPage(); startSection(title);
      }
      let block = appendBlock(entryHtml(item, key));
      if (!isOverflowing()) continue;
      block.remove();
      if (section.children.length === 1) section.remove();
      if (flow.children.length) {newPage(); startSection(title, true);} else if (!section.isConnected) startSection(title);
      block = appendBlock(entryHtml(item, key));
      if (!isOverflowing()) continue;
      // A very long entry is split at text/bullet boundaries, preserving every word.
      block.remove();
      const pieces = [
        ...textFragments(item.text).map(text => ({text, bullets:[], links:(item.links || []).filter(link => link.target === "text")})),
        ...(item.bullets || []).flatMap((bullet,index) => textFragments(bullet).map(text => ({text:"", bullets:[text],links:(item.links || []).filter(link => link.target === `bullet:${index}`).map(link => ({...link,target:"bullet:0"}))}))),
      ];
      if (!pieces.length) {appendBlock(entryHtml(item, key)); continue;}
      let first = true;
      for (const piece of pieces) {
        const fragment = {...item, ...piece, date:first ? item.date : "", title:first ? item.title : "", meta:first ? item.meta : ""};
        block = appendBlock(entryHtml(fragment, key));
        if (isOverflowing() && section.children.length > 2) {
          block.remove(); newPage(); startSection(title, true); appendBlock(entryHtml(fragment, key));
        }
        first = false;
      }
    }
  }
  if (classic) for (const page of preview.children) vectorizeClassicPage(page);
  preview.style.setProperty("--preview-zoom", String(screenZoom));
  return pageNumber;
}

export async function preparePrint(preview, state) {
  await document.fonts.ready;
  renderPreview(preview, state);
  await Promise.all([...preview.querySelectorAll("img")].map(img => img.decode().catch(() => {})));
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}
