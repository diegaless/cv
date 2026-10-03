import {linebreaker} from "@react-pdf/textkit";

const breakLines = linebreaker({});

// Use the reference composer's paragraph-wide line breaking with the browser's
// actual font measurements. Textkit only needs advances at word boundaries.
export function classicLines(text, width, measure) {
  const syllables = text.match(/\S+|\s+/g) || [];
  const positions = [];
  for (const syllable of syllables) {
    const advance = measure(syllable) / syllable.length;
    for (let i=0;i<syllable.length;i++) positions.push({xAdvance:advance,yAdvance:0,xOffset:0,yOffset:0});
  }
  const indices = Array.from({length:text.length},(_,i)=>i);
  const glyphs = text.split("").map((char,i)=>({codePoints:[char.charCodeAt(0)],advanceWidth:positions[i].xAdvance}));
  const attributed = {string:text,syllables,runs:[{start:0,end:text.length,attributes:{align:"left",scale:1,font:[{}]},positions,glyphs,stringIndices:indices,glyphIndices:indices}]};
  let cursor = 0;
  return breakLines(attributed,[width]).filter(line=>line.string.trim()).map(line => {
    const value = line.string.trim();
    const start = text.indexOf(value,cursor);
    if (start < 0) throw new Error("No se pudo conservar el texto al componer el párrafo.");
    cursor = start + value.length;
    return {start,end:cursor,text:value};
  });
}
