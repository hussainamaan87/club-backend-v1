const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "src");
const OUTPUT_DIR = path.join(__dirname, "combined");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

/* ================= READ FILES ================= */

function readFilesRecursively(dir) {
  let results = [];

  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results = results.concat(readFilesRecursively(filePath));
    } else {
      results.push(filePath);
    }
  });

  return results;
}

/* ================= COMBINE ONE FOLDER ================= */

function combineFolder(folderPath) {
  const files = readFilesRecursively(folderPath);

  if (files.length === 0) return; // skip empty folders

  let output = "";

  files.forEach((file) => {
    const relativePath = path.relative(folderPath, file);
    const content = fs.readFileSync(file, "utf-8");

    output += `\n\n==============================\n`;
    output += `FILE: ${relativePath}\n`;
    output += `==============================\n\n`;
    output += content;
  });

  // 🔥 unique name based on full path
  const folderName = path
    .relative(ROOT_DIR, folderPath)
    .replace(/[\/\\]/g, "-") || "src";

  const outputFile = path.join(OUTPUT_DIR, `combined-${folderName}.txt`);

  fs.writeFileSync(outputFile, output);

  console.log(`✅ Created: combined-${folderName}.txt`);
}

/* ================= WALK ALL FOLDERS ================= */

function walkAndCombine(dir) {
  combineFolder(dir); // combine THIS folder

  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);

    if (fs.statSync(filePath).isDirectory()) {
      walkAndCombine(filePath); // 🔥 recursive folder combine
    }
  });
}

/* ================= MAIN ================= */

function run() {
  walkAndCombine(ROOT_DIR);
}

run();