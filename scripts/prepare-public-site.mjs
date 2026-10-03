import {cp, mkdir, readdir, readFile, rm, stat} from 'node:fs/promises';
import {dirname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=resolve(root,'.public-site');
if(destination!==root+sep+'.public-site')throw new Error('Invalid publishing directory');
const files=['index.html','resumes.html','builder.html','account.html','privacidad.html','404.html',
 'cv.pdf','app/resumes/index.html','app/resumes/44230391/edit/index.html',
 'assets/media/diego-ayala-icon-v3.png','assets/media/avatar-placeholder.svg'];
// An incomplete legal draft is kept outside the publishing directory.
try{if((await stat(resolve(root,'aviso-legal.html'))).isFile())files.push('aviso-legal.html');}catch(error){if(error.code!=='ENOENT')throw error;}
for(const entry of await readdir(resolve(root,'assets'),{withFileTypes:true}))
 if(entry.isFile()&&/\.(js|css)$/.test(entry.name))files.push('assets/'+entry.name);
for(const folder of ['assets/fonts','assets/vendor','assets/media/template-previews'])
 for(const entry of await readdir(resolve(root,folder),{withFileTypes:true}))
  if(entry.isFile()&&entry.name!=='README.md')files.push(folder+'/'+entry.name);
for(const file of files){
 const path=resolve(root,file);
 if(!path.startsWith(root+sep)||!(await stat(path)).isFile())throw new Error('Invalid publishing input '+file);
}
await rm(destination,{recursive:true,force:true});await mkdir(destination,{recursive:true});
const manifest=[];
for(const file of files){
 const path=resolve(destination,file);await mkdir(dirname(path),{recursive:true});
 await cp(resolve(root,file),path);
 const bytes=await readFile(path);manifest.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
// No docs, test samples, development tools, CV databases or private compliance records.
await mkdir(resolve(root,'.tools/legal-completion'),{recursive:true});
await import('node:fs/promises').then(fs=>fs.writeFile(resolve(root,'.tools/legal-completion/publishing-manifest.json'),JSON.stringify(manifest,null,2)));
console.log(JSON.stringify({destination,files:manifest.length,bytes:manifest.reduce((sum,item)=>sum+item.bytes,0)}));
