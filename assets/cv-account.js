import {openRepository, signOut, friendlyError} from "./cv-store.js?v=20260927-account";
import {askDialog} from "./cv-dialog.js?v=20260927-account";
import {accountData} from "./cv-privacy-data.js?v=20261003-legal";
import {downloadBlob} from "./cv-model.js";

const errorEl = document.getElementById("account-error");
const deleteButton = document.getElementById("delete-account");
const logoutButton = document.getElementById("account-sign-out");
const exportButton = document.getElementById("export-account-data");
const clearDraftButton = document.getElementById("clear-account-drafts");
const dataStatus = document.getElementById("account-data-status");
const progress = document.getElementById("deletion-progress");
let repository;
let busy = false;
function reportError(error) {console.error(error); errorEl.textContent = friendlyError(error); errorEl.hidden = false;}
function renderPending() {
  const pending = repository?.accountDeletionPending;
  document.getElementById("deletion-pending").hidden = !pending;
  document.getElementById("account-back").hidden = pending;
  deleteButton.textContent = pending ? "Completar eliminación" : "Eliminar mi cuenta";
}
function setBusy(value) {
  busy = value;
  deleteButton.disabled = value;
  logoutButton.disabled = value;
  exportButton.disabled = value;
  clearDraftButton.disabled = value;
  document.querySelector(".account-page-header").inert = value;
}
window.addEventListener("cv-account-deleting", renderPending);
window.addEventListener("beforeunload", event => {
  if (busy) {event.preventDefault(); event.returnValue = "";}
});
exportButton.addEventListener('click',async()=>{
  if(busy||!repository)return;
  setBusy(true);errorEl.hidden=true;dataStatus.textContent='Preparando tus datos…';
  try{
    const data=await accountData(repository);
    downloadBlob('mis-datos-cv.json',new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    dataStatus.textContent='Copia descargada. Guárdala en un lugar privado: contiene tus CVs y fotos.';
  }catch(error){dataStatus.textContent='';reportError(error);}finally{setBusy(false);}
});
clearDraftButton.addEventListener('click',async()=>{
  if(busy||!repository)return;
  const accepted=await askDialog({title:'¿Borrar los borradores de este navegador?',description:'Se retirarán las copias pendientes de guardar de esta cuenta en este navegador. Los CVs ya guardados en tu cuenta seguirán disponibles.',confirmLabel:'Borrar borradores',danger:true});
  if(!accepted)return;
  try{
    repository.assertOwner();repository.clearAccountDrafts();
    dataStatus.textContent='Borradores de esta cuenta retirados de este navegador.';
  }catch(error){reportError(error);}
});
logoutButton.addEventListener("click", async () => {
  if (busy) return;
  setBusy(true);
  try {busy = false; await signOut();} catch (error) {reportError(error); setBusy(false);}
});
deleteButton.addEventListener("click", async () => {
  if (busy || !repository) return;
  errorEl.hidden = true;
  const accepted = await askDialog({
    title:repository.accountDeletionPending ? "Completar eliminación" : "¿Eliminar tu cuenta?",
    description:"Se borrarán definitivamente tu cuenta en esta web y todos tus CVs. Tu cuenta de Google seguirá existiendo. Después de confirmar, Google verificará que eres tú.",
    confirmationText:"ELIMINAR", confirmLabel:"Verificar con Google y eliminar", danger:true,
  });
  if (!accepted) return;
  setBusy(true);
  try {
    await repository.deleteAccount(message => {progress.textContent = message;});
    busy = false;
    location.replace("./index.html?account=deleted");
  } catch (error) {
    reportError(error);
    progress.textContent = repository.accountDeletionPending ? "El borrado no ha terminado. Pulsa «Completar eliminación» para reintentarlo." : "Puedes volver a intentarlo desde aquí.";
    renderPending(); setBusy(false);
  }
});
try {
  repository = await openRepository({allowDeleting:true});
  if (repository?.isGuest) location.replace("./index.html");
  else if (repository) {
    const name = repository.user.displayName || "Tu cuenta";
    document.getElementById("profile-name").textContent = name;
    document.getElementById("profile-initial").textContent = name[0].toUpperCase();
    document.getElementById("profile-email").textContent = repository.user.email || "Sin email";
    document.getElementById("account-loading").hidden = true;
    document.getElementById("account-settings").hidden = false;
    renderPending();
  }
} catch (error) {document.getElementById("account-loading").hidden = true; reportError(error);}
