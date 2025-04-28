// Copyright (C) 2019-2023 Aleo Systems Inc.
// This file is part of the Aleo SDK library.

// The Aleo SDK library is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// The Aleo SDK library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with the Aleo SDK library. If not, see <https://www.gnu.org/licenses/>.

use crate::{Field, from_js_typed_array, types::native::BHP256Native};
use snarkvm_console::algorithms::Hash;

use js_sys::Array;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct BHP256(BHP256Native);

#[wasm_bindgen]
impl BHP256 {
    /// Create a BHP hasher with an input size of 256 bits.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self(BHP256Native::setup("AleoBHP256").expect("Failed to set up BHP256"))
    }

    /// Create a BHP hasher with an input size of 256 bits with a custom domain separator.
    pub fn setup(domain_separator: &str) -> Result<Self, String> {
        BHP256Native::setup(domain_separator)
            .map(|native| Self(native))
            .map_err(|e| format!("Failed to set up BHP256 with domain separator {}: {}", domain_separator, e))
    }

    /// Returns the BHP hash with an input hasher of 256 bits.
    pub fn hash(&self, input: Array) -> Result<Field, String> {
        let input = from_js_typed_array!(input, as_bool, "boolean")?;
        self.0.hash(&input).map(|field| Field::from(field)).map_err(|e| e.to_string())
    }
}
