import {Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, TabStopType, Footer, PageNumber, ExternalHyperlink} from "docx";
import {normalizeState, sectionsForCv, contactParts, linkedTextParts} from "./cv-model.js";

const inlineRuns = (value,item,target) => linkedTextParts(value,item.links,target).map(part => part.url
  ? new ExternalHyperlink({link:part.url,children:[new TextRun({text:part.text,underline:{type:"single"}})]}) : new TextRun(part.text));

export async function createDocx(input) {
  const state = normalizeState(input);
  const compact = state.design.template === "compact";
  const font = compact ? "Arial" : "Georgia";
  const accent = state.design.accent.slice(1);
  const paragraphs = [];
  if (state.photoSrc) {
    let photo = state.photoSrc;
    if (photo.startsWith("data:image/webp")) {
      if (typeof document === "undefined") throw new Error("Convierte la foto a PNG o JPG antes de exportar a Word.");
      const image = new Image(); image.src = photo; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 240;
      canvas.getContext("2d").drawImage(image,0,0,240,240); photo = canvas.toDataURL("image/png");
    }
    const base64 = photo.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    paragraphs.push(new Paragraph({alignment:AlignmentType.RIGHT, children:[new ImageRun({data:bytes, type:photo.includes("image/png") ? "png" : "jpg", transformation:{width:70,height:70}, altText:{name:"Foto del currículum",description:state.data.name,title:"Foto"}})]}));
  }
  if (!compact) return createClassicDocx(state, paragraphs);
  paragraphs.push(new Paragraph({text:state.data.name || "Nombre Apellidos", heading:HeadingLevel.TITLE}));
  if (state.data.title) paragraphs.push(new Paragraph({children:[new TextRun({text:state.data.title, bold:true, size:25})], spacing:{after:90}}));
  if (contactParts(state.data).length) paragraphs.push(new Paragraph({text:contactParts(state.data).join(" · "), spacing:{after:180}}));
  for (const section of sectionsForCv(state)) {
    paragraphs.push(new Paragraph({text:section.title, heading:HeadingLevel.HEADING_1}));
    for (const item of section.entries) {
      if (item.title || item.date || item.meta) paragraphs.push(new Paragraph({
        children:[new TextRun({text:[item.title,item.meta].filter(Boolean).join(" · "),bold:true}), ...(item.date ? [new TextRun({text:`  |  ${item.date}`,color:"596579"})] : [])],
        pageBreakBefore:item.page_break_before || false, keepNext:Boolean(item.text || item.bullets?.length), spacing:{before:100,after:70},
      }));
      if (item.text) for (const line of item.text.split("\n")) paragraphs.push(new Paragraph({children:inlineRuns(line,item,"text"),spacing:{after:80},widowControl:true}));
      for (const [index,bullet] of (item.bullets || []).entries()) paragraphs.push(new Paragraph({children:inlineRuns(bullet,item,`bullet:${index}`),bullet:{level:0},spacing:{after:65},widowControl:true}));
    }
  }
  const doc = new Document({
    creator:"CVAPP", title:state.data.name ? `Currículum de ${state.data.name}` : "Currículum",
    styles:{default:{document:{run:{font,size:compact?21:22,color:"202938"},paragraph:{spacing:{line:compact?255:275}}}},paragraphStyles:[
      {id:"Title",name:"Title",basedOn:"Normal",next:"Normal",run:{font,size:42,bold:true,color:"172438"},paragraph:{spacing:{after:90},keepNext:true}},
      {id:"Heading1",name:"Heading 1",basedOn:"Normal",next:"Normal",run:{font,size:25,bold:true,color:accent},paragraph:{spacing:{before:230,after:115},keepNext:true}},
    ]},
    sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1000,right:1100,bottom:1000,left:1100}}},children:paragraphs}],
  });
  return Packer.toBlob(doc);
}

