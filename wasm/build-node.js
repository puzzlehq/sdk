import * as $fs from "node:fs/promises";
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
        },
        plugins: [

            rust({
                extraArgs: {
                    cargo: [
                        "--no-default-features",
                        "--features", `serial,${network}`,
                    ],
                    wasmOpt: ["-O", "--enable-bulk-memory", "--enable-bulk-memory-opt"],
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
    });
}


async function buildJS(network) {
    const js = `import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import initWasm from "./aleo_wasm.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const wasmPath = join(__dirname, 'aleo_wasm.wasm');
const wasmBuffer = await readFile(wasmPath);

const {
    initThreadPool: wasmInitThreadPool,
    Address,
    BHP256,
    Execution,
    ExecutionResponse,
    Field,
    Metadata,
    OfflineQuery,
    Plaintext,
    PrivateKey,
    PrivateKeyCiphertext,
    Program,
    ProvingKey,
    RecordCiphertext,
    RecordPlaintext,
    ProgramManager,
    Signature,
    Transaction,
    ViewKey,
    VerifyingKey,
    verifyFunctionExecution,
    generateRecordViewKey,
    decryptRecordWithRVk,
} = await initWasm(wasmBuffer);

async function initThreadPool(threads) {
    if (threads == null) {
        const { cpus } = await import('node:os');
        threads = cpus().length;
    }

    console.info(\`Spawning \${threads} threads\`);

    const { Worker } = await import('node:worker_threads');
    await wasmInitThreadPool((_, options) => new Worker("./worker.js", options), threads);
}

export {
    initThreadPool,
    Address,
    BHP256,
    Execution,
    ExecutionResponse,
    Field,
    Metadata,
    OfflineQuery,
    Plaintext,
    PrivateKey,
    PrivateKeyCiphertext,
    Program,
    ProvingKey,
    RecordCiphertext,
    RecordPlaintext,
    ProgramManager,
    Signature,
    Transaction,
    ViewKey,
    VerifyingKey,
    verifyFunctionExecution,
};`;

    await $fs.writeFile(`dist/${network}/index.js`, js);
}


async function buildWorker(network) {
    const worker = `import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import initWasm from "./aleo_wasm.js";
import { parentPort } from 'node:worker_threads';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function initializeWorker(initWasm) {
    const wasmPath = join(__dirname, 'aleo_wasm.wasm');
    const wasmBuffer = await readFile(wasmPath);

    // Use Node.js worker thread messaging
    parentPort.once('message', async (data) => {
        const wasm = await initWasm(wasmBuffer);
        const { module, memory, address } = data;

        const exports = await wasm({
            initializeHook: (init) => init(module, memory),
        });

        parentPort.postMessage(null);
        exports.runRayonThread(address);
    });
}

await initializeWorker(initWasm);`;

    await $fs.writeFile(`dist/${network}/worker.js`, worker);
}


async function buildTypes(network) {
    const js = `/**
 * Initializes a thread pool of Workers. This enables multi-threading, which significantly improves performance.
 *
 * @param {number | undefined} threads  Number of threads to spawn. If not specified, uses the number of available cores.
 */
export function initThreadPool(threads?: number): Promise<void>;

export {
    Address,
    BHP256,
    Execution,
    ExecutionResponse,
    Field,
    Metadata,
    OfflineQuery,
    Plaintext,
    PrivateKey,
    PrivateKeyCiphertext,
    Program,
    ProvingKey,
    RecordCiphertext,
    RecordPlaintext,
    ProgramManager,
    Signature,
    Transaction,
    ViewKey,
    VerifyingKey,
    verifyFunctionExecution,
    generateRecordViewKey,
    decryptRecordWithRVk,
} from "./aleo_wasm";`;

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
}


const networks = [
    "testnet",
    "mainnet",
];

await Promise.all(networks.map(build));