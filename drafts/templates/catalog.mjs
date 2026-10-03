import {CATALOG_LAYOUTS} from './catalog-layouts.mjs';
export const DRAFT_TEMPLATES=CATALOG_LAYOUTS;
export function draftTemplate(id){const template=DRAFT_TEMPLATES[id];if(!template)throw new Error('Plantilla interna desconocida: '+id);return template;}
