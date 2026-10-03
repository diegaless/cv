import {classicLines} from "./vendor/cv-linebreak.js";

const SVG = "http://www.w3.org/2000/svg";
const node = (tag, attributes = {}) => {
  const element = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
};

// SVG keeps fractional baselines when printing. HTML text is snapped to screen
// pixels by Chromium, which used to move dates and bullets in the downloaded CV.
export function typesetClassic(element, {bullet = false, uppercase = false, singleLine = false} = {}) {
  const style = getComputedStyle(element);
  const size = Math.round(parseFloat(style.fontSize) * 750) / 1000;
  const lineHeight = Math.round(parseFloat(style.lineHeight) * 750000) / 1000000;
  const horizontalInsets = style.boxSizing === "border-box" ? [style.paddingLeft,style.paddingRight,style.borderLeftWidth,style.borderRightWidth].reduce((sum,value)=>sum+(parseFloat(value)||0),0) : 0;
  const width = (parseFloat(style.width) - horizontalInsets) * .75;
  if (!width || !size || !Number.isFinite(width)) return;
  const canvas = document.createElement("canvas"), context = canvas.getContext("2d");
  if (!context) return;
  // Measuring at font units avoids rounding 10 pt to 13.33 CSS pixels.
  context.font = `${style.fontStyle} ${style.fontWeight} 2048px ${style.fontFamily}`;
  context.fontKerning = "normal";
  const letterSpacing = (parseFloat(style.letterSpacing) || 0) * .75;
  const measure = value => context.measureText(value).width * size / 2048 + Math.max(0, value.length - 1) * letterSpacing;
  const ascent = (context.measureText("Hg").fontBoundingBoxAscent ?? 1825) * size / 2048;
  const runs = [];
  let text = "";
  function collect(parent, href = null) {
    for (const child of parent.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const value = uppercase ? child.textContent.toUpperCase() : child.textContent;
        runs.push({start:text.length,end:text.length + value.length,href}); text += value;
      } else if (child.nodeName === "BR") text += "\n";
      else collect(child, child.getAttribute("href") || href);
    }
  }
  collect(element);
  if (!text) return;
  const lines = [];
  let offset = 0;
  for (const paragraph of text.split("\n")) {
    let composed;
    try {
      composed = singleLine ? [{start:0,end:paragraph.length,text:paragraph}] : classicLines(paragraph,width,measure);
      if (composed.some(line => measure(line.text.split(/\s+/).sort((a,b)=>b.length-a.length)[0] || "") > width + .05)) return;
    } catch {return;}
    if (!composed.length) composed = [{start:0,end:0,text:""}];
    lines.push(...composed.map(line => ({...line,start:line.start+offset,end:line.end+offset})));
    offset += paragraph.length + 1;
  }
  const svg = node("svg", {viewBox:`0 0 ${width} ${lines.length * lineHeight}`,width:"100%",height:`${lines.length * lineHeight}pt`,class:"cv-typeset",xmlns:SVG});
  svg.style.fontFamily = style.fontFamily;
  // Keep the effective font on the intended side of Chromium's 0.01 px
  // quantization threshold after the A4 viewBox is scaled to CSS pixels.
  svg.style.fontSize = `${size + .001}px`;
  svg.style.fontWeight = style.fontWeight;
  svg.style.fontStyle = style.fontStyle;
  svg.style.letterSpacing = "0";
  svg.style.fill = style.color;
  svg.style.overflow = "visible";
  let link = null, linkHref = null;
  for (const [index,line] of lines.entries()) {
    link = null; linkHref = null;
    const prefix = bullet && index === 0 ? "•  " : "";
    const value = prefix + line.text;
    const hanging = prefix ? 80/9 : 0;
    const available = width + hanging;
    const natural = measure(prefix) + measure(line.text);
    const words = [...value.matchAll(/\S+\s*/g)];
    const gapCount = (value.match(/\S\s+(?=\S)/g) || []).length;
    const shrink = gapCount ? Math.min(0,(available - natural) / gapCount) : 0;
    const alignment = style.textAlign === "center" ? .5 : style.textAlign === "right" ? 1 : 0;
    const origin = -hanging + Math.max(0,available - natural) * alignment;
    let gaps = 0;
    for (const word of words) {
      const localStart = word.index, localEnd = localStart + word[0].length;
      const boundaries = [...new Set([localStart,localEnd,...runs.flatMap(run=>[run.start,run.end]).map(position=>position-line.start+prefix.length).filter(position=>position>localStart&&position<localEnd)])].sort((a,b)=>a-b);
      for(let part=0;part<boundaries.length-1;part++){
      const partStart=boundaries[part],partEnd=boundaries[part+1],content=value.slice(partStart,partEnd);
      const start = partStart - prefix.length + line.start;
      const run = runs.find(run => run.start <= Math.max(line.start,start) && run.end > Math.max(line.start,start));
      const href = partStart < prefix.length ? null : run?.href;
      if (href !== linkHref) {link = href ? node("a",{href,rel:"noopener noreferrer"}) : null; if (link) svg.append(link); linkHref = href;}
      const prefixWidth = prefix && partStart >= prefix.length ? measure(prefix) + measure(line.text.slice(0,partStart-prefix.length+1)) - measure(value[partStart]) : measure(value.slice(0,partStart+1)) - measure(value[partStart]);
      const x = origin + prefixWidth + gaps * shrink;
      const span = node("text",{x,y:index * lineHeight + ascent,"xml:space":"preserve"});
      span.textContent = content;
      span.style.whiteSpace = "pre";
      if (letterSpacing) span.style.letterSpacing = `${letterSpacing}px`;
      // Preserve the measured word width, including spaces and letter spacing.
      span.setAttribute("textLength",measure(content));
      span.setAttribute("lengthAdjust","spacingAndGlyphs");
      (link || svg).append(span);
      if (href && !element.classList.contains("contact")) {
        const visible = content.trimEnd();
        link.append(node("line",{x1:x,x2:x+measure(visible),y1:index*lineHeight+ascent+1,y2:index*lineHeight+ascent+1,stroke:"currentColor","stroke-width":.5}));
      }
      }
      if (/\s$/.test(word[0]) && localEnd < value.length) gaps++;
    }
    if (index < lines.length-1) svg.append(document.createTextNode("\n"));
  }
  element.replaceChildren(svg);
  if (bullet) element.classList.add("cv-typeset-bullet");
}

