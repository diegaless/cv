import {normalizeState} from "../assets/cv-model.js";

export const sample = normalizeState({data:{
  name:"María García López", title:"Desarrolladora web", email:"maria@example.com", phone:"+34 600 000 000",
  postalCode:"28001", city:"Madrid", country:"España", linkedin:"linkedin.com/in/ejemplo",
  summary:"Desarrolladora con experiencia en aplicaciones accesibles.\nTrabajo en equipos de producto.",
  skills:["JavaScript", "Accesibilidad web"], languages:["Español · nativo", "Inglés · B2"], websites:["https://example.com/portfolio"],
  experience:[{date:"2022 - Actualidad", title:"Desarrolladora, Empresa de ejemplo", meta:"Madrid", bullets:["Creé una plataforma para 200 usuarios.", "Reduje el tiempo de carga un 30 %."]}],
  education:[{date:"2020 - 2022", title:"Desarrollo de Aplicaciones Web, Centro de ejemplo", bullets:["Proyecto final con matrícula de honor."]}],
  awards:[{date:"2024", title:"Certificación de accesibilidad", bullets:[]}],
}});

export class MemoryStorage {
  #values = new Map();
  get length() {return this.#values.size;}
  key(index) {return [...this.#values.keys()][index] ?? null;}
  getItem(key) {return this.#values.get(key) ?? null;}
  setItem(key,value) {this.#values.set(key,String(value));}
  removeItem(key) {this.#values.delete(key);}
}
