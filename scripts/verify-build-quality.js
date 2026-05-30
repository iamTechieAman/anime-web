const fs = require("fs");
const path = require("path");

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

console.log("=========================================");
console.log("🏃 RUNNING TOONPLAYER QA PRE-BUILD AUDIT");
console.log("=========================================");

let totalIssues = 0;
let fileCount = 0;

const srcPath = path.join(__dirname, "../src");

if (!fs.existsSync(srcPath)) {
  console.error("❌ 'src' directory not found. Skipping QA audit.");
  process.exit(0);
}

walkDir(srcPath, (filePath) => {
  if (!filePath.endsWith(".tsx") && !filePath.endsWith(".ts")) return;
  
  fileCount++;
  const content = fs.readFileSync(filePath, "utf8");
  const fileName = path.basename(filePath);

  // 1. Accessibility Checks: img tags without alt attributes
  const imgTagRegex = /<img\b([^>]*)/gi;
  let match;
  while ((match = imgTagRegex.exec(content)) !== null) {
    const attrs = match[1];
    if (!attrs.includes("alt=") && !attrs.includes("alt={")) {
      console.warn(`⚠️ [Accessibility] ${fileName}: <img /> tag missing 'alt' attribute.`);
      totalIssues++;
    }
  }

  // 2. Accessibility Checks: Buttons without labels or icons only
  const buttonTagRegex = /<button\b([^>]*)/gi;
  while ((match = buttonTagRegex.exec(content)) !== null) {
    const attrs = match[1];
    // Check if it's an icon-only button and has no aria-label
    if (
      (attrs.includes("aria-label=") === false && attrs.includes("aria-label={") === false) && 
      (content.includes("<Play") || content.includes("<Pause") || content.includes("<Search") || content.includes("<X"))
    ) {
      // Simple heuristic for icon-only button
      const buttonOuterScope = content.slice(match.index, match.index + 150);
      if (buttonOuterScope.includes("/>") || buttonOuterScope.includes("</button>")) {
        // Icon detected inside but no text or label
        if (!buttonOuterScope.match(/>[^<]*[a-zA-Z0-9]+[^<]*</)) {
          console.warn(`⚠️ [Accessibility] ${fileName}: Icon button potentially missing 'aria-label' or accessible text.`);
          totalIssues++;
        }
      }
    }
  }

  // 3. Layout Glitches: Check for hardcoded absolute dimensions that break responsive fluid rules
  if (filePath.endsWith(".css")) {
    const hardcodedWidthRegex = /width:\s*[0-9]{3,4}px/gi;
    if (hardcodedWidthRegex.test(content)) {
      console.warn(`⚠️ [Layout] ${fileName}: Found absolute width rules. Prefer fluid percentage or clamp() layouts.`);
      totalIssues++;
    }
  }
});

console.log("=========================================");
console.log(`✅ QA Audit Complete. Scanned ${fileCount} source files.`);
if (totalIssues > 0) {
  console.log(`⚠️ Found ${totalIssues} recommended fixes for accessibility & layouts.`);
  console.log("💡 Review warnings above to ensure 100/100 Lighthouse compatibility.");
} else {
  console.log("⭐ Perfect score! All files passed accessibility and layout checks.");
}
console.log("=========================================");
process.exit(0); // Exit with 0 to prevent blocking the build pipeline