export function typesetClassicEntry(block) {
  for (const element of block.querySelectorAll("time, h3 > span, .cv-paragraph, li")) typesetClassic(element,{bullet:element.tagName === "LI"});
}

export function vectorizeClassicPage(page) {
  const walker = document.createTreeWalker(page,NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) if (walker.currentNode.textContent.trim() && !walker.currentNode.parentElement.closest(".cv-typeset")) return;
  const svg = node("svg",{viewBox:"0 0 595.28 841.89",class:"cv-vector-page",xmlns:SVG});
  const height = element => parseFloat(element?.querySelector(".cv-typeset")?.getAttribute("height")) || 0;
  const width = element => Number(element?.querySelector(".cv-typeset")?.getAttribute("viewBox").split(" ")[2]) || 0;
  function place(element,x,y) {
    const source = element?.querySelector(".cv-typeset");
    if (!source) return;
    const group = node("g",{transform:`translate(${x} ${y})`,class:element.classList.contains("cv-page-number")?"cv-vector-footer":"cv-vector-body"});
    group.setAttribute("style",source.getAttribute("style"));
    const heading = element.closest("h1,h2,h3");
    if (heading && !element.classList.contains("meta")) {group.setAttribute("role","heading");group.setAttribute("aria-level",heading.tagName.slice(1));}
    for (const child of source.childNodes) group.append(child.cloneNode(true));
    svg.append(group);
  }
  // All flow arithmetic stays in PDF points. Summing rounded DOM rectangles
  // otherwise accumulates a visible drift towards the bottom of a long CV.
  const left=25.2, right=570.08, column=161.42;
  let y=21.6;
  const header=page.querySelector(".cv-header");
  if(header){
    const title=header.querySelector("h1"),contact=header.querySelector(".contact");
    place(title,left,y); y+=height(title);
    if(contact){y+=10;place(contact,left,y);y+=height(contact);}
    const photo=header.querySelector(".profile-photo");
    if(photo){svg.append(node("image",{href:photo.src,x:right-51,y:21.6,width:51,height:51,preserveAspectRatio:"xMidYMid slice"}));y=Math.max(y,21.6+63.75);}
    y+=14;
  }
  for(const [index,section] of [...page.querySelectorAll(".cv-section")].entries()){
    if(index)y+=14;
    svg.append(node("rect",{x:left,y,width:right-left,height:1,fill:getComputedStyle(section.querySelector("h2")).color}));
    y+=7;
    const heading=section.querySelector("h2");place(heading,left,y);y+=height(heading)+12;
    const entries=[...section.querySelectorAll(".cv-item")];
    for(const [entryIndex,entry] of entries.entries()){
      const time=entry.querySelector("time"), title=entry.querySelector("h3 > span:first-child"),meta=entry.querySelector(".meta"),paragraph=entry.querySelector(".cv-paragraph");
      const dated=/cv-item--(?:experience|education|awards)(?:\s|$)/.test(entry.className)||Boolean(time.textContent);
      const x=dated?column:left;
      let bodyY=y;
      place(time,left,y+2); place(title,x,y);
      if(meta)place(meta,right-width(meta),y);
      bodyY+=Math.max(height(title),height(meta));
      if(paragraph){if(title)bodyY+=2;place(paragraph,x,bodyY);bodyY+=height(paragraph);}
      const bullets=[...entry.querySelectorAll("li")];
      if(bullets.length){bodyY+=2;for(const [i,bullet] of bullets.entries()){place(bullet,x+12+100/9,bodyY);bodyY+=height(bullet)+(i<bullets.length-1?2:0);}}
      y=Math.max(bodyY,y+(height(time)?height(time)+2:0));
      y+=Number(entry.dataset.spaceAfter)||0;
      if(entryIndex<entries.length-1)y+=4;
    }
  }
  const footer=page.querySelector(".cv-page-number");
  if(footer)place(footer,right-width(footer),801.76);
  for(const child of page.children){child.style.visibility="hidden";child.setAttribute("aria-hidden","true");}
  page.append(svg);
}
