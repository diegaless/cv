// Returns a reason without any write unless every check has passed and apply is explicit.
export async function reviewDeletionMarker(document,{lookupAccount,hasCvs,removeMarker,apply=false,now=Date.now()}) {
  const requestedAt=Date.parse(document.fields?.requestedAt?.timestampValue||'');
  const uid=document.name?.split('/').at(-1);
  if(!uid||!/^projects\/[^/]+\/databases\/[^/]+\/documents\/accountDeletions\/[^/]+$/.test(document.name)||
    !Number.isFinite(requestedAt)||!Number.isFinite(Date.parse(document.updateTime||''))||
    Object.keys(document.fields||{}).some(key=>key!=='requestedAt'))return 'keptInvalidMarker';
  if(now-requestedAt<30*24*60*60*1000)return 'keptRecent';
  if(await lookupAccount(uid))return 'keptActiveAccount';
  if(await hasCvs(uid))return 'keptExistingCvs';
  if(!apply)return 'eligible';
  await removeMarker(document.name,document.updateTime);
  return 'removed';
}
