import { mkdir, copyFile, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const file of ["index.html", "index.js", "index.css", "topic.html", "topic.js", "topic.css", "404.html", "shared.js", ".nojekyll"]) {
  await copyFile(file, `dist/${file}`);
}
await mkdir("dist/assets", { recursive: true });
await copyFile("assets/dot-share-banner.png", "dist/assets/dot-share-banner.png");
