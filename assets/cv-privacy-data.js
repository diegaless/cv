// Export only the authenticated user's server records, including older CVs
// omitted by dashboard queries ordered by a missing updatedAt field.
export async function accountData(repository) {
  repository.assertOwner();
  if(repository.isGuest)throw new Error('Inicia sesión para descargar los datos de tu cuenta.');
  const snapshot=await repository.sdk.getDocsFromServer(repository.sdk.collection(repository.db,'users',repository.user.uid,'cvs'));
  repository.assertOwner();
  const marker=await repository.sdk.getDocFromServer(repository.deletionReference());
  repository.assertOwner();
  const user=repository.user;
  const localCopies=[];
  for(const [location,storage] of [['local',repository.local],['session',repository.temporary]]) {
    for(let index=0;index<(storage?.length||0);index++) {
      const key=storage.key(index);
      if(!key?.startsWith(`${repository.scope}:`))continue;
      const value=storage.getItem(key);
      let data;try{data=JSON.parse(value);}catch{data=value;}
      localCopies.push({location,key:key.slice(repository.scope.length+1),data});
    }
  }
  return {
    format:'cv-account-data',version:1,exportedAt:new Date().toISOString(),
    account:{uid:user.uid,name:user.displayName||'',email:user.email||'',profilePhoto:user.photoURL||'',
      createdAt:user.metadata?.creationTime||null,lastSignInAt:user.metadata?.lastSignInTime||null,
      providers:(user.providerData||[]).map(provider=>provider.providerId)},
    cvs:snapshot.docs.map(document=>({id:document.id,...document.data()})),
    localCopies,
    deletionRequest:marker.exists()?marker.data():null,
    scope:'Datos disponibles en la aplicación; no incluye registros internos o copias de seguridad de los proveedores ni borradores de otros navegadores.'
  };
}
