import {normalizeState, compact} from "./cv-model.js";

const GUEST_KEY = "cvapp:guest:documents:v2";
let firebasePromise;
export async function loadFirebase() {
  if (!firebasePromise) firebasePromise = (async () => {
    const settings = window.CV_FIREBASE_CONFIG;
    if (!settings?.enabled || !settings.firebaseConfig?.projectId) throw new Error("El acceso con Google no está configurado. Puedes continuar como invitado.");
    const base = "https://www.gstatic.com/firebasejs/10.14.1";
    const [appSdk, authSdk, firestore] = await Promise.all([
      import(`${base}/firebase-app.js`), import(`${base}/firebase-auth.js`), import(`${base}/firebase-firestore.js`),
    ]);
    const app = appSdk.getApps()[0] || appSdk.initializeApp(settings.firebaseConfig);
    // Choose persistence before restoring the session. Migrating getAuth's default
    // IndexedDB store to localStorage on every page signs out other open tabs.
    const auth = authSdk.initializeAuth(app, {
      persistence: authSdk.browserLocalPersistence,
      popupRedirectResolver: authSdk.browserPopupRedirectResolver,
    });
    const user = await new Promise((resolve, reject) => {
      const unsubscribe = authSdk.onAuthStateChanged(auth, value => { unsubscribe(); resolve(value); }, reject);
    });
    return {auth, authSdk, firestore, db: firestore.getFirestore(app), user};
  })().catch(error => {firebasePromise = null; throw error;});
  return firebasePromise;
}

export async function signIn() {
  const services = await loadFirebase();
  const provider = new services.authSdk.GoogleAuthProvider();
  provider.setCustomParameters({prompt:"select_account"});
  const result = await services.authSdk.signInWithPopup(services.auth, provider);
  sessionStorage.removeItem("cv-builder-guest-mode");
  return {...services, user: result.user};
}

export function friendlyError(error) {
  const code = error?.code || "";
  if (code === "account/deleting") return "La eliminación de tu cuenta está en curso. Continúa desde Mi cuenta.";
  if (code.includes("user-mismatch")) return "Selecciona la misma cuenta de Google con la que has entrado en esta web.";
  if (code.includes("requires-recent-login")) return "Vuelve a verificar tu identidad con Google para terminar de eliminar la cuenta.";
  if (error?.name === "QuotaExceededError") return "El navegador no tiene espacio para guardar este CV. Descarga una copia antes de salir.";
  if (code.includes("popup-closed") || code.includes("cancelled-popup")) return "Has cerrado el acceso con Google. Puedes volver a intentarlo.";
  if (code.includes("popup-blocked")) return "Permite las ventanas emergentes de esta web y vuelve a entrar con Google.";
  if (code.includes("unauthorized-domain")) return "Este dominio todavía no está autorizado para entrar con Google.";
  if (code.includes("permission-denied")) return "No se pudo acceder a tus CVs. Vuelve a iniciar sesión y reintenta.";
  if (code.includes("unavailable") || code.includes("network")) return "No hay conexión con la nube. Revisa la conexión y vuelve a intentarlo.";
  return error?.message || "No se pudo completar la operación. Vuelve a intentarlo.";
}