function createClassicDocx(state, children) {
  const accent = state.design.accent.slice(1);
  const width = 10898, datesWidth = 2725, bodyWidth = width - datesWidth;
  const noBorder = {style:BorderStyle.NONE,size:0,color:"FFFFFF"};
  const paragraph = (text, options = {}) => new Paragraph({text, spacing:{line:250,after:0}, widowControl:true, ...options});
  children.push(paragraph([state.data.name || "Nombre Apellidos",state.data.title].filter(Boolean).join(", "), {
    alignment:AlignmentType.CENTER,keepNext:true,spacing:{line:264,after:210},
    children:[new TextRun({text:[state.data.name || "Nombre Apellidos",state.data.title].filter(Boolean).join(", "),size:24,bold:true})],
    text:undefined,
  }));
  const contacts=[state.data.phone,state.data.email,state.data.linkedin,[state.data.postalCode,state.data.city,state.data.country].filter(Boolean).join(" ")].filter(Boolean);
  if (contacts.length) children.push(paragraph(contacts.join(", "),{alignment:AlignmentType.CENTER,keepNext:true,spacing:{after:294}}));
  for (const section of sectionsForCv(state)) {
    children.push(paragraph(section.title,{
      heading:HeadingLevel.HEADING_1,keepNext:true,spacing:{before:280,after:240},
      border:{top:{style:BorderStyle.SINGLE,size:8,color:accent,space:6}},
    }));
    let rows=[];
    const flushRows=()=>{
      if (!rows.length) return;
      children.push(new Table({rows,width:{size:width,type:WidthType.DXA},columnWidths:[datesWidth,bodyWidth],
        margins:{top:0,bottom:0,left:0,right:0},
        borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},
      }));
      rows=[];
    };
    for (const item of section.entries) {
      if (item.page_break_before) {
        flushRows();
        children.push(paragraph("",{pageBreakBefore:true,keepNext:true,spacing:{line:1,after:0,before:0}}));
      }
      const body=[];
      if (item.title || item.meta) body.push(new Paragraph({
        children:[new TextRun({text:item.title || "",size:21}),...(item.meta ? [new TextRun({text:`\t${item.meta}`,size:20})] : [])],
        tabStops:[{type:TabStopType.RIGHT,position:bodyWidth}],spacing:{line:250,after:item.text || item.bullets?.length ? 40 : 0},
        keepNext:Boolean(item.text || item.bullets?.length),widowControl:true,
      }));
      for (const line of (item.text || "").split("\n").filter(Boolean)) body.push(paragraph(undefined,{children:inlineRuns(line,item,"text")}));
      for (const [index, bullet] of (item.bullets || []).entries()) body.push(paragraph(undefined,{children:inlineRuns(bullet,item,`bullet:${index}`),bullet:{level:0},spacing:{line:250,after:index===item.bullets.length-1 ? 0 : 40},indent:{left:462,hanging:178}}));
      if (["experience","education","awards"].includes(section.key)) {
        const bottom = (item.text || item.bullets?.length ? 70 : 120) + Math.round((item.spaceAfter || 0) * 20);
        rows.push(new TableRow({cantSplit:false,children:[
          new TableCell({width:{size:datesWidth,type:WidthType.DXA},margins:{top:30,right:240,bottom,left:0},children:[paragraph((item.date || "").replace(/\s[-–—]\s/g," — "))]}),
          new TableCell({width:{size:bodyWidth,type:WidthType.DXA},margins:{top:0,right:0,bottom,left:0},children:body.length ? body : [paragraph("")]}),
        ]}));
      } else {
        flushRows();children.push(...body);
      }
    }
    flushRows();
  }
  const footer = state.design.pageNumbers ? new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({children:[state.design.pageNumberPrefix ? `${state.design.pageNumberPrefix} ` : "",PageNumber.CURRENT],size:20})]})]}) : undefined;
  return Packer.toBlob(new Document({creator:"CVAPP",title:`Currículum de ${state.data.name || "Nombre Apellidos"}`,
    styles:{default:{document:{run:{font:"Times New Roman",size:20,color:"262626"},paragraph:{spacing:{line:250}}}},paragraphStyles:[
      {id:"Heading1",name:"Heading 1",basedOn:"Normal",next:"Normal",run:{font:"Times New Roman",size:21,bold:false,color:accent,characterSpacing:20,allCaps:true},paragraph:{keepNext:true}},
    ]},
    sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:432,right:504,bottom:432,left:504,footer:605}}},footers:footer ? {default:footer} : undefined,children}],
  }));
}
