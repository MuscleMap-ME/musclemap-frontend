//! Performance Benchmarking
//!
//! Benchmarks system resources for performance profiling.

use super::*;
use crate::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

/// Types of benchmarks that can be run
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BenchmarkType {
    /// CPU performance benchmarks
    Cpu,
    /// Memory bandwidth benchmarks
    Memory,
    /// Storage I/O benchmarks
    Storage,
    /// Network latency/bandwidth benchmarks
    Network,
    /// Full system benchmark
    Full,
}

/// Storage performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoragePerformance {
    /// Path that was benchmarked
    pub path: PathBuf,
    /// Sequential read speed in MB/s
    pub read_speed_mbps: f64,
    /// Sequential write speed in MB/s
    pub write_speed_mbps: f64,
    /// Random read IOPS
    pub random_read_iops: u32,
    /// Random write IOPS
    pub random_write_iops: u32,
    /// Read latency in microseconds
    pub read_latency_us: u64,
    /// Write latency in microseconds
    pub write_latency_us: u64,
    /// Detected storage class
    pub storage_class: StorageClass,
}

/// CPU benchmark results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuBenchmarkResult {
    /// Single-core score (higher is better)
    pub single_core_score: f64,
    /// Multi-core score
    pub multi_core_score: f64,
    /// Parallel efficiency (0.0 - 1.0)
    pub parallel_efficiency: f64,
    /// Number of cores that scale effectively
    pub effective_cores: usize,
    /// Duration of benchmark
    pub duration_ms: u64,
}

/// Memory benchmark results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryBenchmarkResult {
    /// Sequential read bandwidth in GB/s
    pub read_bandwidth_gbps: f64,
    /// Sequential write bandwidth in GB/s
    pub write_bandwidth_gbps: f64,
    /// Random access latency in nanoseconds
    pub latency_ns: u64,
    /// Duration of benchmark
    pub duration_ms: u64,
}

/// Network benchmark results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkBenchmarkResult {
    /// Target that was tested
    pub target: String,
    /// Round-trip latency in milliseconds
    pub latency_ms: f64,
    /// Jitter in milliseconds
    pub jitter_ms: f64,
    /// Upload bandwidth in Mbps
    pub upload_mbps: f64,
    /// Download bandwidth in Mbps
    pub download_mbps: f64,
    /// Packet loss percentage
    pub packet_loss_percent: f64,
}

/// Complete benchmark results for a node
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkResults {
    /// Node that was benchmarked
    pub node_id: String,
    /// When benchmarks were run
    pub timestamp: chrono::DateTime<chrono::Utc>,
    /// Total benchmark duration
    pub duration_ms: u64,
    /// CPU benchmarks
    pub cpu: Option<CpuBenchmarkResult>,
    /// Memory benchmarks
    pub memory: Option<MemoryBenchmarkResult>,
    /// Storage benchmarks per volume
    pub storage: Vec<StoragePerformance>,
    /// Network benchmarks per target
    pub network: Vec<NetworkBenchmarkResult>,
    /// Overall performance score (0-100)
    pub overall_score: f64,
}

/// Benchmark runner
pub struct BenchmarkRunner {
    node_id: String,
    test_size_mb: u64,
}

impl BenchmarkRunner {
    /// Create a new benchmark runner
    pub fn new(node_id: String, test_size_mb: u64) -> Self {
        Self {
            node_id,
            test_size_mb,
        }
    }

    /// Run all benchmarks
    pub async fn run_full(&self, resources: &NodeResources) -> Result<BenchmarkResults> {
        let start = Instant::now();

        let cpu = self.benchmark_cpu(resources.cpu.logical_cores).await.ok();
        let memory = self.benchmark_memory().await.ok();

        let mut storage_results = Vec::new();
        for volume in &resources.storage {
            if volume.available_bytes > (self.test_size_mb * 2 * 1024 * 1024) {
                if let Ok(perf) = self.benchmark_storage(&volume.path).await {
                    storage_results.push(perf);
                }
            }
        }

        let overall_score = self.calculate_overall_score(&cpu, &memory, &storage_results);

        Ok(BenchmarkResults {
            node_id: self.node_id.clone(),
            timestamp: chrono::Utc::now(),
            duration_ms: start.elapsed().as_millis() as u64,
            cpu,
            memory,
            storage: storage_results,
            network: vec![], // Network benchmarks require targets
            overall_score,
        })
    }