export class CvRepository {
  constructor({user = null, auth = null, authSdk = null, db = null, firestore = null, local = globalThis.localStorage, temporary = globalThis.sessionStorage} = {}) {
    this.user = user; this.auth = auth; this.authSdk = authSdk; this.db = db; this.sdk = firestore;
    this.local = local; this.temporary = temporary;
    this.isGuest = !user;
    this.scope = user ? `cvapp:user:${user.uid}` : "cvapp:guest";
    this.accountDeletionPending = false;
    this.isDeletingAccount = false;
  }
  assertOwner() {
    if (!this.isGuest && this.auth?.currentUser?.uid !== this.user.uid) throw new Error("La sesión ha cambiado. Vuelve a abrir tus CVs.");
  }
  assertWritable() {
    this.assertOwner();
    if (this.accountDeletionPending) throw Object.assign(new Error("Account deletion pending"), {code:"account/deleting"});
  }
  storage() {return this.isGuest ? this.temporary : this.local;}
  guestDocuments() {
    let value = this.temporary.getItem(GUEST_KEY);
    if (!value) {
      // Keep old guest drafts available without assigning unscoped local data to an account.
      value = this.temporary.getItem("cv-builder-documents-v1-guest");
    }
    const parsed = value ? JSON.parse(value) : [];
    if (!Array.isArray(parsed)) throw new Error("No se puede leer el borrador. Conserva esta pestaña y exporta una copia antes de continuar.");
    return parsed.filter(record => record?.id && record.kind !== "cover-letter").map(record => this.normalize(record.id, record));
  }
  normalize(id, value) {
    const millis = timestamp => timestamp?.toMillis?.() || (typeof timestamp === "number" ? timestamp : Date.parse(timestamp || "") || 0);
    return {id, title: compact(value.title) || "Mi CV", state: normalizeState(value.state || value),
      updatedAt: millis(value.updatedAt), createdAt: millis(value.createdAt)};
  }
  reference(id) {
    this.assertOwner();
    if (typeof id !== "string" || !id || id.includes("/") || id.length > 200) throw new Error("El identificador del CV no es válido.");
    return this.sdk.doc(this.db, "users", this.user.uid, "cvs", id);
  }
  async get(id) {
    this.assertOwner();
    if (this.isGuest) return this.guestDocuments().find(record => record.id === id) || null;
    const result = await this.sdk.getDoc(this.reference(id));
    this.assertOwner();
    return result.exists() ? this.normalize(result.id, result.data()) : null;
  }
  watch(onChange, onError) {
    this.assertOwner();
    if (this.isGuest) {onChange(this.guestDocuments()); return () => {};}
    const ref = this.sdk.collection(this.db, "users", this.user.uid, "cvs");
    return this.sdk.onSnapshot(this.sdk.query(ref, this.sdk.orderBy("updatedAt", "desc")), snapshot => {
      try {this.assertOwner(); onChange(snapshot.docs.map(doc => this.normalize(doc.id, doc.data())));} catch (error) {onError(error);}
    }, onError);
  }
  async create(state = {}, title = "Mi CV") {
    const record = {id: crypto.randomUUID(), title, state: normalizeState(state), createdAt: 0, updatedAt: 0};
    return this.save(record, {create: true});
  }
  async save(record, {create = false} = {}) {
    this.assertWritable();
    const clean = {id: record.id, title: compact(record.title) || "Mi CV", state: normalizeState(record.state)};
    if (this.isGuest) {
      const records = this.guestDocuments();
      const index = records.findIndex(item => item.id === clean.id);
      const saved = {...clean, updatedAt: Date.now(), createdAt: record.createdAt || Date.now()};
      if (index < 0) records.unshift(saved); else records[index] = saved;
      this.temporary.setItem(GUEST_KEY, JSON.stringify(records));
      return saved;
    }
    const ref = this.reference(clean.id);
    const payload = {...clean.state, title: clean.title, ownerUid: this.user.uid, updatedAt: this.sdk.serverTimestamp()};
    if (create) payload.createdAt = this.sdk.serverTimestamp();
    if (new TextEncoder().encode(JSON.stringify(payload)).length > 900000) throw new Error("El CV es demasiado grande para guardarlo. Reduce la foto o el texto e inténtalo otra vez.");
    // Updates cannot recreate a CV removed on another device.
    if (create) await this.sdk.setDoc(ref, payload); else await this.sdk.updateDoc(ref, payload);
    const snapshot = await this.sdk.getDoc(ref);
    this.assertOwner();
    return this.normalize(snapshot.id, snapshot.data());
  }
  async remove(id) {
    this.assertOwner();
    if (this.isGuest) this.temporary.setItem(GUEST_KEY, JSON.stringify(this.guestDocuments().filter(record => record.id !== id)));
    else await this.sdk.deleteDoc(this.reference(id));
    this.clearDraft(id);
  }
  async rename(id, title) {
    this.assertWritable();
    if (this.isGuest) {
      const record = await this.get(id);
      if (!record) throw new Error("Este CV ya no está disponible.");
      return this.save({...record, title});
    }
    await this.sdk.updateDoc(this.reference(id), {title: compact(title) || "Mi CV", updatedAt: this.sdk.serverTimestamp()});
  }
  saveDraft(record) {
    this.assertWritable();
    this.storage().setItem(`${this.scope}:draft:${record.id}`, JSON.stringify({record, savedAt: Date.now()}));
  }
  readDraft(id) {
    this.assertOwner();
    const value = this.storage().getItem(`${this.scope}:draft:${id}`);
    if (!value) return null;
    const draft = JSON.parse(value);
    return draft?.record?.id === id ? draft : null;
  }
  clearDraft(id) {this.storage().removeItem(`${this.scope}:draft:${id}`);}
  clearAccountDrafts() {
    if (this.isGuest) return;
    for (const storage of [this.local, this.temporary]) {
      for (let index = storage.length - 1; index >= 0; index--) {
        const key = storage.key(index);
        if (key?.startsWith(`${this.scope}:`)) storage.removeItem(key);
      }
    }
  }
  deletionReference() {
    this.assertOwner();
    if (this.isGuest) throw new Error("El modo invitado no tiene una cuenta que eliminar.");
    return this.sdk.doc(this.db, "accountDeletions", this.user.uid);
  }
  async getAccountDeletionStatus() {
    const snapshot = await this.sdk.getDocFromServer(this.deletionReference());
    this.accountDeletionPending = snapshot.exists();
    return this.accountDeletionPending;
  }
  async deleteAccount(onProgress = () => {}) {
    this.assertOwner();
    if (this.isGuest || !this.authSdk) throw new Error("Inicia sesión para gestionar tu cuenta.");
    if (this.isDeletingAccount) throw new Error("La eliminación ya está en curso.");
    this.isDeletingAccount = true;
    try {
      onProgress("Verifica tu identidad en la ventana de Google.");
      const provider = new this.authSdk.GoogleAuthProvider();
      provider.setCustomParameters({prompt:"select_account",login_hint:this.user.email || ""});
      // No cloud or local data changes until the same user has reauthenticated.
      await this.authSdk.reauthenticateWithPopup(this.user, provider);
      this.assertOwner();
      const marker = this.deletionReference();
      await this.sdk.runTransaction(this.db, async transaction => {
        if (!(await transaction.get(marker)).exists()) transaction.set(marker, {requestedAt:this.sdk.serverTimestamp()});
      });
      this.accountDeletionPending = true;
      this.clearAccountDrafts();
      const collection = this.sdk.collection(this.db, "users", this.user.uid, "cvs");
      let removed = 0;
      onProgress("Eliminando tus currículums. Mantén esta pestaña abierta.");
      while (true) {
        this.assertOwner();
        // Server reads and an immutable marker prevent cached or concurrent CVs being left behind.
        const snapshot = await this.sdk.getDocsFromServer(this.sdk.query(collection, this.sdk.limit(20)));
        if (snapshot.empty) break;
        const batch = this.sdk.writeBatch(this.db);
        snapshot.docs.forEach(document => batch.delete(document.ref));
        await batch.commit();
        removed += snapshot.size;
        onProgress(`Eliminados ${removed} currículums. Terminando el borrado de la cuenta…`);
      }
      this.assertOwner();
      onProgress("Eliminando tu cuenta…");
      await this.authSdk.deleteUser(this.user);
    } finally {this.isDeletingAccount = false;}
  }
  url(page, id) {
    const params = new URLSearchParams();
    if (id) params.set("resumeId", id);
    if (this.isGuest) params.set("guest", "1");
    return `./${page}${params.size ? `?${params}` : ""}`;
  }
}

