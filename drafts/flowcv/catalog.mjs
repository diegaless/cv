import {ORIGINAL_DESIGNS} from '../originals/catalog.mjs';
// Legacy paths preserve development links; every composition is now our own.
export const FLOW_TEMPLATES=Object.freeze(Object.fromEntries(Object.entries(ORIGINAL_DESIGNS).filter(([id])=>id.startsWith('flow-')).map(([id,design])=>[id,Object.freeze({...design,provider:'original'})])));
export function flowTemplate(id){const template=FLOW_TEMPLATES[id];if(!template)throw new Error('Plantilla interna desconocida: '+id);return template;}
