// Fictional data only; no CV from a user's account is bundled with these drafts.
export const draftSample = {
  data: {
    name: "María García López", title: "Desarrolladora de aplicaciones web",
    email: "maria@example.com", phone: "+34 600 000 000", city: "Madrid", country: "España",
    linkedin: "https://www.linkedin.com/in/ejemplo",
    summary: "Desarrolladora con seis años de experiencia en aplicaciones web, accesibilidad y diseño de servicios digitales. Combino el trabajo técnico con la coordinación de equipos y la mejora continua del producto. Me interesa crear herramientas claras, rápidas y fáciles de utilizar.",
    experience: [
      {date: "2023 - Actualidad", title: "Desarrolladora sénior, Estudio Digital", meta: "Madrid", text: "Coordinación del desarrollo de una plataforma de formación y de las entregas del equipo.", bullets: ["Reduje el tiempo de carga un 30 % mediante mejoras de rendimiento.", "Diseñé componentes accesibles compartidos por tres productos.", "Incorporé pruebas automáticas y documentación para facilitar el mantenimiento."], links: [{target:"bullet:1",label:"componentes accesibles",url:"https://example.com/proyecto"}]},
      {date: "2020 - 2023", title: "Desarrolladora web, Soluciones Abiertas", meta: "Valencia", text: "Desarrollo de aplicaciones para pequeñas empresas y servicios de atención al cliente.", bullets: ["Creé un portal utilizado por más de 200 profesionales.", "Colaboré con diseño y soporte para simplificar los formularios de registro."]},
    ],
    education: [
      {date:"2018 - 2020",title:"Desarrollo de Aplicaciones Web, Centro de formación",bullets:["Proyecto final de gestión de contenidos con matrícula de honor."]},
      {date:"2022",title:"Especialización en accesibilidad digital, Escuela de tecnología",bullets:[]},
    ],
    skills:["JavaScript", "HTML y CSS", "Accesibilidad", "Pruebas", "Diseño de interfaces", "Git", "Trabajo en equipo", "Documentación"],
    languages:["Español · nativo", "Inglés · B2"],
    awards:[{date:"2024",title:"Certificación de accesibilidad web",bullets:[]}],
    websites:["https://example.com/portfolio"],
  },
};

export function longDraftSample() {
  const sample=structuredClone(draftSample);
  sample.data.experience=Array.from({length:18},(_,i)=>({date:`${2000+i} - ${2001+i}`,title:`Experiencia ${i}`,bullets:Array.from({length:5},(_,j)=>`Desarrollé aplicaciones accesibles, mejoré su rendimiento y documenté los resultados. MARCADOR_${i}_${j}`)}));
  sample.data.experience[0].links=[{target:"bullet:0",label:"MARCADOR_0_0",url:"https://example.com/marker"}];
  return sample;
}

// Load our generated portrait only when a browser fixture needs a photo. Keep the
// default fixture photo-free so both forms of the layout are still exercised.
let portraitPromise;
export function samplePortrait() {
  return portraitPromise ??= (async () => {
    const response = await fetch(new URL('./sample-portrait-v1.png', import.meta.url));
    if (!response.ok) throw new Error('No se puede cargar el retrato ficticio de prueba.');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  })();
}

export async function photoDraftSample() {
  const sample = structuredClone(draftSample);
  sample.photoSrc = await samplePortrait();
  return sample;
}
