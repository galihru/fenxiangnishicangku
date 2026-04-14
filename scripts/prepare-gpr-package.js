const fs = require("node:fs/promises");
const path = require("node:path");

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyIntoDist(rootDir, distDir, relativePath) {
  const sourcePath = path.join(rootDir, relativePath);
  if (!(await exists(sourcePath))) {
    return;
  }

  const destinationPath = path.join(distDir, relativePath);
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.cp(sourcePath, destinationPath, { recursive: true });
}

async function run() {
  const ownerInput = process.argv[2];
  if (!ownerInput) {
    throw new Error("GitHub owner is required. Usage: node scripts/prepare-gpr-package.js <owner>");
  }

  const owner = ownerInput.toLowerCase();
  const rootDir = process.cwd();
  const distDir = path.join(rootDir, ".gpr-pkg");
  const sourcePkgPath = path.join(rootDir, "package.json");

  const packageJson = JSON.parse(await fs.readFile(sourcePkgPath, "utf8"));
  const originalName = packageJson.name;

  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  const filesToCopy = new Set(packageJson.files || []);
  filesToCopy.add("README.md");
  filesToCopy.add("LICENSE");

  for (const file of filesToCopy) {
    await copyIntoDist(rootDir, distDir, file);
  }

  const gprPackageJson = {
    ...packageJson,
    name: `@${owner}/${originalName}`,
    publishConfig: {
      registry: "https://npm.pkg.github.com"
    }
  };

  await fs.writeFile(
    path.join(distDir, "package.json"),
    `${JSON.stringify(gprPackageJson, null, 2)}\n`,
    "utf8"
  );

  console.log(`Prepared GitHub Packages bundle: @${owner}/${originalName}`);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