    /// Benchmark CPU performance
    pub async fn benchmark_cpu(&self, cores: usize) -> Result<CpuBenchmarkResult> {
        let start = Instant::now();

        // Single-core benchmark: prime sieve
        let single_score = self.run_prime_sieve_single().await;

        // Multi-core benchmark: parallel prime sieve
        let multi_score = self.run_prime_sieve_parallel(cores).await;

        let parallel_efficiency = if single_score * cores as f64 > 0.0 {
            multi_score / (single_score * cores as f64)
        } else {
            0.0
        };

        let effective_cores = (parallel_efficiency * cores as f64).round() as usize;

        Ok(CpuBenchmarkResult {
            single_core_score: single_score,
            multi_core_score: multi_score,
            parallel_efficiency,
            effective_cores: effective_cores.max(1),
            duration_ms: start.elapsed().as_millis() as u64,
        })
    }

    /// Run single-threaded prime sieve
    async fn run_prime_sieve_single(&self) -> f64 {
        let start = Instant::now();
        let limit = 1_000_000u64;
        let mut count = 0u64;

        // Simple prime check
        for n in 2..limit {
            if self.is_prime(n) {
                count += 1;
            }
        }

        let elapsed = start.elapsed().as_secs_f64();
        // Score based on primes found per second
        count as f64 / elapsed
    }

    /// Run parallel prime sieve
    async fn run_prime_sieve_parallel(&self, cores: usize) -> f64 {
        let start = Instant::now();
        let limit = 1_000_000u64;
        let chunk_size = limit / cores as u64;

        let mut handles = Vec::new();
        for i in 0..cores {
            let from = 2 + (i as u64 * chunk_size);
            let to = if i == cores - 1 {
                limit
            } else {
                from + chunk_size
            };

            handles.push(tokio::spawn(async move {
                let mut count = 0u64;
                for n in from..to {
                    if Self::is_prime_static(n) {
                        count += 1;
                    }
                }
                count
            }));
        }

        let mut total = 0u64;
        for handle in handles {
            if let Ok(count) = handle.await {
                total += count;
            }
        }

        let elapsed = start.elapsed().as_secs_f64();
        total as f64 / elapsed
    }

    fn is_prime(&self, n: u64) -> bool {
        Self::is_prime_static(n)
    }

    fn is_prime_static(n: u64) -> bool {
        if n < 2 {
            return false;
        }
        if n == 2 {
            return true;
        }
        if n % 2 == 0 {
            return false;
        }
        let sqrt = (n as f64).sqrt() as u64;
        for i in (3..=sqrt).step_by(2) {
            if n % i == 0 {
                return false;
            }
        }
        true
    }

    /// Benchmark memory performance
    pub async fn benchmark_memory(&self) -> Result<MemoryBenchmarkResult> {
        let start = Instant::now();
        let size = 64 * 1024 * 1024; // 64 MB test

        // Allocate buffer
        let mut buffer = vec![0u8; size];

        // Write test
        let write_start = Instant::now();
        for i in 0..size {
            buffer[i] = (i % 256) as u8;
        }
        let write_elapsed = write_start.elapsed();

        // Read test
        let read_start = Instant::now();
        let mut sum = 0u64;
        for &byte in &buffer {
            sum = sum.wrapping_add(byte as u64);
        }
        let read_elapsed = read_start.elapsed();

        // Prevent optimization from removing the sum
        if sum == 0 {
            tracing::trace!("Sum was zero");
        }

        // Calculate bandwidth in GB/s
        let size_gb = size as f64 / (1024.0 * 1024.0 * 1024.0);
        let read_bandwidth = size_gb / read_elapsed.as_secs_f64();
        let write_bandwidth = size_gb / write_elapsed.as_secs_f64();

        // Random access latency test
        let latency_ns = self.measure_memory_latency(&buffer).await;

        Ok(MemoryBenchmarkResult {
            read_bandwidth_gbps: read_bandwidth,
            write_bandwidth_gbps: write_bandwidth,
            latency_ns,
            duration_ms: start.elapsed().as_millis() as u64,
        })
    }

    /// Measure memory access latency
    async fn measure_memory_latency(&self, buffer: &[u8]) -> u64 {
        let iterations = 10000;
        let mut total_ns = 0u64;

        for i in 0..iterations {
            let index = (i * 4096) % buffer.len(); // Access at page boundaries
            let start = Instant::now();
            let _ = buffer[index];
            total_ns += start.elapsed().as_nanos() as u64;
        }

        total_ns / iterations as u64
    }

