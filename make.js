import { execSync } from "child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { platform } from "os";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

const binPath = platform() === "win32" ? ".\\build\\float.exe" : ".\\build\\float";

// Clean build directory
rmSync("./build", { recursive: true, force: true });
rmSync("./dist", { recursive: true, force: true });

// Bundle the code
run("npx esbuild ./src/float.ts --bundle --minify --tree-shaking=true --platform=node --outfile=./dist/float.cjs");

// Test bundle
run(`node ./dist/float.cjs --sanityCheck`);

// Copy node binary and version file
mkdirSync("./build", { recursive: true });
copyFileSync(process.execPath, binPath);
writeFileSync("./build/version", JSON.parse(readFileSync("./package.json")).version);

// Create the blob
run("node --experimental-sea-config ./sea-config.json");

// Inject the blob
run(`npx postject ${binPath} NODE_SEA_BLOB ./dist/float.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA`);

// Clean up version directory
run("rimraf ./build/version");

// Test binary
run(`${binPath} --sanityCheck`);
