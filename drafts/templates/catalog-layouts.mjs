import {ORIGINAL_DESIGNS} from '../originals/catalog.mjs';
// Compatibility keys only. The observed compositions have been retired.
export const CATALOG_ORDER = Object.freeze([
  "cvapp-classic","traditional","professional","prime-ats","pure-ats","specialist","clean","simple-ats",
  "corporate","clear","precise-ats","two-column-ats","balanced","header-ats","essential","polished",
  "vivid","calligraphic","harmonious","defined","minimalist","industrial","elegant","striking",
  "solid","nuanced","executive","character","modern","creative","pastel","visionary","confetti",
  "colorful","entry-level","academic","rirekisho","shokumukeirekisho",
]);

export const CATALOG_LAYOUTS=Object.freeze(Object.fromEntries(CATALOG_ORDER.map(id=>[id,Object.freeze(id==='cvapp-classic'
 ? {id,name:'Clásica',width:595.28,height:841.89,available:false,engine:'classic',supportsPhoto:false}
 : {...ORIGINAL_DESIGNS['cvapp-'+id],id,originalId:'cvapp-'+id})])));
