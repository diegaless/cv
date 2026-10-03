import {loadFirebase, signIn, friendlyError} from "./cv-store.js?v=20260927-account";

const button = document.getElementById("google-login");
const status = document.getElementById("auth-status");
const showError = error => {status.textContent = friendlyError(error); status.classList.add("is-error"); button.disabled = false;};
button.addEventListener("click", async () => {
  button.disabled = true;
  status.classList.remove("is-error");
  status.textContent = "Abriendo Google…";
  try {await signIn(); location.assign("./resumes.html");} catch (error) {showError(error);}
});
try {
  const {auth} = await loadFirebase();
  if (auth.currentUser) {sessionStorage.removeItem("cv-builder-guest-mode"); location.replace("./resumes.html");}
  else {button.disabled = false; status.textContent = new URLSearchParams(location.search).get("account") === "deleted" ? "Tu cuenta y tus currículums se han eliminado." : "Entra con Google para guardar tus CVs en tu cuenta.";}
} catch (error) {showError(error);}
