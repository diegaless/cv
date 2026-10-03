import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewDeletionMarker} from '../scripts/privacy-retention.mjs';
const now=Date.parse('2026-10-03T12:00:00Z');
const marker={name:'projects/demo/databases/(default)/documents/accountDeletions/owner',updateTime:'2026-08-01T12:00:00Z',fields:{requestedAt:{timestampValue:'2026-08-01T12:00:00Z'}}};
function context(overrides={}){
 const calls=[];
 return {calls,now,apply:true,async lookupAccount(uid){calls.push(['auth',uid]);return false;},async hasCvs(uid){calls.push(['cvs',uid]);return false;},async removeMarker(name,time){calls.push(['delete',name,time]);},...overrides};
}
test('retention rejects malformed markers before contacting providers',async()=>{
 for(const change of [{fields:{}},{fields:{...marker.fields,email:{stringValue:'unnecessary'}}},{updateTime:null},{name:'projects/demo/databases/(default)/documents/users/owner/cvs/private'}]){
  const operation=context();assert.equal(await reviewDeletionMarker({...marker,...change},operation),'keptInvalidMarker');assert.deepEqual(operation.calls,[]);
 }
});
test('retention keeps recent and future markers without deleting',async()=>{
 for(const timestampValue of ['2026-10-02T12:00:00Z','2026-10-04T12:00:00Z']){
  const operation=context();assert.equal(await reviewDeletionMarker({...marker,fields:{requestedAt:{timestampValue}}},operation),'keptRecent');assert.deepEqual(operation.calls,[]);
 }
});
test('retention preserves an active Auth account',async()=>{
 const operation=context({lookupAccount:async()=>true});assert.equal(await reviewDeletionMarker(marker,operation),'keptActiveAccount');assert.deepEqual(operation.calls,[]);
});
test('retention preserves a marker if even one CV remains',async()=>{
 const operation=context({hasCvs:async()=>true});assert.equal(await reviewDeletionMarker(marker,operation),'keptExistingCvs');assert.deepEqual(operation.calls,[['auth','owner']]);
});
test('retention dry run never writes',async()=>{
 const operation=context({apply:false});assert.equal(await reviewDeletionMarker(marker,operation),'eligible');assert.deepEqual(operation.calls,[['auth','owner'],['cvs','owner']]);
});
test('retention deletes only the marker with its concurrency precondition',async()=>{
 const operation=context();assert.equal(await reviewDeletionMarker(marker,operation),'removed');
 assert.deepEqual(operation.calls,[['auth','owner'],['cvs','owner'],['delete',marker.name,marker.updateTime]]);
});
test('retention provider errors stop the deletion',async()=>{
 const operation=context({hasCvs:async()=>{throw new Error('Unavailable');}});await assert.rejects(reviewDeletionMarker(marker,operation),/Unavailable/);assert.deepEqual(operation.calls,[['auth','owner']]);
});
