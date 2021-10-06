const fs = require("fs");
const path = require("path");

const dirs = {
  src: "./index.ts",
  docs: "./docs",
  dist: "../photon.wiki/",
};

const typedocCmd = `yarn run typedoc ${dirs.src}`;
console.log(typedocCmd);
require("child_process").execSync(typedocCmd);

for (const f of fs.readdirSync(dirs.dist)) {
  fs.rmSync(path.join(dirs.dist, f), {
    force: true,
    recursive: true,
    maxRetries: 4,
    retryDelay: 1000,
  });
}

for (const f of fs.readdirSync(dirs.docs)) {
  fs.cpSync(path.join(dirs.docs, f), path.join(dirs.dist, f), {
    dereference: true,
    errorOnExist: false,
    recursive: true,
    preserveTimestamps: true,
  });
}
