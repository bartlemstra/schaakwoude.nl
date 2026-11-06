// Controleert of de Worker klein genoeg blijft voor het gratis Cloudflare-plan
// (3 MB na gzip). Draai na `pnpm build`.
import { execSync } from "node:child_process";

const LIMIET_KB = 3 * 1024;
const uit = execSync("npx wrangler deploy --dry-run --outdir .wrangler/dryrun", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const m = uit.match(/Total Upload: ([\d.]+) KiB \/ gzip: ([\d.]+) KiB/);
if (!m) {
	console.error("Kon de grootte niet bepalen:\n" + uit);
	process.exit(1);
}
const gzip = Number(m[2]);
console.log(`Worker: ${gzip.toFixed(0)} KiB gzip (limiet ${LIMIET_KB} KiB, nog ${(LIMIET_KB - gzip).toFixed(0)} KiB over)`);
if (gzip > LIMIET_KB) {
	console.error("Te groot voor het gratis Workers-plan.");
	process.exit(1);
}