export async function openRepository({allowDeleting = false} = {}) {
  if (new URLSearchParams(location.search).get("guest") === "1") return new CvRepository();
  const services = await loadFirebase();
  const user = services.auth.currentUser;
  if (!user) {location.replace("./index.html"); return null;}
  const repository = new CvRepository({...services, user});
  const handleDeletion = pending => {
    repository.accountDeletionPending = pending;
    if (!pending) return;
    repository.clearAccountDrafts();
    window.dispatchEvent(new Event("cv-account-deleting"));
    if (!allowDeleting) location.replace("./account.html");
  };
  handleDeletion(await repository.getAccountDeletionStatus());
  if (repository.accountDeletionPending && !allowDeleting) return null;
  services.firestore.onSnapshot(repository.deletionReference(), snapshot => handleDeletion(snapshot.exists()), error => {
    if (services.auth.currentUser?.uid === user.uid) console.error(error);
  });
  services.authSdk.onAuthStateChanged(services.auth, current => {
    // The account page completes its own deletion confirmation/redirect.
    if (repository.isDeletingAccount) return;
    if (current?.uid !== user.uid) location.replace("./index.html");
  });
  return repository;
}

export async function signOut() {
  const {auth, authSdk} = await loadFirebase();
  await authSdk.signOut(auth);
  location.assign("./index.html");
}
