import * as esbuild from "esbuild";
import path from "path";
import glob from "tiny-glob";
import fs from "fs/promises";

import entry from "./entry.mjs";

const root = process.cwd();

const collectEntryPoints = async () => {
  const entryPoints = [];

  for (const devPoint of entry.buildPoints) {
    try {
      const tsFiles = await glob(`./src/${devPoint}/*.ts`); // Promise로 변환된 glob 사용

      for (const t of tsFiles) {
        console.log(devPoint);
        const obj = {
          in: path.resolve(root, t),
          out: `${devPoint}/bundle/bundle`,
        };
        entryPoints.push(obj);

        const dirPath = path.resolve(root, `./dist/${devPoint}/bundle`);
        try {
          const files = await fs.readdir(dirPath);

          // 모든 파일 삭제
          const deleteFilePromises = files.map((file) => fs.unlink(path.join(dirPath, file)));
          await Promise.all(deleteFilePromises);
        } catch (error) {
          // 디렉토리가 없을 경우 무시
          if (error.code !== "ENOENT") {
            console.error(`Error clearing directory ${dirPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error collecting files for ${devPoint}:`, error);
    }
  }

  return entryPoints;
};

const runBuild = async () => {
  try {
    const entryPoints = await collectEntryPoints();

    console.log(`-------------------------------------`);
    console.log(entryPoints);
    console.log(`-------------------------------------`);

    // 출력 디렉토리 설정
    const outDir = path.resolve(root, `./dist/`);

    // esbuild 설정
    await esbuild.build({
      bundle: true,
      minify: false,
      target: ["es2020"],
      external: ["*.png", "*.jpg", "*.svg", "*.woff", "*.woff2", "*.otf", "*.ttf", "*.webp"],
      entryPoints: entryPoints,
      outdir: outDir,
      splitting: false,
      format: "esm",
      define: {
        global: "window",
        "process.env.NODE_ENV": '"production"',
      },
      logLevel: "debug",
      drop: ["console", "debugger"],
    });

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
};

await runBuild();
