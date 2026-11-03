// Builds the extension into dist/, and with --zip, packages it as a zip.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const dist = `${root}dist`;
const manifest = JSON.parse(readFileSync(`${root}src/manifest.json`, "utf8"));
const pkg = JSON.parse(readFileSync(`${root}package.json`, "utf8"));
if (manifest.version !== pkg.version) {
  throw new Error(`manifest version ${manifest.version} doesn't match package.json ${pkg.version}`);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

await build({
  entryPoints: ["content", "autoplay", "popup", "options", "background"].map((name) => `${root}src/${name}.ts`),
  outdir: dist,
  bundle: true,
  format: "iife",
  target: "chrome110",
  minify: false,
  logLevel: "warning",
});

for (const file of ["manifest.json", "content.css", "ui.css", "popup.html", "options.html"]) {
  cpSync(`${root}src/${file}`, `${dist}/${file}`);
}
cpSync(`${root}icons`, `${dist}/icons`, { recursive: true });

if (process.argv.includes("--zip")) {
  const zip = `${root}focus-for-youtube-${pkg.version}.zip`;
  rmSync(zip, { force: true });
  execFileSync("zip", ["-qr", zip, "."], { cwd: dist });
  console.log(`Packaged ${zip}`);
} else {
  console.log(`Built ${dist}`);
}
