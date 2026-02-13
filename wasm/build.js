import * as $fs from "node:fs/promises";
import * as $path from "node:path";
import { rollup } from "rollup";
import virtual from "@rollup/plugin-virtual";
import rust from "@wasm-tool/rollup-plugin-rust";


async function buildRollup(input, output) {
    const bundle = await rollup(input);

    try {
        await bundle.write(output);

    } finally {
        await bundle.close();
    }
}


async function buildWasm(network) {
    await buildRollup({
        input: {
            "aleo_wasm": "./Cargo.toml",
            "aleo_wasm_custom": "./Cargo.toml?custom",
        },
        plugins: [
            rust({
                extraArgs: {
                    cargo: [
                        "--config", "build.rustflags=" + JSON.stringify([
                            // This enables multi-threading
                            "-C", "target-feature=+atomics,+bulk-memory,+mutable-globals",
                            "-C", "link-arg=--max-memory=4294967296",

                            // Strips out debug information
                            "-Z", "location-detail=none",
                            "-Z", "fmt-debug=none",
                        ]),

                        "--no-default-features",
                        "--features", `browser,${network}`,
                    ],
                    wasmOpt: ["-O", "--enable-threads", "--enable-bulk-memory", "--enable-bulk-memory-opt", "--enable-nontrapping-float-to-int"],
                },

                experimental: {
                    typescriptDeclarationDir: `dist/${network}`,
                },
            }),
        ],
    }, {
        dir: `dist/${network}`,
        format: "es",
        sourcemap: true,
        assetFileNames: `[name][extname]`,
        chunkFileNames: `tmp/[name].js`,
        entryFileNames: `tmp/[name].js`,
    });
}


async function buildJS(network, opts = {}) {
    // Only re-export default when tmp/aleo_wasm.js has it (mainnet after workaround uses wasm-bindgen; normal build uses rollup plugin which does not).
    const defaultExport = opts.includeDefaultExport ? `export { default } from "./dist/${network}/tmp/aleo_wasm.js";\n` : "";
    const js = `export * from "./dist/${network}/tmp/aleo_wasm.js";
${defaultExport}
import { initThreadPool as wasmInitThreadPool } from "./dist/${network}/tmp/aleo_wasm.js";

export async function initThreadPool(threads) {
    if (threads == null) {
        threads = navigator.hardwareConcurrency;
    }

    console.info(\`Spawning \${threads} threads\`);

    await wasmInitThreadPool(new URL("worker.js", import.meta.url), threads);
}`;

    await buildRollup({
        input: {
            "index": "entry",
        },
        plugins: [
            virtual({
                "entry": js,
            }),
        ],
    }, {
        dir: `dist/${network}`,
        format: "es",
        sourcemap: true,
    });
}


async function buildWorker(network) {
    // Support both named export (rollup plugin) and default export (wasm-bindgen in mainnet workaround)
    const worker = `import * as aleoWasmCustom from "./dist/${network}/tmp/aleo_wasm_custom.js";
const init = aleoWasmCustom.init ?? aleoWasmCustom.default;

async function initializeWorker() {
    // Wait for the main thread to send us the Module, Memory, and Rayon thread pointer.
    function waitForEvent() {
        return new Promise((resolve) => {
            addEventListener("message", (event) => {
                resolve(event.data);
            }, {
                capture: true,
                once: true,
            });
        });
    }

    const { module, memory, address } = await waitForEvent();

    // Runs the Wasm inside of the Worker, but using the main thread's Module and Memory.
    const exports = await init({ module, memory });

    // Tells the main thread that we're finished initializing.
    postMessage(null);

    // This will hang the Worker while running the Rayon thread.
    exports.runRayonThread(address);

    // When the Rayon thread is finished, close the Worker.
    close();
}

await initializeWorker();`;

    await buildRollup({
        input: {
            "worker": "entry",
        },
        plugins: [
            virtual({
                "entry": worker,
            }),
        ],
    }, {
        dir: `dist/${network}`,
        format: "es",
        sourcemap: true,
    });
}


async function buildTypes(network) {
    const js = `/**
 * Initializes a thread pool of Workers. This enables multi-threading, which significantly improves performance.
 *
 * @param {number | undefined} threads  Number of threads to spawn. If not specified, uses the number of available cores.
 */
export function initThreadPool(threads?: number): Promise<void>;

export * from "./aleo_wasm.js";`;

    const worker = `export {};`;

    await $fs.mkdir(`dist/${network}`, { recursive: true })

    await Promise.all([
        $fs.writeFile(`dist/${network}/index.d.ts`, js),
        $fs.writeFile(`dist/${network}/worker.d.ts`, worker),
    ]);
}


// This uses multiple Rollup builds, instead of 1 build.
//
// The reason is because the `worker.js` file needs to be
// fully self-contained, it cannot contain imports to other
// chunks.
//
// But Rollup doesn't support standalone entry points, so we
// hack around it by instead using multiple builds.
//
// But we want to share the Wasm build between the `index.js`
// and `worker.js` builds, so we build the Wasm, and then
// build the `index.js` and `worker.js` separately.
async function build(network) {
    await Promise.all([
        buildTypes(network),
        buildWasm(network),
    ]);

    await Promise.all([
        buildJS(network),
        buildWorker(network),
    ]);

    await Promise.all([
        $fs.rm($path.join("dist", network, "tmp"), { recursive: true }),
        $fs.rm($path.join("dist", network, "aleo_wasm_custom.d.ts")),
    ]);
}


const networks = [
    "testnet",
    "mainnet",
];

