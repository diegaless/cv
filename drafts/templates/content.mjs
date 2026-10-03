import {linkedTextParts, safeHttpUrl, escapeHtml as esc} from "../../assets/cv-model.js";

export const webUrl = value => safeHttpUrl(/^https?:\/\//i.test(value) ? value : `https://${value}`);
export function contactLink(value, kind) {
  const href = kind === "email" ? `mailto:${encodeURI(value)}` : webUrl(value);
  return href ? `<a href="${esc(href)}">${esc(value)}</a>` : esc(value);
}

export function chunks(value, links, target, limit = 400) {
  const text = String(value || ""), ranges = []; let start = 0, end = 0;
  for (const word of text.matchAll(/\S+\s*/g)) {
    if (end > start && word.index + word[0].length - start > limit) {ranges.push([start,end]);start=end;}
    end = word.index + word[0].length;
  }
  if (end > start) ranges.push([start,end]);
  const parts = linkedTextParts(text,links,target);
  return ranges.map(([from,to])=>{
    let offset = 0; const runs = [];
    for (const part of parts) {
      const end = offset + part.text.length;
      if (end > from && offset < to) runs.push({...part,text:part.text.slice(Math.max(0,from-offset),Math.min(part.text.length,to-offset))});
      offset = end;
    }
    return {text:text.slice(from,to),runs};
  });
}

export function fragmentEntry(item, limit = 300) {
  const pieces = [
    ...chunks(item.text,item.links,"text",limit).map(({text,runs})=>({text,bullets:[],runs:{text:runs}})),
    ...(item.bullets || []).flatMap((bullet,i)=>chunks(bullet,item.links,`bullet:${i}`,limit).map(({text,runs})=>({text:"",bullets:[text],runs:{"bullet:0":runs}}))),
  ];
  return pieces.map((piece,index)=>({...item,...piece,title:index ? "" : item.title,date:index ? "" : item.date,meta:index ? "" : item.meta,spaceAfter:index===pieces.length-1 ? item.spaceAfter : 0}));
}

export function entryMarkup(item, key) {
  const inline = (value,target) => (item.runs?.[target] || linkedTextParts(value,item.links,target)).map(p=>p.url ? `<a href="${esc(p.url)}">${esc(p.text)}</a>` : esc(p.text)).join("").replaceAll("\n","<br>");
  const text = key === "websites" && webUrl(item.text) ? `<a href="${esc(webUrl(item.text))}">${esc(item.text)}</a>` : inline(item.text || "","text");
  const heading=item.title || item.date ? `<div class="catalog-entry-heading">${item.title ? `<h3>${esc(item.title)}</h3>` : ""}${item.date ? `<time>${esc(item.date.replace(/\s[-–—]\s/g," — "))}</time>` : ""}</div>` : "";
  return `<article class="draft-entry catalog-entry" style="padding-bottom:${item.spaceAfter || 0}pt">${heading}<div class="catalog-entry-content">${item.meta ? `<p class="draft-entry-meta">${esc(item.meta)}</p>` : ""}${item.text ? `<p class="draft-paragraph">${text}</p>` : ""}${item.bullets?.length ? `<ul>${item.bullets.map((b,i)=>`<li>${inline(b,`bullet:${i}`)}</li>`).join("")}</ul>` : ""}</div></article>`;
}
