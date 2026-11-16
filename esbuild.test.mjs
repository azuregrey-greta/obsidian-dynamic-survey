/* 测试打包脚本：单元测试（node）、产物冒烟（node）、浏览器测试台（browser）。 */
import esbuild from "esbuild";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";

mkdirSync("test/out", { recursive: true });
mkdirSync("test/shipped/node_modules/obsidian", { recursive: true });

// 1) Node 单元测试（源码 + 桩）
await esbuild.build({
  entryPoints: ["test/unit.ts"],
  bundle: true, platform: "node", format: "cjs", target: "node18",
  alias: { obsidian: "./test/obsidian-stub.ts" },
  outfile: "test/out/unit.cjs", logLevel: "warning",
});
await esbuild.build({
  entryPoints: ["test/collection.unit.ts"],
  bundle: true, platform: "node", format: "cjs", target: "node18",
  alias: { obsidian: "./test/obsidian-stub.ts" },
  outfile: "test/out/collection.cjs", logLevel: "warning",
});

// 2) 浏览器测试台（源码 + 桩，IIFE）
await esbuild.build({
  entryPoints: ["test/browser-main.ts"],
  bundle: true, platform: "browser", format: "iife", target: "es2018",
  alias: { obsidian: "./test/obsidian-stub.ts" },
  outfile: "test/out/browser-bundle.js", logLevel: "warning",
});

// 3) 产物冒烟：真实 main.js + CJS 版桩（模拟 Obsidian 运行时）
await esbuild.build({
  entryPoints: ["test/obsidian-stub.ts"],
  bundle: true, platform: "node", format: "cjs", target: "node18",
  outfile: "test/shipped/node_modules/obsidian/index.js", logLevel: "warning",
});
writeFileSync("test/shipped/node_modules/obsidian/package.json", JSON.stringify({ name: "obsidian", version: "0.0.0-test", main: "index.js" }));
copyFileSync("main.js", "test/shipped/main.js");

console.log("test bundles ready");
