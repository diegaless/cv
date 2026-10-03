import {draftTemplate} from './catalog.mjs';
import {renderOriginalPreview} from '../originals/preview.mjs';
import {renderPreview,preparePrint} from '../../assets/cv-preview.js';
import {normalizeState} from '../../assets/cv-model.js';
export async function renderDraftPreview(container,input,options={}) {
 const template=draftTemplate(options.template);
 if(template.engine==='original')return renderOriginalPreview(container,input,{...options,template:template.originalId,resultId:template.id});
 const state=normalizeState({...input,design:{...input.design,template:'classic'}});
 container.classList.remove('original-preview','draft-preview','flow-preview');
 renderPreview(container,state);await preparePrint(container,state);
 return {template:template.id,pages:container.children.length,available:false,origin:'public'};
}
