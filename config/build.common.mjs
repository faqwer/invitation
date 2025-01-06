import chokidar from "chokidar";
import fs from "fs/promises";
import path from "path";

// 파일 또는 디렉토리를 복사하는 함수 (파일이 변경된 경우에만 복사)
const copyFileOrDir = async (src, dest) => {
  try {
    const stats = await fs.lstat(src);

    if (stats.isDirectory()) {
      await fs.mkdir(dest, { recursive: true });
      const entries = await fs.readdir(src, { withFileTypes: true });

      for (const entry of entries) {
        await copyFileOrDir(path.join(src, entry.name), path.join(dest, entry.name));
      }
    } else {
      const destExists = await fs
        .lstat(dest)
        .then(() => true)
        .catch(() => false);

      // 파일 변경 여부 확인
      if (!destExists) {
        await fs.copyFile(src, dest);
        console.log(`File copied: ${src} -> ${dest}`);
      } else {
        const destStats = await fs.lstat(dest);
        if (stats.mtimeMs !== destStats.mtimeMs || stats.size !== destStats.size) {
          await fs.copyFile(src, dest);
          console.log(`File updated: ${src} -> ${dest}`);
        }
      }
    }
  } catch (error) {
    console.error(`Failed to copy ${src} to ${dest}:`, error);
  }
};

// 디렉토리 생성 유틸리티
const ensureDirExists = async (dir) => {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== "EEXIST") {
      console.error(`Failed to create directory ${dir}:`, error);
    }
  }
};

// 실시간 감지 및 동기화
const watchAndSync = async (src, destPattern, customPatterns) => {
  const baseDir = path.resolve("dist");

  // 와일드카드 처리 함수
  const resolveWildcardPaths = async (baseDir, pattern) => {
    const segments = pattern.split("/").filter(Boolean);
    let paths = [baseDir];

    for (const segment of segments) {
      if (segment === "*") {
        const nextPaths = [];
        for (const currentPath of paths) {
          const entries = await fs.readdir(currentPath, { withFileTypes: true });
          const filteredEntries = Array.isArray(customPatterns)
            ? entries.filter((entry) => entry.isDirectory() && customPatterns.includes(entry.name)) // customPatterns 배열에 포함된 디렉토리만 필터링
            : entries.filter((entry) => entry.isDirectory()); // 모든 디렉토리 포함
          nextPaths.push(...filteredEntries.map((dir) => path.join(currentPath, dir.name)));
        }
        paths = nextPaths;
      } else {
        paths = paths.map((currentPath) => path.join(currentPath, segment));
      }
    }
    return paths;
  };

  const resolvedPaths = await resolveWildcardPaths(baseDir, destPattern);

  resolvedPaths.forEach((dest) => {
    chokidar
      .watch(src, { ignoreInitial: false })
      .on("add", async (filePath) => {
        const relativePath = path.relative(src, filePath);
        const destPath = path.join(dest, relativePath);

        await ensureDirExists(path.dirname(destPath)); // 대상 디렉토리 생성
        await copyFileOrDir(filePath, destPath);
      })
      .on("change", async (filePath) => {
        const relativePath = path.relative(src, filePath);
        const destPath = path.join(dest, relativePath);

        await ensureDirExists(path.dirname(destPath)); // 대상 디렉토리 생성
        await copyFileOrDir(filePath, destPath);
      })
      .on("unlink", async (filePath) => {
        const relativePath = path.relative(src, filePath);
        const destPath = path.join(dest, relativePath);

        try {
          await fs.unlink(destPath);
          console.log(`File removed: ${destPath}`);
        } catch (error) {
          console.error(`Failed to remove file ${destPath}:`, error);
        }
      })
      .on("unlinkDir", async (dirPath) => {
        const relativePath = path.relative(src, dirPath);
        const destPath = path.join(dest, relativePath);

        try {
          await fs.rm(destPath, { recursive: true, force: true });
          console.log(`Directory removed: ${destPath}`);
        } catch (error) {
          console.error(`Failed to remove directory ${destPath}:`, error);
        }
      })
      .on("error", (error) => {
        console.error(`Watcher error:`, error);
      });
  });
};

// 실행 함수
const run = async () => {
  try {
    console.log("Watching and syncing files...");

    await Promise.all([
      watchAndSync("src/common/audio", "*/*/common/audio"),
      watchAndSync("src/common/fonts", "*/*/common/fonts"),
      watchAndSync("src/common/images", "*/*/common/images"),
      // watchAndSync("src/common/images/common", "*/*/common/images/common"),
      // watchAndSync("src/common/images/video", "*/*/common/images/video", ["02_ABC_Song", "04_Chant"]),
      watchAndSync("src/common/cc", "*/*/common/cc"),
    ]);

    console.log("File watching started. Press Ctrl+C to exit.");
  } catch (error) {
    console.error("Error occurred:", error);
    process.exit(1);
  }
};

run();
