import esbuild from "esbuild";
import sveltePlugin from "esbuild-svelte";
import sveltePreprocess from "svelte-preprocess";
import fs from "node:fs/promises";
import path from "node:path";

const TEST_VAULT = path.join("test-vault", ".obsidian", "plugins", "better-word-count");
const args = process.argv.slice(2);
const WATCH_FLAG = args.includes("--watch");
const PROD_FLAG = args.includes("--prod") || process.env.NODE_ENV === "production";

const copyTargets = [
  { src: "src/styles.css", dest: path.join(TEST_VAULT, "styles.css") },
  { src: "dist/main.js", dest: path.join(TEST_VAULT, "main.js") },
  { src: "manifest.json", dest: path.join(TEST_VAULT, "manifest.json") },
];

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function copyAssets() {
  await Promise.all(
    copyTargets.map(async ({ src, dest }) => {
      await ensureDir(dest);
      await fs.copyFile(src, dest);
    })
  );
}

const externalDependencies = [
  "obsidian",
  "electron",
  "codemirror",
  "@codemirror/autocomplete",
  "@codemirror/closebrackets",
  "@codemirror/collab",
  "@codemirror/commands",
  "@codemirror/comment",
  "@codemirror/fold",
  "@codemirror/gutter",
  "@codemirror/highlight",
  "@codemirror/history",
  "@codemirror/language",
  "@codemirror/lint",
  "@codemirror/matchbrackets",
  "@codemirror/panel",
  "@codemirror/rangeset",
  "@codemirror/rectangular-selection",
  "@codemirror/search",
  "@codemirror/state",
  "@codemirror/stream-parser",
  "@codemirror/text",
  "@codemirror/tooltip",
  "@codemirror/view",
  "@lezer/common",
  "@lezer/lr",
];

const prod = PROD_FLAG;

const buildOptions = {
  entryPoints: ["src/main.ts"],
  outfile: "dist/main.js",
  bundle: true,
  format: "cjs",
  platform: "node",
  sourcemap: prod ? false : "inline",
  minify: prod,
  logLevel: "info",
  external: externalDependencies,
  plugins: [
    sveltePlugin({
      compilerOptions: {
        css: true,
      },
      preprocess: sveltePreprocess(),
    }),
  ],
};

async function runBuild() {
  if (WATCH_FLAG) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.rebuild();
    await copyAssets();
    console.log("Watching for changes...");
    await ctx.watch({
      async onRebuild(error) {
        if (error) {
          console.error("Rebuild failed:", error);
          return;
        }
        console.log("Rebuild succeeded. Copying built assets...");
        await copyAssets();
      },
    });
    return;
  }

  const result = await esbuild.build(buildOptions);
  await copyAssets();
  return result;
}

runBuild().catch((error) => {
  console.error(error);
  process.exit(1);
});
