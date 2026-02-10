// Copyright (C) 2019-2025 Provable Inc.
// This file is part of the Provable SDK library.

// The Provable SDK library is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// The Provable SDK library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with the Provable SDK library. If not, see <https://www.gnu.org/licenses/>.

use super::*;
use crate::types::native::parameters;

#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct Metadata {
    #[wasm_bindgen(getter_with_clone)]
    pub name: String,

    #[wasm_bindgen(getter_with_clone)]
    pub locator: String,

    #[wasm_bindgen(getter_with_clone)]
    pub prover: String,

    #[wasm_bindgen(getter_with_clone)]
    pub verifier: String,

    #[wasm_bindgen(getter_with_clone, js_name = verifyingKey)]
    pub verifying_key: String,
}

impl Metadata {
    const BASE_URL: &'static str = crate::types::native::BASE_URL;

    fn new(name: &str, verifying_key: &str, locator: &str, prover: &'static str, verifier: &'static str) -> Self {
        fn url(function_name: &str, kind: &str, proving_key_metadata: &'static str) -> String {
            let metadata: serde_json::Value =
                serde_json::from_str(proving_key_metadata).expect("Metadata was not well-formatted");
            let checksum = metadata["prover_checksum"].as_str().expect("Failed to parse checksum").to_string();
            format!("{}.{}.{}", function_name, kind, checksum.get(0..7).unwrap())
        }

        Self {
            name: name.to_string(),
            locator: locator.to_string(),
            prover: format!("{}{}", Self::BASE_URL, url(name, "prover", prover)),
            verifier: url(name, "verifier", verifier),
            verifying_key: verifying_key.to_string(),
        }
    }
}

#[wasm_bindgen]
impl Metadata {
    #[wasm_bindgen(js_name = baseUrl)]
    pub fn base_url() -> String {
        Self::BASE_URL.to_string()
    }

    #[wasm_bindgen]
    pub fn bond_public() -> Metadata {
        Metadata::new(
            "bond_public",
            "bondPublicVerifier",
            "credits.aleo/bond_public",
            parameters::BondPublicProver::METADATA,
            parameters::BondPublicVerifier::METADATA,
        )
    }

    #[wasm_bindgen]
    pub fn bond_validator() -> Metadata {
        Metadata::new(
            "bond_validator",
            "bondValidatorVerifier",
            "credits.aleo/bond_validator",
            parameters::BondValidatorProver::METADATA,
            parameters::BondValidatorVerifier::METADATA,
        )
    }

    #[wasm_bindgen]
    pub fn claim_unbond_public() -> Metadata {
        Metadata::new(
            "claim_unbond_public",
            "claimUnbondPublicVerifier",
            "credits.aleo/claim_unbond_public",
            parameters::ClaimUnbondPublicProver::METADATA,
            parameters::ClaimUnbondPublicVerifier::METADATA,
        )
    }

    #[wasm_bindgen]
    pub fn fee_private() -> Metadata {
        Metadata::new(
            "fee_private",
            "feePrivateVerifier",
            "credits.aleo/fee_private",
            parameters::FeePrivateProver::METADATA,
            parameters::FeePrivateVerifier::METADATA,
        )
    }

    #[wasm_bindgen]
    pub fn fee_public() -> Metadata {
        Metadata::new(
            "fee_public",
            "feePublicVerifier",
            "credits.aleo/fee_public",
            parameters::FeePublicProver::METADATA,
            parameters::FeePublicVerifier::METADATA,
        )
    }

    #[wasm_bindgen]
    pub fn inclusion() -> Metadata {
        Metadata::new(
            "inclusion",
            "inclusionVerifier",
            "inclusion",
            parameters::InclusionProver::METADATA,
            parameters::InclusionVerifier::METADATA,
        )
    }

    #[wasm_bindgen]
    pub fn join() -> Metadata {
        Metadata::new(
            "join",
            "joinVerifier",
            "credits.aleo/join",
            parameters::JoinProver::METADATA,
            parameters::JoinVerifier::METADATA,
        )
    }

    #[wasm_bindgen]
    pub fn set_validator_state() -> Metadata {
        Metadata::new(
            "set_validator_state",
            "setValidatorStateVerifier",
            "credits.aleo/set_validator_state",
            parameters::SetValidatorStateProver::METADATA,
            parameters::SetValidatorStateVerifier::METADATA,
        )
    }

    #[wasm_bindgen]
    pub fn split() -> Metadata {
        Metadata::new(
            "split",
            "splitVerifier",
            "credits.aleo/split",
            parameters::SplitProver::METADATA,
            parameters::SplitVerifier::METADATA,
        )
    }

    #[wasm_bindgen]
    pub fn transfer_private() -> Metadata {
        Metadata::new(
            "transfer_private",
            "transferPrivateVerifier",
            "credits.aleo/transfer_private",
            parameters::TransferPrivateProver::METADATA,
            parameters::TransferPrivateVerifier::METADATA,
        )
    }

    #[wasm_bindgen]
    pub fn transfer_private_to_public() -> Metadata {
        Metadata::new(
            "transfer_private_to_public",
            "transferPrivateToPublicVerifier",
            "credits.aleo/transfer_private_to_public",
            parameters::TransferPrivateToPublicProver::METADATA,
            parameters::TransferPrivateToPublicVerifier::METADATA,
        )
    }

    #[wasm_bindgen]
    pub fn transfer_public() -> Metadata {
        Metadata::new(
            "transfer_public",
            "transferPublicVerifier",
            "credits.aleo/transfer_public",
            parameters::TransferPublicProver::METADATA,
            parameters::TransferPublicVerifier::METADATA,
        )
    }

    #[wasm_bindgen]
    pub fn transfer_public_as_signer() -> Metadata {
        Metadata::new(
            "transfer_public_as_signer",
            "transferPublicAsSignerVerifier",
            "credits.aleo/transfer_public_as_signer",
            parameters::TransferPublicAsSignerProver::METADATA,
            parameters::TransferPublicAsSignerVerifier::METADATA,
        )
    }

    #[wasm_bindgen]
    pub fn transfer_public_to_private() -> Metadata {
        Metadata::new(
            "transfer_public_to_private",
            "transferPublicToPrivateVerifier",
            "credits.aleo/transfer_public_to_private",
            parameters::TransferPublicToPrivateProver::METADATA,
            parameters::TransferPublicToPrivateVerifier::METADATA,
        )
    }

    #[wasm_bindgen]
    pub fn unbond_public() -> Metadata {
        Metadata::new(
            "unbond_public",
            "unbondPublicVerifier",
            "credits.aleo/unbond_public",
            parameters::UnbondPublicProver::METADATA,
            parameters::UnbondPublicVerifier::METADATA,
        )
    }
}
