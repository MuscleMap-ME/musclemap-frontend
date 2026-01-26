//! Merkle Tree Implementation
//!
//! Provides cryptographic verification of ledger integrity.

use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};

/// Merkle tree for ledger verification
#[derive(Debug, Clone)]
pub struct MerkleTree {
    /// All leaf hashes
    leaves: Vec<String>,
    /// Tree levels (bottom to top)
    levels: Vec<Vec<String>>,
}

/// A node in the Merkle tree
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MerkleNode {
    pub hash: String,
    pub left: Option<Box<MerkleNode>>,
    pub right: Option<Box<MerkleNode>>,
}

/// Proof of inclusion in Merkle tree
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MerkleProof {
    /// The leaf hash being proved
    pub leaf_hash: String,
    /// Sibling hashes from leaf to root
    pub path: Vec<ProofStep>,
    /// Root hash at time of proof
    pub root: String,
}

/// A step in the Merkle proof path
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProofStep {
    /// Sibling hash
    pub hash: String,
    /// Whether sibling is on the left
    pub is_left: bool,
}

impl MerkleTree {
    /// Create empty Merkle tree
    pub fn new() -> Self {
        Self {
            leaves: Vec::new(),
            levels: Vec::new(),
        }
    }

    /// Add a leaf hash
    pub fn add_leaf(&mut self, hash: &str) {
        self.leaves.push(hash.to_string());
        self.rebuild();
    }

    /// Add multiple leaves
    pub fn add_leaves(&mut self, hashes: &[String]) {
        self.leaves.extend(hashes.iter().cloned());
        self.rebuild();
    }

    /// Get the root hash
    pub fn root(&self) -> String {
        if self.levels.is_empty() {
            return String::new();
        }

        self.levels.last()
            .and_then(|level| level.first())
            .cloned()
            .unwrap_or_default()
    }

    /// Get tree height
    pub fn height(&self) -> usize {
        self.levels.len()
    }

    /// Get number of leaves
    pub fn leaf_count(&self) -> usize {
        self.leaves.len()
    }

    /// Generate proof of inclusion for a leaf
    pub fn generate_proof(&self, leaf_hash: &str) -> Option<MerkleProof> {
        // Find leaf index
        let leaf_index = self.leaves.iter().position(|h| h == leaf_hash)?;

        let mut path = Vec::new();
        let mut index = leaf_index;

        // Walk up the tree
        for level in &self.levels[..self.levels.len().saturating_sub(1)] {
            let sibling_index = if index % 2 == 0 { index + 1 } else { index - 1 };

            if sibling_index < level.len() {
                path.push(ProofStep {
                    hash: level[sibling_index].clone(),
                    is_left: index % 2 == 1,
                });
            }

            index /= 2;
        }

        Some(MerkleProof {
            leaf_hash: leaf_hash.to_string(),
            path,
            root: self.root(),
        })
    }

    /// Verify a proof of inclusion
    pub fn verify_proof(&self, proof: &MerkleProof) -> bool {
        // Verify proof leads to current root
        let computed_root = Self::compute_root_from_proof(proof);
        computed_root == self.root()
    }

    /// Compute root from a proof (static verification)
    pub fn compute_root_from_proof(proof: &MerkleProof) -> String {
        let mut current_hash = proof.leaf_hash.clone();

        for step in &proof.path {
            current_hash = if step.is_left {
                Self::hash_pair(&step.hash, &current_hash)
            } else {
                Self::hash_pair(&current_hash, &step.hash)
            };
        }

        current_hash
    }

    /// Verify a proof against an expected root
    pub fn verify_proof_against_root(proof: &MerkleProof, expected_root: &str) -> bool {
        Self::compute_root_from_proof(proof) == expected_root
    }

