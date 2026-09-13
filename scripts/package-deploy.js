const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const STAGING_DIR = path.resolve(ROOT_DIR, ".deploy-temp");
const OUTPUT_ZIP = path.resolve(ROOT_DIR, "solvex-backend-deploy.zip");

console.log("📦 Starting Hostinger Deployment Packaging...\n");

// 1. Clean previous staging & zip
if (fs.existsSync(STAGING_DIR)) {
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });
}
if (fs.existsSync(OUTPUT_ZIP)) {
  fs.unlinkSync(OUTPUT_ZIP);
}
fs.mkdirSync(STAGING_DIR, { recursive: true });

// 2. Build TypeScript
console.log("1️⃣ Building TypeScript to dist/...");
execSync("npm run build", { cwd: ROOT_DIR, stdio: "inherit" });

// 3. Export Database SQL
console.log("\n2️⃣ Exporting latest MySQL Database to database_backup.sql...");
try {
  execSync("npx tsx src/scripts/export-db.ts", { cwd: ROOT_DIR, stdio: "inherit" });
} catch (e) {
  console.warn("⚠️ Warning: Database export skipped or failed (if local MySQL was offline). Keeping existing database_backup.sql if present.");
}

// 4. Files and folders to include in deployment package
const itemsToCopy = [
  "dist",
  "uploads",
  "package.json",
  "package-lock.json",
  "server.js",
  "app.js",
  "ecosystem.config.cjs",
  ".env.production.example",
  "database_backup.sql",
  "hostinger-nginx.conf",
  ".htaccess"
];

console.log("\n3️⃣ Copying deployment files to staging area...");
for (const item of itemsToCopy) {
  const srcPath = path.resolve(ROOT_DIR, item);
  const destPath = path.resolve(STAGING_DIR, item);

  if (fs.existsSync(srcPath)) {
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true });
      console.log(`  ✓ Copied directory: ${item}`);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`  ✓ Copied file: ${item}`);
    }
  } else {
    console.log(`  - Skipped (not found): ${item}`);
  }
}

// Also create a production .env placeholder if none
const envProdPath = path.resolve(STAGING_DIR, ".env");
if (!fs.existsSync(envProdPath) && fs.existsSync(path.resolve(ROOT_DIR, ".env.production.example"))) {
  fs.copyFileSync(path.resolve(ROOT_DIR, ".env.production.example"), envProdPath);
  console.log("  ✓ Created default .env from .env.production.example in package");
}

// 5. Create zip file using PowerShell Compress-Archive
console.log("\n4️⃣ Compressing into solvex-backend-deploy.zip...");
const psCommand = `powershell -Command "Compress-Archive -Path '${STAGING_DIR}\\*' -DestinationPath '${OUTPUT_ZIP}' -Force"`;
execSync(psCommand, { stdio: "inherit" });

// Clean staging directory
fs.rmSync(STAGING_DIR, { recursive: true, force: true });

const sizeInMB = (fs.statSync(OUTPUT_ZIP).size / (1024 * 1024)).toFixed(2);
console.log(`\n🎉 Deployment Package Ready!`);
console.log(`📦 File: ${OUTPUT_ZIP}`);
console.log(`📊 Size: ${sizeInMB} MB`);
console.log(`\nNext Steps:`);
console.log(`1. Upload 'solvex-backend-deploy.zip' to Hostinger File Manager.`);
console.log(`2. Extract it.`);
console.log(`3. Configure .env with your Hostinger MySQL DB details.`);
console.log(`4. Import 'database_backup.sql' in Hostinger phpMyAdmin.`);
console.log(`5. In Hostinger Node.js panel, click 'NPM Install' and start the app!`);
