// Operator maintenance. Dry run by default; never deletes CVs or Auth users.
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {reviewDeletionMarker} from './privacy-retention.mjs';
const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth.js');
const {requireAuth}=require('firebase-tools/lib/requireAuth.js');
const {Client}=require('firebase-tools/lib/apiv2.js');
const args=process.argv.slice(2),apply=args.includes('--apply');
if(args.some(arg=>arg!=='--apply'))throw new Error('Usage: node scripts/privacy-maintenance.mjs [--apply]');
const project='cvapp-2538e',options={project,nonInteractive:true},account=auth.getGlobalDefaultAccount();
if(account)auth.setActiveAccount(options,account);await requireAuth(options);
const db=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'});
const identity=new Client({urlPrefix:'https://identitytoolkit.googleapis.com',apiVersion:'v1'});
const base='/projects/'+project+'/databases/(default)/documents';
const report={checkedAt:new Date().toISOString(),project,mode:apply?'apply':'dry-run',minimumAgeDays:30,checked:0,eligible:0,removed:0,keptRecent:0,keptActiveAccount:0,keptExistingCvs:0,keptInvalidMarker:0,failures:0};
let pageToken='',entries=[],receipts=[];
do{
 const result=(await db.get(base+'/accountDeletions',{queryParams:{pageSize:100,...(pageToken?{pageToken}:{})}})).body;
 entries.push(...(result.documents||[]));pageToken=result.nextPageToken||'';
}while(pageToken);
for(const document of entries){
 report.checked++;
 try{
  const result=await reviewDeletionMarker(document,{apply,
   lookupAccount:async uid=>Boolean((await identity.post('/projects/'+project+'/accounts:lookup',{localId:[uid]})).body.users?.length),
   hasCvs:async uid=>Boolean((await db.get(base+'/users/'+encodeURIComponent(uid)+'/cvs',{queryParams:{pageSize:1}})).body.documents?.length),
   removeMarker:(name,updateTime)=>db.delete('/'+name,{queryParams:{'currentDocument.updateTime':updateTime}})});
  report[result]++;
  if(result==='removed'){
   report.eligible++;
   const uid=document.name.split('/').at(-1),requestedAt=Date.parse(document.fields.requestedAt.timestampValue);
   receipts.push({action:'remove-obsolete-deletion-marker',uidSha256:createHash('sha256').update(uid).digest('hex'),requestedAt:new Date(requestedAt).toISOString(),removedAt:new Date().toISOString()});
  }
 }catch{report.failures++;}
}
await mkdir('.private-compliance',{recursive:true,mode:0o700});
await writeFile('.private-compliance/retention-last-review.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});
if(receipts.length){
 let previous=[];try{previous=JSON.parse(await readFile('.private-compliance/retention-actions.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 await writeFile('.private-compliance/retention-actions.json',JSON.stringify([...previous,...receipts],null,2)+'\n',{mode:0o600});
}
console.log(JSON.stringify(report));
if(report.failures)process.exitCode=1;
