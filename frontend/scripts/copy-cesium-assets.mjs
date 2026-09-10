import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const cesiumBuild = join(projectRoot, "node_modules", "cesium", "Build", "Cesium");
const publicCesium = join(projectRoot, "public", "cesium");

await rm(publicCesium, { force: true, recursive: true });
await mkdir(publicCesium, { recursive: true });

await Promise.all(
  ["Assets", "ThirdParty", "Workers", "Widgets"].map((folder) =>
    cp(join(cesiumBuild, folder), join(publicCesium, folder), { recursive: true }),
  ),
);

await cp(join(cesiumBuild, "Cesium.js"), join(publicCesium, "Cesium.js"));

console.log("Copied Cesium static assets to public/cesium");
