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
  if (f === ".git") {
    continue;
  }

  fs.rmSync(path.join(dirs.dist, f), {
    force: true,
    recursive: true,
    maxRetries: 4,
    retryDelay: 1000,
  });
}

for (const f of fs.readdirSync(dirs.docs)) {
  fs.cpSync(
    path.join(dirs.docs, f),
    path.join(dirs.dist, f === "README.md" ? "Home.md" : f),
    {
      dereference: true,
      errorOnExist: false,
      recursive: true,
      preserveTimestamps: true,
    }
  );
}

{
  const distDirs = [dirs.dist];
  let distDir = "";

  while ((distDir = distDirs.shift())) {
    if (distDir.endsWith(".git")) {
      continue;
    }

    for (const f of fs.readdirSync(distDir)) {
      const fStat = fs.statSync(path.join(distDir, f));

      if (fStat.isDirectory()) {
        distDirs.push(path.join(distDir, f));
      } else if (fStat.isFile()) {
        const md = fs.readFileSync(path.join(distDir, f)).toString();

        fs.writeFileSync(
          path.join(distDir, f === "README.md" ? "Home.md" : f),
          md.replace(/(?<=[\w\d]+)\.md(?=[\)#])/g, "")
        );
      }
    }
  }
}

const package = JSON.parse(fs.readFileSync("package.json").toString());

const now = new Date();
const utc = now.toUTCString();

fs.writeFileSync(
  path.join(dirs.dist, "_Footer.md"),
  `This documentation was automatically generated on ${utc} for Version \`${package.version}\`\n`
);
