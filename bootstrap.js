const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

function hasRuntimeDependencies(actionDir) {
  const corePath = path.join(actionDir, "node_modules", "@actions", "core", "package.json");
  return fs.existsSync(corePath);
}

function installRuntimeDependencies(actionDir) {
  console.log("Installing action runtime dependencies...");
  execSync("npm ci --omit=dev", {
    cwd: actionDir,
    stdio: "inherit"
  });
}

function run() {
  const actionDir = __dirname;

  if (hasRuntimeDependencies(actionDir)) {
    console.log("Action runtime dependencies already available.");
    return;
  }

  installRuntimeDependencies(actionDir);
}

run();