    /// Benchmark storage performance
    pub async fn benchmark_storage(&self, path: &PathBuf) -> Result<StoragePerformance> {
        let test_file = path.join(".buildnet_benchmark_tmp");
        let test_size = self.test_size_mb * 1024 * 1024;

        // Generate test data
        let data: Vec<u8> = (0..test_size as usize)
            .map(|i| (i % 256) as u8)
            .collect();

        // Sequential write test
        let write_start = Instant::now();
        let mut file = tokio::fs::File::create(&test_file).await?;
        file.write_all(&data).await?;
        file.sync_all().await?;
        drop(file);
        let write_elapsed = write_start.elapsed();

        // Sequential read test
        let read_start = Instant::now();
        let mut file = tokio::fs::File::open(&test_file).await?;
        let mut read_buffer = Vec::with_capacity(test_size as usize);
        file.read_to_end(&mut read_buffer).await?;
        drop(file);
        let read_elapsed = read_start.elapsed();

        // Calculate speeds in MB/s
        let size_mb = self.test_size_mb as f64;
        let read_speed = size_mb / read_elapsed.as_secs_f64();
        let write_speed = size_mb / write_elapsed.as_secs_f64();

        // Random IOPS test
        let (random_read_iops, random_write_iops) =
            self.test_random_iops(&test_file).await.unwrap_or((0, 0));

        // Latency test
        let read_latency_us = self.test_read_latency(&test_file).await.unwrap_or(0);
        let write_latency_us = self.test_write_latency(&test_file).await.unwrap_or(0);

        // Cleanup
        let _ = tokio::fs::remove_file(&test_file).await;

        // Classify storage
        let storage_class = StorageClass::classify(read_speed, random_read_iops);

        Ok(StoragePerformance {
            path: path.clone(),
            read_speed_mbps: read_speed,
            write_speed_mbps: write_speed,
            random_read_iops,
            random_write_iops,
            read_latency_us,
            write_latency_us,
            storage_class,
        })
    }

    /// Test random IOPS
    async fn test_random_iops(&self, path: &PathBuf) -> Result<(u32, u32)> {
        let iterations = 1000;
        let block_size = 4096; // 4KB blocks

        // Random read IOPS
        let file = tokio::fs::File::open(path).await?;
        let file_len = file.metadata().await?.len();

        let read_start = Instant::now();
        let mut read_buffer = vec![0u8; block_size];

        // Use file directly for reads
        let std_file = file.into_std().await;

        for i in 0..iterations {
            let offset = ((i * 7919) as u64 % (file_len / block_size as u64)) * block_size as u64;
            #[cfg(unix)]
            {
                use std::os::unix::fs::FileExt;
                let _ = std_file.read_at(&mut read_buffer, offset);
            }
            #[cfg(not(unix))]
            {
                // Fallback for non-Unix systems
                let _ = &read_buffer;
                let _ = offset;
            }
        }
        let read_elapsed = read_start.elapsed();
        let read_iops = (iterations as f64 / read_elapsed.as_secs_f64()) as u32;

        // Random write IOPS (on a new file)
        let write_file = path.parent().unwrap().join(".buildnet_iops_tmp");
        {
            let file = tokio::fs::File::create(&write_file).await?;
            let std_file = file.into_std().await;
            let write_start = Instant::now();
            let write_data = vec![0xABu8; block_size];

            for i in 0..iterations {
                let offset = (i * block_size) as u64;
                #[cfg(unix)]
                {
                    use std::os::unix::fs::FileExt;
                    let _ = std_file.write_at(&write_data, offset);
                }
                #[cfg(not(unix))]
                {
                    let _ = &write_data;
                    let _ = offset;
                }
            }
            let _ = std_file.sync_all();
            let write_elapsed = write_start.elapsed();
            let write_iops = (iterations as f64 / write_elapsed.as_secs_f64()) as u32;

            let _ = tokio::fs::remove_file(&write_file).await;
            Ok((read_iops, write_iops))
        }
    }

    /// Test read latency
    async fn test_read_latency(&self, path: &PathBuf) -> Result<u64> {
        let iterations = 100;
        let mut total_us = 0u64;

        for _ in 0..iterations {
            let start = Instant::now();
            let mut file = tokio::fs::File::open(path).await?;
            let mut buf = [0u8; 1];
            let _ = file.read_exact(&mut buf).await;
            total_us += start.elapsed().as_micros() as u64;
        }

        Ok(total_us / iterations as u64)
    }

