// بيعمل نسخة من طقطقة في ملف HTML واحد (الخطوط والستايل والكود جوّاه)،
// عشان تتفتح من غير سيرفر أو تتنشر في مكان بياخد ملف واحد بس.
// الاستخدام: node tools/build-single.js out.html
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const out = process.argv[2] || path.join(root, "taqtaqa-single.html");

let css = read("assets/app.css").replace(/url\(\.\.\/fonts\/([\w.-]+\.woff2)\)/g, (m, f) =>
  `url(data:font/woff2;base64,${fs.readFileSync(path.join(root, "fonts", f)).toString("base64")})`);
let html = read("index.html")
  .replace(/<link rel="preload" href="fonts\/[^"]+" as="font"[^>]*>\n?/g, "")
  .replace('<link rel="stylesheet" href="assets/app.css">', () => `<style>\n${css}</style>`)
  .replace('<script src="assets/data.js"></script>', () => `<script>\n${read("assets/data.js")}</script>`)
  .replace('<script src="assets/app.js"></script>', () => `<script>\n${read("assets/app.js")}</script>`)
  // الحسابات بتشتغل على taqtaqa.com بس
  .replace('<script type="module" src="cloud.js"></script>\n', "");
for (const ref of ["assets/app.css", "assets/data.js", "assets/app.js", "fonts/"]) {
  if (html.includes(ref)) throw new Error("لسه فيه رابط لـ " + ref);
}
fs.writeFileSync(out, html);
console.log(out, (html.length / 1024).toFixed(0) + "KB");
