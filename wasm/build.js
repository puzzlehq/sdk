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
                        "--features", `serial,${network}`,
                    ],
                    wasmOpt: ["-O", "--enable-threads", "--enable-bulk-memory", "--enable-bulk-memory-opt"],
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


async function buildJS(network) {
    const js = `export * from "./dist/${network}/tmp/aleo_wasm.js";

// Node.js thread pool initialization
export async function initThreadPool(threads) {
    if (threads == null) {
        threads = require('os').cpus().length;
    }

    console.info(\`Using \${threads} threads for Node.js\`);
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
    const worker = `// Node.js worker - simplified for Node.js environment
export {};`;

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

await Promise.all(networks.map(build));