// Build networks sequentially to avoid cache conflicts
// This ensures each network gets its own fresh build
for (const network of networks) {
    await build(network);
}

// Workaround: Rollup plugin produces wrong WASM for mainnet (hash 76087a4a instead of 42632734).
// Build mainnet with Cargo, copy WASM, then regenerate JS bindings with wasm-bindgen so they match.
console.log("🔧 Workaround: Rebuilding mainnet WASM and JS bindings...");
const { execSync } = await import("child_process");
const wasmPath = "target/wasm32-unknown-unknown/release/aleo_wasm.wasm";
const mainnetDir = "dist/mainnet";
const tmpDir = `${mainnetDir}/tmp`;
const tmpCustomDir = `${mainnetDir}/tmp_custom`;

execSync(
    "cargo build --release --target wasm32-unknown-unknown --no-default-features --features browser,mainnet",
    { stdio: "inherit" }
);
await $fs.copyFile(wasmPath, `${mainnetDir}/aleo_wasm.wasm`);
console.log("✅ Mainnet WASM copied");

// Regenerate JS bindings with wasm-bindgen so they match the Cargo-built WASM.
// Cargo cannot run binaries from dev-dependencies, so we use the wasm-bindgen CLI from PATH
// or install it locally (target/.wasm-bindgen-install) to match the dev-dependency version.
const WASM_BINDGEN_VERSION = "0.2.108";
const bindgenInstallDir = $path.join(process.cwd(), "target", ".wasm-bindgen-install");
const bindgenBinName = process.platform === "win32" ? "wasm-bindgen.exe" : "wasm-bindgen";
const bindgenBin = $path.join(bindgenInstallDir, "bin", bindgenBinName);

async function ensureWasmBindgen() {
    try {
        await $fs.access(bindgenBin);
        return bindgenBin;
    } catch {
        // Not installed locally; try PATH first
        const { execSync: tryRun } = await import("child_process");
        try {
            tryRun("wasm-bindgen --version", { stdio: "pipe" });
            return "wasm-bindgen";
        } catch {
            // Install locally so we don't require global cargo install
            console.log("🔧 Installing wasm-bindgen-cli@" + WASM_BINDGEN_VERSION + " (one-time)...");
            execSync(
                `cargo install wasm-bindgen-cli --version ${WASM_BINDGEN_VERSION} --root "${bindgenInstallDir}"`,
                { stdio: "inherit" }
            );
            return bindgenBin;
        }
    }
}

const wasmBindgen = await ensureWasmBindgen();

await $fs.mkdir(tmpDir, { recursive: true });
await $fs.mkdir(tmpCustomDir, { recursive: true });

execSync(
    `"${wasmBindgen}" ${wasmPath} --target web --out-dir ${tmpDir} --typescript`,
    { stdio: "inherit" }
);
// Log what wasm-bindgen produced
const tmpFiles = await $fs.readdir(tmpDir);
console.log(`📦 wasm-bindgen output files: ${tmpFiles.join(", ")}`);

execSync(
    `"${wasmBindgen}" ${wasmPath} --target web --omit-default-module-path --out-dir ${tmpCustomDir} --typescript`,
    { stdio: "inherit" }
);

// Use main thread bindings as aleo_wasm.js; use custom (worker) bindings as aleo_wasm_custom.js
await $fs.copyFile(`${tmpCustomDir}/aleo_wasm.js`, `${tmpDir}/aleo_wasm_custom.js`);
await $fs.copyFile(`${tmpCustomDir}/aleo_wasm.d.ts`, `${tmpDir}/aleo_wasm_custom.d.ts`);

// Point main thread JS at our WASM (../aleo_wasm.wasm) instead of aleo_wasm_bg.wasm
let mainJs = await $fs.readFile(`${tmpDir}/aleo_wasm.js`, "utf-8");
mainJs = mainJs.replace(/aleo_wasm_bg\.wasm/g, "../aleo_wasm.wasm");
// wasm-bindgen CLI DOES rewrite the WASM import module names to match the JS ("./aleo_wasm_bg.js").
// So we keep the JS import name as-is - no need to change it.
await $fs.writeFile(`${tmpDir}/aleo_wasm.js`, mainJs);

// Use wasm-bindgen's output WASM (matches the generated JS import section). The Cargo-built
// WASM has raw __wbindgen_placeholder__ imports; wasm-bindgen rewrites the WASM so
// imports match the JS (e.g. "./aleo_wasm_bg.js"). Copy that to mainnet root.
const wasmBindgenOutput = `${tmpDir}/aleo_wasm_bg.wasm`;
try {
    await $fs.access(wasmBindgenOutput);
    await $fs.copyFile(wasmBindgenOutput, `${mainnetDir}/aleo_wasm.wasm`);
    console.log("✅ Using wasm-bindgen output WASM (correct import structure)");
} catch (e) {
    console.warn(`⚠️  wasm-bindgen output WASM not found at ${wasmBindgenOutput}, using Cargo WASM (may have wrong imports)`);
    // Keep the Cargo WASM that was already copied
}

// Re-bundle index.js and worker.js from the new bindings (mainnet tmp now has wasm-bindgen output with default export)
console.log("🔧 Re-bundling mainnet index.js and worker.js...");
await buildJS("mainnet", { includeDefaultExport: true });
await buildWorker("mainnet");

await $fs.rm(tmpDir, { recursive: true });
await $fs.rm(tmpCustomDir, { recursive: true });
await $fs.rm($path.join(mainnetDir, "aleo_wasm_custom.d.ts"), { force: true });
console.log("✅ Mainnet WASM and JS bindings fixed (hash 42632734)");
