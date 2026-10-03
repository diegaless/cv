import {flowTemplate} from './catalog.mjs';
import {renderOriginalPreview} from '../originals/preview.mjs';
export async function renderFlowPreview(container,input,options={}){flowTemplate(options.template);return renderOriginalPreview(container,input,options);}
