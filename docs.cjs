const fs = require("fs");
const path = require("path");

const dirs = {
  src: "./src",
  docs: "./docs",
};

const typedocCmd = `yarn run typedoc ${dirs.src}`;
console.log(typedocCmd);
require("child_process").execSync(typedocCmd);

const docDirs = new Array(dirs.docs);

while (docDirs.length > 0) {
  console.debug(docDirs);
  const docDirs = docDirs.shift();
  for (const doc of fs.readdirSync(docPath)) {
    const docPath = path.join(docPath, doc);
    const stat = fs.lstatSync(docPath);
    if (stat.isDirectory()) {
      processDocs(docPath);
    } else {
      console.debug(docPath);
    }
  }
}