    /// Test write latency
    async fn test_write_latency(&self, path: &PathBuf) -> Result<u64> {
        let iterations = 100;
        let mut total_us = 0u64;
        let temp_path = path.parent().unwrap().join(".buildnet_latency_tmp");

        for _ in 0..iterations {
            let start = Instant::now();
            let mut file = tokio::fs::File::create(&temp_path).await?;
            file.write_all(&[0xAB]).await?;
            file.sync_all().await?;
            total_us += start.elapsed().as_micros() as u64;
        }

        let _ = tokio::fs::remove_file(&temp_path).await;
        Ok(total_us / iterations as u64)
    }

    /// Benchmark network to a specific target
    pub async fn benchmark_network(&self, target: &str) -> Result<NetworkBenchmarkResult> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .build()?;

        let url = format!("http://{}/health", target);

        // Latency test - multiple pings
        let mut latencies = Vec::new();
        for _ in 0..20 {
            let start = Instant::now();
            if client.get(&url).send().await.is_ok() {
                latencies.push(start.elapsed().as_secs_f64() * 1000.0);
            }
        }

        if latencies.is_empty() {
            return Err(crate::BuildNetError::Network(format!(
                "Could not connect to {}",
                target
            )));
        }

        let avg_latency = latencies.iter().sum::<f64>() / latencies.len() as f64;

        // Calculate jitter (standard deviation)
        let variance = latencies
            .iter()
            .map(|l| (l - avg_latency).powi(2))
            .sum::<f64>()
            / latencies.len() as f64;
        let jitter = variance.sqrt();

        // Packet loss
        let packet_loss = (20 - latencies.len()) as f64 / 20.0 * 100.0;

        // Bandwidth test would require specific endpoints
        // For now, estimate based on latency
        let estimated_bandwidth = if avg_latency < 10.0 {
            1000.0 // LAN
        } else if avg_latency < 50.0 {
            100.0 // Fast WAN
        } else {
            10.0 // Slow WAN
        };

        Ok(NetworkBenchmarkResult {
            target: target.to_string(),
            latency_ms: avg_latency,
            jitter_ms: jitter,
            upload_mbps: estimated_bandwidth,
            download_mbps: estimated_bandwidth,
            packet_loss_percent: packet_loss,
        })
    }

    /// Calculate overall performance score
    fn calculate_overall_score(
        &self,
        cpu: &Option<CpuBenchmarkResult>,
        memory: &Option<MemoryBenchmarkResult>,
        storage: &[StoragePerformance],
    ) -> f64 {
        let mut score = 0.0;
        let mut weight = 0.0;

        // CPU score (40% weight)
        if let Some(cpu) = cpu {
            let cpu_score = (cpu.single_core_score / 100000.0).min(1.0) * 40.0
                + (cpu.parallel_efficiency * 60.0);
            score += cpu_score * 0.4;
            weight += 0.4;
        }

        // Memory score (30% weight)
        if let Some(mem) = memory {
            let mem_score = (mem.read_bandwidth_gbps / 50.0).min(1.0) * 100.0;
            score += mem_score * 0.3;
            weight += 0.3;
        }

        // Storage score (30% weight) - use best storage
        if let Some(best) = storage.iter().max_by(|a, b| {
            a.read_speed_mbps
                .partial_cmp(&b.read_speed_mbps)
                .unwrap_or(std::cmp::Ordering::Equal)
        }) {
            let storage_score = match best.storage_class {
                StorageClass::NVMe => 100.0,
                StorageClass::SSD => 70.0,
                StorageClass::HDD => 30.0,
                StorageClass::Network => 10.0,
                StorageClass::Unknown => 20.0,
            };
            score += storage_score * 0.3;
            weight += 0.3;
        }

        if weight > 0.0 {
            score / weight
        } else {
            50.0 // Default middle score
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_cpu_benchmark() {
        let runner = BenchmarkRunner::new("test".to_string(), 16);
        let result = runner.benchmark_cpu(4).await.unwrap();
        assert!(result.single_core_score > 0.0);
        assert!(result.multi_core_score > 0.0);
    }

    #[tokio::test]
    async fn test_memory_benchmark() {
        let runner = BenchmarkRunner::new("test".to_string(), 16);
        let result = runner.benchmark_memory().await.unwrap();
        assert!(result.read_bandwidth_gbps > 0.0);
        assert!(result.write_bandwidth_gbps > 0.0);
    }
}
