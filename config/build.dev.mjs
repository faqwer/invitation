import * as esbuild from "esbuild";
import path from "path";
import glob from "tiny-glob";

import entry from "./entry.mjs";

const root = process.cwd();

const runBuild = async () => {
  try {
    const tsFiles = await glob(`./src/${entry.devPoint}/*.ts`);

    console.log(`-------------------------------------`);
    console.log(entry.devPoint);

    // `entry.in`은 입력 파일의 상대 경로, `entry.out`은 출력 디렉토리라고 가정
    let entryPoints = [];
    tsFiles.forEach((t) => {
      let obj = {
        in: path.resolve(root, t),
        out: `/bundle/bundle`,
      };
      entryPoints.push(obj);
    });
    console.log(entryPoints);

    const outDir = path.resolve(root, `./dist/${entry.devPoint}`);
    console.log(`-------------------------------------`);

    let config = {
      bundle: true,
      target: ["es2020"],
      loader: {
        // ".js": "jsx",
        // ".svg": "dataurl",
        // ".png": "dataurl",
        // ".jpg": "dataurl",
      },
      external: ["*.png", "*.jpg", "*.svg", "*.woff", "*.woff2", "*.otf", "*.ttf", "*.webp"],

      entryPoints: entryPoints,
      outdir: outDir,
      sourcemap: true,
      define: {
        global: "window",
        "process.env.NODE_ENV": '"development"',
      },
      // plugins: [
      //   postCssPlugin({
      //     postcss: {
      //       plugins: [tailwindcss, autoprefixer],
      //     },
      //   }),
      // ],
      logLevel: "debug",
    };

    let ctx = await esbuild.context(config);
    await ctx.watch();
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
};

await runBuild();
