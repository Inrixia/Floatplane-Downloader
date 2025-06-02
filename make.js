import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "fs";
mkdirSync("./build", { recursive: true });
const binPath = process.argv[2];
if (binPath === undefined) throw new Error("No bin path provided");
copyFileSync(process.execPath, binPath);
writeFileSync("./build/version", JSON.parse(readFileSync("./package.json")).version);
