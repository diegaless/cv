import {build} from "esbuild";
import {readFile,writeFile} from "node:fs/promises";

for (const name of ["cv-docx", "cv-linebreak"]) {
  const outfile = `assets/vendor/${name}.js`;
  await build({entryPoints:[`assets/${name}.js`],bundle:true,format:"esm",minify:true,outfile,legalComments:"eof"});
  const code = await readFile(outfile,"utf8");
  const licenseStart = code.indexOf("\n/*! Bundled license information:");
  if (licenseStart >= 0) await writeFile(outfile,code.slice(0,licenseStart)+code.slice(licenseStart).replace(/[ \t]+$/gm,""));
}
