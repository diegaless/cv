import {openRepository, friendlyError} from "./cv-store.js?v=20260927-account";
import {escapeHtml as esc, progress, fileName, resumeText, downloadBlob} from "./cv-model.js";
import {askDialog} from "./cv-dialog.js?v=20260927-account";
import {renderThumbnail, fitThumbnail} from "./cv-thumbnail.js";

const list = document.getElementById("resume-list");
const errorEl = document.getElementById("dashboard-error");
const createButtons = [document.getElementById("create-resume-button"), document.getElementById("create-resume-card")];
const accountButton = document.getElementById("account-action");
let repository;
let records = [];
let busy = false;
let loaded = false;
const thumbnailObserver = new ResizeObserver(entries => entries.forEach(({target}) => fitThumbnail(target)));
function reportError(error) {console.error(error); errorEl.hidden = false; errorEl.textContent = friendlyError(error);}
function setBusy(value) {
  busy = value;
  createButtons.forEach(button => button.disabled = value);
  list.querySelectorAll("button").forEach(button => button.disabled = value);
}
function dateLabel(value) {
  return value ? `Actualizado el ${new Intl.DateTimeFormat("es-ES", {dateStyle:"medium", timeStyle:"short"}).format(value)}` : "Nuevo currículum";
}
function render() {
  thumbnailObserver.disconnect();
  list.innerHTML = records.length ? records.map(record => {
    const data = record.state.data;
    return `<article class="dashboard-resume-card" data-resume-id="${esc(record.id)}">
      <div class="resume-card-preview">
        <div class="cv-thumbnail" aria-hidden="true" inert><div class="cv-preview-pages cv-thumbnail-pages"></div></div>
        <a class="resume-thumbnail-open" href="${esc(repository.url("builder.html", record.id))}" aria-label="Abrir ${esc(record.title)}"></a>
      </div>
      <div class="resume-card-content"><a class="resume-card-main" href="${esc(repository.url("builder.html", record.id))}" aria-label="Editar ${esc(record.title)}"><span class="resume-card-details"><strong>${esc(record.title)}</strong><small>${esc(dateLabel(record.updatedAt))}</small><span class="resume-score"><b>${progress(data).percent}%</b><span>Datos completados</span></span></span></a>
      <div class="resume-card-actions">
        <a href="${esc(repository.url("builder.html", record.id))}#print">↓ Descargar PDF</a>
        <button type="button" data-action="docx">↓ Descargar Word</button>
        <button type="button" data-action="txt">↓ Exportar TXT</button>
        <button type="button" data-action="duplicate">⧉ Duplicar</button>
        <button type="button" data-action="rename">Renombrar</button>
        <button type="button" data-action="delete" class="danger">Eliminar</button>
      </div></div>
    </article>`;
  }).join("") : '<div class="dashboard-empty"><strong>Tu próximo CV empieza aquí</strong><p>Crea el primero y guarda una versión para cada oportunidad.</p></div>';
  list.querySelectorAll(".cv-thumbnail-pages").forEach((preview, index) => {
    thumbnailObserver.observe(preview);
    renderThumbnail(preview, records[index].state).catch(reportError);
  });
}
async function refreshGuest() {if (repository.isGuest) {records = repository.guestDocuments(); render();}}
createButtons.forEach(button => button.addEventListener("click", async () => {
  if (!repository || busy) return;
  setBusy(true); errorEl.hidden = true;
  try {const record = await repository.create(); location.assign(repository.url("builder.html", record.id));}
  catch (error) {reportError(error); setBusy(false);}
}));
list.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");
  if (!button || busy || !repository) return;
  const record = records.find(item => item.id === button.closest("[data-resume-id]")?.dataset.resumeId);
  if (!record) return;
  setBusy(true); errorEl.hidden = true;
  try {
    if (button.dataset.action === "duplicate") await repository.create(record.state, `${record.title} · copia`);
    if (button.dataset.action === "rename") {const title = await askDialog({title:"Renombrar currículum",initialValue:record.title,confirmLabel:"Guardar nombre"}); if (title) await repository.rename(record.id, title);}
    if (button.dataset.action === "delete" && await askDialog({title:"Eliminar currículum",description:`¿Eliminar «${record.title}»? Esta acción no se puede deshacer.`,confirmLabel:"Eliminar CV",danger:true})) await repository.remove(record.id);
    if (button.dataset.action === "txt") downloadBlob(`${fileName(record)}.txt`, new Blob([resumeText(record.state)], {type:"text/plain;charset=utf-8"}));
    if (button.dataset.action === "docx") {const {createDocx} = await import("./vendor/cv-docx.js"); downloadBlob(`${fileName(record)}.docx`, await createDocx(record.state));}
    await refreshGuest();
  } catch (error) {reportError(error);} finally {setBusy(false);}
});
accountButton.addEventListener("click", () => location.assign(repository?.isGuest ? "./index.html" : "./account.html"));
try {
  repository = await openRepository();
  if (repository) {
    document.querySelectorAll("[data-home-link]").forEach(link => link.href = repository.url("resumes.html"));
    const name = repository.user?.displayName || repository.user?.email || "Invitado";
    document.getElementById("account-name").textContent = name;
    document.getElementById("account-initial").textContent = name[0].toUpperCase();
    document.getElementById("account-detail").textContent = repository.isGuest ? "Sin iniciar sesión" : repository.user.email || "Cuenta de Google";
    document.getElementById("account-status").textContent = repository.isGuest ? "Modo invitado · Descarga tu CV antes de cerrar esta pestaña." : "Tus CVs se guardan en tu cuenta";
    accountButton.textContent = repository.isGuest ? "Entrar con Google" : "Mi cuenta";
    document.getElementById("account-profile-link").href = repository.isGuest ? "./index.html" : "./account.html";
    document.getElementById("account-profile-link").setAttribute("aria-label", repository.isGuest ? "Entrar con Google" : "Mi cuenta");
    accountButton.disabled = false;
    repository.watch(values => {
      records = values; render();
      if (!loaded) {loaded = true; setBusy(false);} else setBusy(busy);
    }, error => {list.innerHTML = ""; reportError(error);});
  }
} catch (error) {reportError(error); list.innerHTML = '<p><a href="./index.html">Volver al acceso</a></p>';}
