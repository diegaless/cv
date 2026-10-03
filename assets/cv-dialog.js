// In-page dialogs work in both ordinary browsers and embedded previews.
export function askDialog({title, description = "", initialValue, confirmationText, confirmLabel = "Continuar", danger = false}) {
  return new Promise(resolve => {
    const dialog = document.createElement("dialog");
    const titleId = `dialog-${crypto.randomUUID()}`;
    dialog.className = "cv-dialog";
    dialog.setAttribute("aria-labelledby",titleId);
    dialog.innerHTML = `<form method="dialog"><h2></h2><p></p><label>Nombre del currículum<input maxlength="100" required autocomplete="off" /></label><div class="cv-dialog-actions"><button type="button" class="secondary-btn">Cancelar</button><button type="submit" value="accept" class="primary-btn"></button></div></form>`;
    const heading = dialog.querySelector("h2"); heading.id = titleId; heading.textContent = title;
    dialog.querySelector("p").textContent = description;
    dialog.querySelector("p").hidden = !description;
    const input = dialog.querySelector("input");
    const hasInput = initialValue !== undefined || Boolean(confirmationText);
    dialog.querySelector("label").hidden = !hasInput;
    input.disabled = !hasInput;
    input.value = initialValue || "";
    const confirm = dialog.querySelector('[type="submit"]');
    confirm.textContent = confirmLabel; confirm.classList.toggle("danger",danger);
    if (confirmationText) {
      dialog.querySelector("label").firstChild.textContent = `Escribe ${confirmationText} para confirmar`;
      input.value = "";
      input.spellcheck = false;
      confirm.disabled = true;
      const matches = () => input.value.trim().toUpperCase() === confirmationText.toUpperCase();
      input.addEventListener("input", () => {confirm.disabled = !matches();});
      dialog.querySelector("form").addEventListener("submit", event => {if (!matches()) event.preventDefault();});
    }
    const cancel = dialog.querySelector('[type="button"]');
    cancel.addEventListener("click",() => dialog.close("cancel"));
    dialog.addEventListener("click",event => {if(event.target === dialog) dialog.close("cancel");});
    dialog.addEventListener("close",() => {const result = dialog.returnValue === "accept" ? (hasInput && !confirmationText ? input.value.trim() : true) : null; dialog.remove(); resolve(result);},{once:true});
    document.body.append(dialog); dialog.showModal();
    if(hasInput) {input.focus();input.select();} else cancel.focus();
  });
}
