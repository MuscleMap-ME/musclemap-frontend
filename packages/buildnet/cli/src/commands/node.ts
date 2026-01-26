/**
 * BuildNet CLI - Node Command
 *
 * Manage worker nodes.
 */

import type { BuildController } from '@buildnet/core';

/**
 * List all nodes.
 */
export async function listNodesCommand(
  controller: BuildController,
): Promise<void> {
  const status = controller.getStatus();

  console.log('\n📡 Worker Nodes\n');

  if (status.scheduler.nodes.length === 0) {
    console.log('   No nodes registered');
    console.log('   Run `buildnet worker start` to register a node');
  } else {
    console.log('   ID                  Status    Load   Tasks  Capacity');
    console.log('   ────────────────────────────────────────────────────');

    for (const node of status.scheduler.nodes) {
      const loadBar = createLoadBar(node.load * 100);
      console.log(
        `   ${node.id.padEnd(20)} ${formatNodeStatus(node.status).padEnd(9)} ${loadBar} ${node.runningTasks}`,
      );
    }
  }

  console.log();
}

/**
 * Show node details.
 */
export async function showNodeCommand(
  controller: BuildController,
  nodeId: string,
): Promise<void> {
  const status = controller.getStatus();
  const node = status.scheduler.nodes.find((n) => n.id === nodeId);

  if (!node) {
    console.error(`Node ${nodeId} not found`);
    process.exit(1);
  }

  console.log('\n📡 Node Details\n');
  console.log(`   ID:           ${node.id}`);
  console.log(`   Status:       ${formatNodeStatus(node.status)}`);
  console.log(`   Load:         ${(node.load * 100).toFixed(1)}%`);
  console.log(`   Active Tasks: ${node.runningTasks}`);

  console.log();
}

/**
 * Create a simple load bar.
 */
function createLoadBar(load: number, width = 10): string {
  const filled = Math.round((load / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  // Color code based on load
  if (load > 80) return `${bar} ${load.toFixed(0)}%`;
  if (load > 50) return `${bar} ${load.toFixed(0)}%`;
  return `${bar} ${load.toFixed(0)}%`;
}

/**
 * Format node status with emoji.
 */
function formatNodeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    healthy: '✅ healthy',
    degraded: '⚠️  degraded',
    offline: '❌ offline',
    draining: '🔄 draining',
    unhealthy: '❌ unhealthy',
  };
  return statusMap[status] ?? status;
}
