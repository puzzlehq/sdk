[![Authors](https://img.shields.io/badge/authors-Aleo-orange.svg)](https://provable.com)
[![License](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE.md)

[![github]](https://github.com/ProvableHQ/sdk)

[github]: https://img.shields.io/badge/github-8da0cb?style=for-the-badge&labelColor=555555&logo=github
[crates-io]: https://img.shields.io/badge/crates.io-fc8d62?style=for-the-badge&labelColor=555555&logo=rust
[docs-rs]: https://img.shields.io/badge/docs.rs-66c2a5?style=for-the-badge&labelColor=555555&logo=docs.rs

# Aleo Wasm

Aleo JavaScript and WebAssembly bindings for building zero-knowledge web applications.

`Rust` compiles easily to `WebAssembly`, but creating the glue code necessary to use compiled WebAssembly binaries
from other languages such as JavaScript is a challenging task. `wasm-bindgen` is a tool that simplifies this process by
auto-generating JavaScript bindings to Rust code that has been compiled into WebAssembly.

This crate uses `wasm-bindgen` to create JavaScript bindings to Aleo source code so that it can be used to create zero-knowledge proofs directly within web browsers and `Node.js`.

Functionality exposed by this crate includes:
* Aleo account management objects
* Aleo primitives such as `Records`, `Programs`, and `Transactions` and their associated helper methods
* A `ProgramManager` object that contains methods for authoring, deploying, and interacting with Aleo programs

More information on these concepts can be found at the [Aleo Developer Hub](https://docs.leo-lang.org/concepts).

## Usage

The [rollup-plugin-rust](https://github.com/wasm-tool/rollup-plugin-rust/) tool is used to compile the Rust code in this crate into JavaScript
modules which can be imported into other JavaScript projects.

#### Installation

Follow the [installation instructions](https://github.com/wasm-tool/rollup-plugin-rust/#installation) on the rollup-plugin-rust README.

### Build Instructions

```bash
yarn build
```

This will produce `.js` and `.wasm` files inside of the `dist` folder.

## Testing

Run tests in Node.js
```bash
wasm-pack test --node
```

Run tests in a browser
```bash
wasm-pack test --[firefox/chrome/safari]
```

## Building Web Apps

Further documentation and tutorials as to how to use the modules built from this crate to build web apps will be built
in the future. However, in the meantime, the [provable.tools](https://provable.tools) website is a good
example of how to use these modules to build a web app. Its source code can be found in the
[Provable SDK](https://github.com/ProvableHQ/sdk) repo in the `website` folder.

## Update 7/28/25 (abhin):

Got the wasm working with running `npm run build --features "serial"`
Then the following error was surfacing when spinning up jigsaw

```
> jigsaw@0.5.0 start /Users/asharma/code/medici/firenze/apps/jigsaw
> node dist/server.js

node:internal/deps/undici/undici:11457
    Error.captureStackTrace(err, this);
          ^

TypeError: fetch failed
    at Object.fetch (node:internal/deps/undici/undici:11457:11)
    at async __wbg_init (file:///Users/asharma/code/medici/sdk/wasm/dist/testnet/index.js:9904:51)
    at async file:///Users/asharma/code/medici/sdk/wasm/dist/testnet/index.js:9911:21 {
  cause: Error: not implemented... yet...
      at makeNetworkError (node:internal/deps/undici/undici:6802:35)
      at schemeFetch (node:internal/deps/undici/undici:10912:18)
      at node:internal/deps/undici/undici:10792:26
      at mainFetch (node:internal/deps/undici/undici:10809:11)
      at fetching (node:internal/deps/undici/undici:10766:7)
      at fetch2 (node:internal/deps/undici/undici:10644:20)
      at Object.fetch (node:internal/deps/undici/undici:11455:18)
      at fetch (node:internal/process/pre_execution:234:25)
      at __wbg_init (file:///Users/asharma/code/medici/sdk/wasm/dist/testnet/index.js:9899:26)
      at file:///Users/asharma/code/medici/sdk/wasm/dist/testnet/index.js:9911:27 {
    [cause]: undefined
  }
}

Node.js v19.9.0
 ELIFECYCLE  Command failed with exit code 1.
 ELIFECYCLE  Command failed with exit code 1.
```

The fix (likely due to older version of node) we should be on node 22+ but for timing constraints we needed to quickly get this back up. The following was the fix:


Add the following to the top of `wasm/dist/testnet/index.js`

```
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
```

Additionally, add this to the `__wbg_init` function in `wasm/dist/testnet/index.js`

```
if (typeof module_or_path === 'string') {
        // Absolute or relative file path in Node.js
        const buffer = await readFile(module_or_path);
        module_or_path = await WebAssembly.compile(buffer);
    } else if (module_or_path instanceof URL && module_or_path.protocol === 'file:') {
        // file:// URL in Node.js
        const filePath = fileURLToPath(module_or_path);
        const buffer = await readFile(filePath);
        module_or_path = await WebAssembly.compile(buffer);
    } else if (typeof Request === 'function' && module_or_path instanceof Request) {
        module_or_path = fetch(module_or_path);
    } else if (typeof URL === 'function' && module_or_path instanceof URL) {
        module_or_path = fetch(module_or_path);
    }
```