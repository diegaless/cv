import {REMAINING_DESIGNS} from './collection.mjs';
// Compositions authored for this application. Legacy IDs keep gallery links stable.
const page = {width:595.28,height:841.89,available:false,origin:'original',engine:'original'};
const designs = [
  {id:'cvapp-professional',name:'Profesional',layout:'sidebar-right',rail:29,accent:'#265c59',soft:'#edf3f0',nameFont:'CV Own Serif',nameSize:33,theme:'professional',supportsPhoto:true,sideSections:['education','skills','languages','websites']},
  {id:'cvapp-clean',name:'Limpio',layout:'single',accent:'#334155',soft:'#f2f4f6',nameFont:'CV Own Sans',nameSize:28,theme:'clean',supportsPhoto:false},
  {id:'cvapp-industrial',name:'Industrial',layout:'single',accent:'#805641',soft:'#f5efea',nameFont:'CV Own Sans',nameSize:29,theme:'industrial',supportsPhoto:false},
  {id:'cvapp-calligraphic',name:'Caligráfico',layout:'single',accent:'#6b4c54',soft:'#f7f1f0',nameFont:'CV Own Serif',nameSize:35,theme:'calligraphic',supportsPhoto:true},
  {id:'cvapp-solid',name:'Sólido',layout:'sidebar-right',rail:30,accent:'#25384d',soft:'#edf0f4',nameFont:'CV Own Sans',nameSize:30,theme:'solid',supportsPhoto:true,sideSections:['education','skills','languages','websites']},
  {id:'cvapp-colorful',name:'Colorido',layout:'sidebar-right',rail:31,accent:'#713957',secondary:'#b86044',soft:'#fbf3ed',nameFont:'CV Own Sans',nameSize:32,theme:'colorful',supportsPhoto:true,sideSections:['education','skills','languages','websites']},
  {id:'flow-atlantic-blue-multi-column-sidebar-left',name:'Atlántico',layout:'single',accent:'#24506f',soft:'#edf3f7',nameFont:'CV Own Serif',nameSize:34,theme:'atlantic',supportsPhoto:true},
  {id:'flow-creative-two-column-template',name:'Órbita',layout:'sidebar-right',rail:34,accent:'#4f4b72',soft:'#f0eff6',nameFont:'CV Own Sans',nameSize:29,theme:'orbit',supportsPhoto:true,sideSections:['education','skills','languages','websites']},
  {id:'flow-creative-multi-column-web-developer',name:'Optimista',layout:'single',accent:'#64572d',secondary:'#b28443',soft:'#faf5e9',nameFont:'CV Own Sans',nameSize:30,theme:'optimist',supportsPhoto:true},
  {id:'flow-golden-mosaic',name:'Áurea',layout:'single',accent:'#876737',soft:'#faf6ed',nameFont:'CV Own Serif',nameSize:34,theme:'aurea',supportsPhoto:true},
];
export const ORIGINAL_DESIGNS = Object.freeze(Object.fromEntries([...designs,...REMAINING_DESIGNS].map(t=>[t.id,Object.freeze({...page,font:'CV Own Sans',...t})])));
export function originalDesign(id) {
  const design = ORIGINAL_DESIGNS[id];
  if(!design) throw new Error('Diseño propio desconocido: '+id);
  return design;
}
