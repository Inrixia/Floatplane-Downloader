import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from "fs";
mkdirSync("./build", { recursive: true });
copyFileSync(process.execPath, "./build/float-win.exe");
writeFileSync("./dist/version", JSON.parse(readFileSync("./package.json")).version);
