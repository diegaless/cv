import test from "node:test";
import assert from "node:assert/strict";
import {initializeApp, deleteApp} from "firebase/app";
import {getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut} from "firebase/auth";
import * as authSdk from "firebase/auth";
import * as firestore from "firebase/firestore";
import {CvRepository} from "../assets/cv-store.js";
import {sample,MemoryStorage} from "./fixture.mjs";
import {accountData} from "../assets/cv-privacy-data.js";

assert.equal(process.env.GCLOUD_PROJECT,"demo-cvapp","Run with npm run test:firebase; never use a production project.");
assert.ok(process.env.FIRESTORE_EMULATOR_HOST);
assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST);
const apps = [];
test.after(async () => {await Promise.all(apps.map(deleteApp));});
const password = "emulator-only-password";
async function client(name,email,existing=false) {
  const app = initializeApp({projectId:"demo-cvapp",apiKey:"demo-key",authDomain:"demo-cvapp.firebaseapp.com"},name);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth,`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`,{disableWarnings:true});
  const db = firestore.getFirestore(app);
  const [host,port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
  firestore.connectFirestoreEmulator(db,host,Number(port));
  if (email) await (existing ? signInWithEmailAndPassword : createUserWithEmailAndPassword)(auth,email,password);
  // Only the Google popup is substituted: reauthentication and deletion still
  // go through the real Auth emulator using a disposable email/password user.
  const accountAuth = {...authSdk,reauthenticateWithPopup:user => authSdk.reauthenticateWithCredential(user,authSdk.EmailAuthProvider.credential(email,password))};
  const repo = auth.currentUser ? new CvRepository({auth,user:auth.currentUser,authSdk:accountAuth,db,firestore,local:new MemoryStorage(),temporary:new MemoryStorage()}) : null;
  return {app,auth,db,repo};
}
async function adminDocuments(path, options = {}) {
  const response = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/demo-cvapp/databases/(default)/documents/${path}`, {
    ...options, headers:{Authorization:"Bearer owner","Content-Type":"application/json"},
  });
  assert.ok(response.ok,await response.clone().text());
  return response.json();
}
test("authenticated Firebase CRUD, persistence, live list, and isolation", {timeout:45000},async t => {
  const alice = await client("alice","alice@example.test");
  const bob = await client("bob","bob@example.test");
  const anon = await client("unauthenticated");
  const created = await alice.repo.create(sample,"Mi CV en la nube");
  assert.ok(created.updatedAt > 0);
  await t.test("account reopens the same content on a second client", async () => {
    const second = await client("alice-second-device","alice@example.test",true);
    assert.deepEqual((await second.repo.get(created.id)).state,sample);
    await second.repo.rename(created.id,"Candidatura A");
    const fetched = await alice.repo.get(created.id);
    assert.equal(fetched.title,"Candidatura A");
    assert.deepEqual(fetched.state,sample);
    fetched.state.data.summary = "Actualización desde otro dispositivo";
    await alice.repo.save(fetched);
    assert.equal((await second.repo.get(created.id)).state.data.summary,fetched.state.data.summary);
  });
  await t.test("list sees cloud records and duplicate has independent content",async () => {
    const copy = await alice.repo.create(sample,"Copia");
    const values = await new Promise((resolve,reject) => {
      let stop;
      const timer = setTimeout(() => {stop?.();reject(new Error("No cloud list received"));},10000);
      stop = alice.repo.watch(records => {if(records.length >= 2) {clearTimeout(timer);stop();resolve(records);}},reject);
    });
    assert.equal(values.length,2);
    assert.equal(values[0].id,copy.id);
    await alice.repo.remove(copy.id);
    assert.equal(await alice.repo.get(copy.id),null);
    await assert.rejects(alice.repo.save(copy),error => ["not-found","permission-denied"].includes(error.code));
    assert.equal(await alice.repo.get(copy.id),null);
  });
  await t.test("other account cannot read, list, write, or delete Alice's CV",async () => {
    const foreign = firestore.doc(bob.db,"users",alice.auth.currentUser.uid,"cvs",created.id);
    for (const action of [() => firestore.getDoc(foreign),() => firestore.updateDoc(foreign,{title:"intrusion"}),() => firestore.deleteDoc(foreign),() => firestore.getDocs(firestore.collection(bob.db,"users",alice.auth.currentUser.uid,"cvs"))]) await assert.rejects(action(),error => error.code === "permission-denied");
    assert.equal(await bob.repo.get(created.id),null);
    const unauthenticated = firestore.doc(anon.db,"users",alice.auth.currentUser.uid,"cvs",created.id);
    await assert.rejects(firestore.getDoc(unauthenticated),error => error.code === "permission-denied");
  });
  await t.test("writes from a signed-out editor are rejected",async () => {
    await signOut(alice.auth);
    await assert.rejects(alice.repo.save(created),/sesión ha cambiado/);
  });
});

test('security audit rejects invalid nested data on both create and update', {timeout:45000},async t=>{
  const owner=await client('validation-owner','validation-owner@example.test');
  const saved=await owner.repo.create(sample,'CV válido');
  const invalidStates=[
    {data:{...sample.data,admin:true}},
    {data:{...sample.data,email:false}},
    {data:{...sample.data,summary:'x'.repeat(200001)}},
    {data:{...sample.data,skills:Array.from({length:401},()=> 'competencia')}},
    {design:{...sample.design,template:'cvapp-professional'}},
    {design:{...sample.design,pageNumbers:'yes'}},
    {photoSrc:'javascript:alert(1)'},
    {photoSrc:'data:text/html;base64,PHNjcmlwdD4='},
    {formSectionOrder:['summary','admin']},
  ];
  await t.test('the same constraints apply when creating and updating',async()=>{
    for(const [index,invalid] of invalidStates.entries()){
      const created={...sample,...invalid,title:'Invalid '+index,ownerUid:owner.auth.currentUser.uid,createdAt:firestore.serverTimestamp(),updatedAt:firestore.serverTimestamp()};
      await assert.rejects(firestore.setDoc(owner.repo.reference('invalid-'+index),created),{code:'permission-denied'});
      await assert.rejects(firestore.updateDoc(owner.repo.reference(saved.id),{...invalid,updatedAt:firestore.serverTimestamp()}),{code:'permission-denied'});
    }
    assert.deepEqual((await owner.repo.get(saved.id)).state,sample);
  });
  await t.test('ordinary text, photo and metadata updates still work',async()=>{
    saved.state.photoSrc='data:image/png;base64,aGVsbG8=';
    saved.state.data.summary='Perfil profesional actualizado';
    await owner.repo.save(saved);
    await owner.repo.rename(saved.id,'CV corregido');
    assert.equal((await owner.repo.get(saved.id)).state.photoSrc,saved.state.photoSrc);
  });
});

test('whole-account export includes server CVs without dates and isolates each owner', {timeout:45000},async()=>{
  const owner=await client('export-owner','export-owner@example.test');
  const other=await client('export-other','export-other@example.test');
  const record=await owner.repo.create(sample,'CV para exportar');
  const foreign=await other.repo.create(sample,'CV privado ajeno');
  await adminDocuments(`users/${owner.auth.currentUser.uid}/cvs/export-legacy`,{method:'PATCH',body:JSON.stringify({fields:{title:{stringValue:'CV antiguo sin fecha'}}})});
  owner.repo.saveDraft(record);
  owner.repo.temporary.setItem(`${owner.repo.scope}:draft:temporary`,JSON.stringify({record:{id:'temporary'},savedAt:1}));
  owner.repo.local.setItem(`${owner.repo.scope}-other:draft:foreign`,'private foreign draft');
  owner.repo.local.setItem('cvapp:guest:documents:v2','private guest CV');
  const exported=await accountData(owner.repo);
  assert.equal(exported.account.uid,owner.auth.currentUser.uid);
  assert.equal(exported.account.email,'export-owner@example.test');
  assert.deepEqual(exported.cvs.map(cv=>cv.id).sort(),[record.id,'export-legacy'].sort());
  assert.equal(exported.deletionRequest,null);
  assert.deepEqual(exported.localCopies.map(copy=>[copy.location,copy.key]).sort(),[['local',`draft:${record.id}`],['session','draft:temporary']].sort());
  assert.ok(!JSON.stringify(exported).includes('private foreign draft'));
  assert.ok(!JSON.stringify(exported).includes('private guest CV'));
  const otherExport=await accountData(other.repo);
  assert.deepEqual(otherExport.cvs.map(cv=>cv.id),[foreign.id]);
  const stableSdk=owner.repo.sdk;
  const switchedSdk={...stableSdk,getDocsFromServer:async ref=>{const result=await stableSdk.getDocsFromServer(ref);await signOut(owner.auth);return result;}};
  owner.repo.sdk=switchedSdk;
  await assert.rejects(accountData(owner.repo),/sesión ha cambiado/);
});

test("account deletion is confirmed, isolated, resumable, and removes cloud data before Auth", {timeout:60000},async t => {
  const owner = await client("delete-owner","delete-owner@example.test");
  const other = await client("delete-other","delete-other@example.test");
  const second = await client("delete-second-device","delete-owner@example.test",true);
  const anonymous = await client("delete-anonymous");
  const uid = owner.auth.currentUser.uid;
  const original = await owner.repo.create(sample,"Conservar hasta confirmar");
  const otherCv = await other.repo.create(sample,"CV de otra persona");
  owner.repo.saveDraft(original);
  owner.repo.temporary.setItem(`${owner.repo.scope}:draft:temporary`,"private");
  for (const storage of [owner.repo.local,owner.repo.temporary]) {
    storage.setItem(`cvapp:user:${uid}-other:draft:unrelated`,"keep");
    storage.setItem("cvapp:guest:documents:v2","keep guest");
  }
  const actualAuth = owner.repo.authSdk;
  await t.test("closing Google verification leaves Auth, CVs and drafts untouched",async () => {
    owner.repo.authSdk = {...actualAuth,reauthenticateWithPopup:async () => {throw Object.assign(new Error("Cancelled"),{code:"auth/popup-closed-by-user"});}};
    await assert.rejects(owner.repo.deleteAccount(),{code:"auth/popup-closed-by-user"});
    assert.equal(await owner.repo.getAccountDeletionStatus(),false);
    assert.deepEqual((await owner.repo.get(original.id)).state,sample);
    assert.ok(owner.repo.readDraft(original.id));
    assert.equal(owner.auth.currentUser.uid,uid);
    assert.equal(owner.repo.isDeletingAccount,false);
    owner.repo.authSdk = actualAuth;
  });
  await t.test("deletion markers cannot be forged for others, listed, or created with extra data",async () => {
    const foreign = firestore.doc(other.db,"accountDeletions",uid);
    await assert.rejects(firestore.getDoc(foreign),{code:"permission-denied"});
    await assert.rejects(firestore.setDoc(foreign,{requestedAt:firestore.serverTimestamp()}),{code:"permission-denied"});
    await assert.rejects(firestore.getDocs(firestore.collection(owner.db,"accountDeletions")),{code:"permission-denied"});
    await assert.rejects(firestore.setDoc(owner.repo.deletionReference(),{requestedAt:firestore.serverTimestamp(),email:"unnecessary"}),{code:"permission-denied"});
    await assert.rejects(firestore.getDoc(firestore.doc(anonymous.db,"accountDeletions",uid)),{code:"permission-denied"});
  });
  await t.test("CV identity, timestamps and envelope are validated",async () => {
    const ref = owner.repo.reference(original.id);
    for (const invalid of [{ownerUid:other.auth.currentUser.uid},{createdAt:firestore.Timestamp.fromMillis(1)},{extra:"not allowed"},{title:""}]) {
      await assert.rejects(firestore.updateDoc(ref,{...invalid,updatedAt:firestore.serverTimestamp()}),{code:"permission-denied"});
    }
  });
  await t.test("an interrupted batch keeps Auth available and blocks writes from other sessions",async () => {
    for (let index=0;index<24;index++) await owner.repo.create(sample,`CV ${index}`);
    // Legacy documents without updatedAt must also be deleted; dashboard queries
    // ordered by updatedAt omit these, so seed one through the emulator admin API.
    await adminDocuments(`users/${uid}/cvs/legacy-without-date`,{method:"PATCH",body:JSON.stringify({fields:{title:{stringValue:"Legacy"}}})});
    let commits=0;
    owner.repo.sdk = {...firestore,writeBatch:db => {
      const batch=firestore.writeBatch(db);
      return {delete:ref=>batch.delete(ref),commit:async()=>{
        if (++commits===2) throw Object.assign(new Error("Simulated lost connection"),{code:"unavailable"});
        await batch.commit();
      }};
    }};
    await assert.rejects(owner.repo.deleteAccount(),{code:"unavailable"});
    assert.equal(owner.auth.currentUser.uid,uid);
    assert.equal(owner.repo.accountDeletionPending,true);
    assert.equal(owner.repo.isDeletingAccount,false);
    assert.equal((await adminDocuments(`users/${uid}/cvs`)).documents.length,6);
    for (const storage of [owner.repo.local,owner.repo.temporary]) {
      assert.equal(storage.length,2);
      assert.equal(storage.getItem(`cvapp:user:${uid}-other:draft:unrelated`),"keep");
      assert.equal(storage.getItem("cvapp:guest:documents:v2"),"keep guest");
    }
    assert.throws(()=>owner.repo.saveDraft(original),{code:"account/deleting"});
    await assert.rejects(owner.repo.create(sample),{code:"account/deleting"});
    // The second session has not received a client-side flag. Rules must block it.
    await assert.rejects(second.repo.create(sample,"Late write"),{code:"permission-denied"});
    const remaining = await firestore.getDocsFromServer(firestore.collection(second.db,"users",uid,"cvs"));
    const valid = remaining.docs.find(doc=>doc.id!=="legacy-without-date");
    await assert.rejects(second.repo.rename(valid.id,"Late rename"),{code:"permission-denied"});
    const marker=second.repo.deletionReference();
    await assert.rejects(firestore.updateDoc(marker,{requestedAt:firestore.serverTimestamp()}),{code:"permission-denied"});
    await assert.rejects(firestore.deleteDoc(marker),{code:"permission-denied"});
    assert.equal(await second.repo.getAccountDeletionStatus(),true);
    owner.repo.sdk=firestore;
  });
  await t.test("Auth failure can be retried after all CVs have been removed",async () => {
    second.repo.authSdk={...second.repo.authSdk,deleteUser:async()=>{throw Object.assign(new Error("Simulated Auth outage"),{code:"auth/network-request-failed"});}};
    await assert.rejects(second.repo.deleteAccount(),{code:"auth/network-request-failed"});
    assert.equal((await adminDocuments(`users/${uid}/cvs`)).documents?.length||0,0);
    assert.equal(second.auth.currentUser.uid,uid);
    assert.equal(second.repo.accountDeletionPending,true);
    second.repo.authSdk={...second.repo.authSdk,deleteUser:authSdk.deleteUser};
    await second.repo.deleteAccount();
    assert.equal(second.auth.currentUser,null);
    assert.equal((await adminDocuments(`users/${uid}/cvs`)).documents?.length||0,0);
    const marker = await adminDocuments(`accountDeletions/${uid}`);
    assert.deepEqual(Object.keys(marker.fields),["requestedAt"]);
    await assert.rejects(signInWithEmailAndPassword(second.auth,"delete-owner@example.test",password));
    assert.deepEqual((await other.repo.get(otherCv.id)).state,sample);
    assert.ok(other.auth.currentUser);
  });
  await t.test("a new registration has a new UID and can create CVs again",async () => {
    const fresh = await client("delete-fresh-registration","delete-owner@example.test");
    assert.notEqual(fresh.auth.currentUser.uid,uid);
    assert.equal(await fresh.repo.getAccountDeletionStatus(),false);
    assert.ok(await fresh.repo.create(sample,"Nueva cuenta"));
  });
});