    /// Rebuild the tree from leaves
    fn rebuild(&mut self) {
        self.levels.clear();

        if self.leaves.is_empty() {
            return;
        }

        // Level 0 is the leaves
        self.levels.push(self.leaves.clone());

        // Build each level
        while self.levels.last().map_or(false, |l| l.len() > 1) {
            let current_level = self.levels.last().unwrap();
            let mut next_level = Vec::new();

            // Pair up nodes
            for chunk in current_level.chunks(2) {
                let hash = if chunk.len() == 2 {
                    Self::hash_pair(&chunk[0], &chunk[1])
                } else {
                    // Odd node: hash with itself
                    Self::hash_pair(&chunk[0], &chunk[0])
                };
                next_level.push(hash);
            }

            self.levels.push(next_level);
        }
    }

    /// Hash two nodes together
    fn hash_pair(left: &str, right: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(left.as_bytes());
        hasher.update(right.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Get all leaves
    pub fn leaves(&self) -> &[String] {
        &self.leaves
    }

    /// Check if tree contains a leaf
    pub fn contains(&self, hash: &str) -> bool {
        self.leaves.contains(&hash.to_string())
    }
}

impl Default for MerkleTree {
    fn default() -> Self {
        Self::new()
    }
}

impl MerkleNode {
    /// Create a leaf node
    pub fn leaf(hash: String) -> Self {
        Self {
            hash,
            left: None,
            right: None,
        }
    }

    /// Create an internal node
    pub fn internal(left: MerkleNode, right: MerkleNode) -> Self {
        let hash = {
            let mut hasher = Sha256::new();
            hasher.update(left.hash.as_bytes());
            hasher.update(right.hash.as_bytes());
            format!("{:x}", hasher.finalize())
        };

        Self {
            hash,
            left: Some(Box::new(left)),
            right: Some(Box::new(right)),
        }
    }

    /// Check if this is a leaf
    pub fn is_leaf(&self) -> bool {
        self.left.is_none() && self.right.is_none()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_tree() {
        let tree = MerkleTree::new();
        assert_eq!(tree.root(), "");
        assert_eq!(tree.height(), 0);
        assert_eq!(tree.leaf_count(), 0);
    }

    #[test]
    fn test_single_leaf() {
        let mut tree = MerkleTree::new();
        tree.add_leaf("hash1");

        assert!(!tree.root().is_empty());
        assert_eq!(tree.height(), 1);
        assert_eq!(tree.leaf_count(), 1);
    }

    #[test]
    fn test_two_leaves() {
        let mut tree = MerkleTree::new();
        tree.add_leaf("hash1");
        tree.add_leaf("hash2");

        assert!(!tree.root().is_empty());
        assert_eq!(tree.height(), 2);
        assert_eq!(tree.leaf_count(), 2);
    }

    #[test]
    fn test_proof_generation_and_verification() {
        let mut tree = MerkleTree::new();
        tree.add_leaf("hash1");
        tree.add_leaf("hash2");
        tree.add_leaf("hash3");
        tree.add_leaf("hash4");

        // Generate proof for hash2
        let proof = tree.generate_proof("hash2").unwrap();
        assert_eq!(proof.leaf_hash, "hash2");
        assert_eq!(proof.root, tree.root());

        // Verify proof
        assert!(tree.verify_proof(&proof));

        // Verify against expected root
        assert!(MerkleTree::verify_proof_against_root(&proof, &tree.root()));
    }

    #[test]
    fn test_proof_fails_for_wrong_leaf() {
        let mut tree = MerkleTree::new();
        tree.add_leaf("hash1");
        tree.add_leaf("hash2");

        // Try to generate proof for non-existent leaf
        let proof = tree.generate_proof("hash3");
        assert!(proof.is_none());
    }

    #[test]
    fn test_root_consistency() {
        let mut tree1 = MerkleTree::new();
        let mut tree2 = MerkleTree::new();

        tree1.add_leaves(&["a".into(), "b".into(), "c".into()]);
        tree2.add_leaves(&["a".into(), "b".into(), "c".into()]);

        assert_eq!(tree1.root(), tree2.root());
    }

    #[test]
    fn test_root_changes_with_different_data() {
        let mut tree1 = MerkleTree::new();
        let mut tree2 = MerkleTree::new();

        tree1.add_leaves(&["a".into(), "b".into()]);
        tree2.add_leaves(&["a".into(), "c".into()]);

        assert_ne!(tree1.root(), tree2.root());
    }
}
