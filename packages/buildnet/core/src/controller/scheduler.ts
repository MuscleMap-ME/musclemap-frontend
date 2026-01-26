/**
 * BuildNet Scheduler
 *
 * Task scheduling with priority queues, node selection,
 * and resource-aware load balancing.
 */

import type {
  BuildTask,
  WorkerNode,
  BuildContext,
  Logger,
  SchedulerConfig,
} from '../types/index.js';
import type { StateManager } from '../state/index.js';

/**
 * Task priority levels.
 */
export enum TaskPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  BACKGROUND = 4,
}

/**
 * Queued task with metadata.
 */
export interface QueuedTask {
  id: string;
  task: BuildTask;
  priority: TaskPriority;
  queuedAt: Date;
  startedAt?: Date;
  assignedNode?: string;
  retryCount: number;
  maxRetries: number;
}

/**
 * Node score for task assignment.
 */
interface NodeScore {
  node: WorkerNode;
  score: number;
  reasons: string[];
}

/**
 * Scheduler for distributing build tasks across worker nodes.
 */
export class Scheduler {
  private queue: QueuedTask[] = [];
  private runningTasks = new Map<string, QueuedTask>();
  private nodes = new Map<string, WorkerNode>();
  private stateManager: StateManager;
  private config: SchedulerConfig;
  private logger: Logger;
  private isRunning = false;
  private processInterval?: NodeJS.Timeout;

  constructor(
    stateManager: StateManager,
    config: SchedulerConfig,
    logger: Logger,
  ) {
    this.stateManager = stateManager;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Start the scheduler.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.logger.info('Scheduler started');

    // Start processing loop
    this.processInterval = setInterval(
      () => this.processQueue(),
      this.config.process_interval_ms ?? 1000,
    );

    // Load state from backend
    await this.loadState();
  }

  /**
   * Stop the scheduler.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = undefined;
    }

    // Save state
    await this.saveState();

    this.logger.info('Scheduler stopped');
  }

  /**
   * Register a worker node.
   */
  registerNode(node: WorkerNode): void {
    this.nodes.set(node.id, node);
    this.logger.info(`Node registered: ${node.id}`, {
      host: node.host,
      capabilities: node.capabilities,
    });
  }

  /**
   * Unregister a worker node.
   */
  unregisterNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      this.nodes.delete(nodeId);
      this.logger.info(`Node unregistered: ${nodeId}`);

      // Reassign tasks from this node
      this.reassignNodeTasks(nodeId);
    }
  }

  /**
   * Update node status.
   */
  updateNodeStatus(
    nodeId: string,
    status: Partial<WorkerNode>,
  ): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      Object.assign(node, status);
      node.lastHeartbeat = new Date();
    }
  }

  /**
   * Queue a build task.
   */
  async queueTask(
    task: BuildTask,
    priority: TaskPriority = TaskPriority.NORMAL,
  ): Promise<string> {
    const queuedTask: QueuedTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      task,
      priority,
      queuedAt: new Date(),
      retryCount: 0,
      maxRetries: this.config.max_retries ?? 3,
    };

    // Insert in priority order
    const insertIndex = this.queue.findIndex(
      (t) => t.priority > priority,
    );

    if (insertIndex === -1) {
      this.queue.push(queuedTask);
    } else {
      this.queue.splice(insertIndex, 0, queuedTask);
    }

    this.logger.info(`Task queued: ${queuedTask.id}`, {
      taskName: task.name,
      priority: TaskPriority[priority],
      queueLength: this.queue.length,
    });

    // Persist to state
    await this.stateManager.set(
      `queue:${queuedTask.id}`,
      JSON.stringify(queuedTask),
    );

    return queuedTask.id;
  }

  /**
   * Cancel a queued task.
   */
  async cancelTask(taskId: string): Promise<boolean> {
    // Check queue
    const queueIndex = this.queue.findIndex((t) => t.id === taskId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      await this.stateManager.delete(`queue:${taskId}`);
      this.logger.info(`Task cancelled: ${taskId}`);
      return true;
    }

    // Check running tasks
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask) {
      // Mark for cancellation - worker will handle it
      await this.stateManager.set(`cancel:${taskId}`, 'true', 60000);
      this.logger.info(`Task cancellation requested: ${taskId}`);
      return true;
    }

    return false;
  }

  /**
   * Get queue status.
   */
  getStatus(): {
    queueLength: number;
    runningCount: number;
    nodes: Array<{
      id: string;
      status: string;
      load: number;
      runningTasks: number;
    }>;
    queue: Array<{
      id: string;
      taskName: string;
      priority: string;
      queuedAt: Date;
    }>;
  } {
    const nodeStatus = Array.from(this.nodes.values()).map((node) => ({
      id: node.id,
      status: node.status,
      load: this.calculateNodeLoad(node),
      runningTasks: this.getNodeRunningTaskCount(node.id),
    }));

    const queueStatus = this.queue.slice(0, 20).map((qt) => ({
      id: qt.id,
      taskName: qt.task.name,
      priority: TaskPriority[qt.priority],
      queuedAt: qt.queuedAt,
    }));

    return {
      queueLength: this.queue.length,
      runningCount: this.runningTasks.size,
      nodes: nodeStatus,
      queue: queueStatus,
    };
  }

  /**
   * Process the queue - assign tasks to available nodes.
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    // Check for healthy nodes
    const healthyNodes = this.getHealthyNodes();
    if (healthyNodes.length === 0) {
      return;
    }

    // Find available nodes
    const availableNodes = healthyNodes.filter(
      (node) => this.canNodeAcceptTask(node),
    );

    if (availableNodes.length === 0) {
      return;
    }

    // Assign tasks to available nodes
    for (const node of availableNodes) {
      if (this.queue.length === 0) {
        break;
      }

      // Find best task for this node
      const taskIndex = this.findBestTaskForNode(node);
      if (taskIndex === -1) {
        continue;
      }

      const queuedTask = this.queue.splice(taskIndex, 1)[0];
      await this.assignTaskToNode(queuedTask, node);
    }
  }

  /**
   * Get healthy nodes.
   */
  private getHealthyNodes(): WorkerNode[] {
    const now = Date.now();
    const timeoutMs = this.config.heartbeat_timeout_ms ?? 15000;

    return Array.from(this.nodes.values()).filter((node) => {
      if (node.status !== 'healthy') {
        return false;
      }

      // Check heartbeat timeout
      if (node.lastHeartbeat) {
        const elapsed = now - node.lastHeartbeat.getTime();
        if (elapsed > timeoutMs) {
          node.status = 'unhealthy';
          this.logger.warn(`Node heartbeat timeout: ${node.id}`);
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Check if a node can accept more tasks.
   */
  private canNodeAcceptTask(node: WorkerNode): boolean {
    const runningCount = this.getNodeRunningTaskCount(node.id);
    const maxConcurrent = node.constraints?.max_concurrent_builds ?? 1;
    return runningCount < maxConcurrent;
  }

  /**
   * Get count of running tasks on a node.
   */
  private getNodeRunningTaskCount(nodeId: string): number {
    let count = 0;
    for (const task of this.runningTasks.values()) {
      if (task.assignedNode === nodeId) {
        count++;
      }
    }
    return count;
  }

  /**
   * Calculate node load (0-1).
   */
  private calculateNodeLoad(node: WorkerNode): number {
    const runningCount = this.getNodeRunningTaskCount(node.id);
    const maxConcurrent = node.constraints?.max_concurrent_builds ?? 1;
    return runningCount / maxConcurrent;
  }

  /**
   * Find the best task for a specific node.
   */
  private findBestTaskForNode(node: WorkerNode): number {
    for (let i = 0; i < this.queue.length; i++) {
      const queuedTask = this.queue[i];
      if (this.canNodeRunTask(node, queuedTask.task)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Check if a node can run a specific task.
   */
  private canNodeRunTask(node: WorkerNode, task: BuildTask): boolean {
    // Check capabilities
    if (task.requires_capabilities) {
      for (const cap of task.requires_capabilities) {
        if (!node.capabilities?.includes(cap)) {
          return false;
        }
      }
    }

    // Check memory requirements
    if (task.memory_required_gb && node.resources) {
      const availableMemory =
        node.resources.memory_gb - (node.currentLoad?.memory_used_gb ?? 0);
      if (availableMemory < task.memory_required_gb) {
        return false;
      }
    }

    return true;
  }

  /**
   * Score nodes for a task and pick the best one.
   */
  scoreNodesForTask(task: BuildTask): NodeScore[] {
    const healthyNodes = this.getHealthyNodes();
    const scores: NodeScore[] = [];

    for (const node of healthyNodes) {
      if (!this.canNodeRunTask(node, task)) {
        continue;
      }

      const score = this.calculateNodeScore(node, task);
      scores.push(score);
    }

    // Sort by score (higher is better)
    scores.sort((a, b) => b.score - a.score);

    return scores;
  }

  /**
   * Calculate a node's score for a specific task.
   */
  private calculateNodeScore(
    node: WorkerNode,
    task: BuildTask,
  ): NodeScore {
    let score = 100;
    const reasons: string[] = [];

    // Factor 1: Current load (prefer less loaded nodes)
    const load = this.calculateNodeLoad(node);
    const loadPenalty = load * 30;
    score -= loadPenalty;
    reasons.push(`Load penalty: -${loadPenalty.toFixed(1)}`);

    // Factor 2: Resource capacity (prefer more powerful nodes)
    if (node.normalization) {
      const cpuBonus = (node.normalization.cpu_factor - 1) * 10;
      const memBonus = (node.normalization.memory_factor - 1) * 5;
      score += cpuBonus + memBonus;
      reasons.push(`Resource bonus: +${(cpuBonus + memBonus).toFixed(1)}`);
    }

    // Factor 3: Preferred node for task type
    if (node.preferred_for?.includes(task.name)) {
      score += 20;
      reasons.push('Preferred node: +20');
    }

    // Factor 4: Queue depth penalty
    const queueDepth = this.getNodeRunningTaskCount(node.id);
    score -= queueDepth * 5;
    reasons.push(`Queue depth: -${queueDepth * 5}`);

    // Factor 5: Locality bonus (if node has cached deps)
    if (node.has_cached_dependencies) {
      score += 15;
      reasons.push('Cache locality: +15');
    }

    return { node, score, reasons };
  }

  /**
   * Assign a task to a node.
   */
  private async assignTaskToNode(
    queuedTask: QueuedTask,
    node: WorkerNode,
  ): Promise<void> {
    queuedTask.assignedNode = node.id;
    queuedTask.startedAt = new Date();

    this.runningTasks.set(queuedTask.id, queuedTask);

    this.logger.info(`Task assigned: ${queuedTask.id} → ${node.id}`, {
      taskName: queuedTask.task.name,
      waitTime: Date.now() - queuedTask.queuedAt.getTime(),
    });

    // Persist assignment
    await this.stateManager.set(
      `running:${queuedTask.id}`,
      JSON.stringify(queuedTask),
    );
    await this.stateManager.delete(`queue:${queuedTask.id}`);

    // Notify node via pub/sub
    await this.stateManager.publish(
      `node:${node.id}:tasks`,
      JSON.stringify({
        type: 'task_assigned',
        task: queuedTask,
      }),
    );
  }

  /**
   * Handle task completion.
   */
  async taskCompleted(
    taskId: string,
    success: boolean,
    result?: unknown,
  ): Promise<void> {
    const task = this.runningTasks.get(taskId);
    if (!task) {
      return;
    }

    this.runningTasks.delete(taskId);
    await this.stateManager.delete(`running:${taskId}`);

    const duration = task.startedAt
      ? Date.now() - task.startedAt.getTime()
      : 0;

    if (success) {
      this.logger.info(`Task completed: ${taskId}`, {
        taskName: task.task.name,
        node: task.assignedNode,
        duration,
      });
    } else {
      this.logger.warn(`Task failed: ${taskId}`, {
        taskName: task.task.name,
        node: task.assignedNode,
        duration,
        retryCount: task.retryCount,
      });

      // Retry if possible
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.assignedNode = undefined;
        task.startedAt = undefined;

        // Re-queue with higher priority
        const retryPriority = Math.max(0, task.priority - 1);
        await this.queueTask(task.task, retryPriority);
        this.logger.info(`Task requeued: ${taskId} (retry ${task.retryCount})`);
      }
    }
  }

  /**
   * Reassign tasks from a failed node.
   */
  private reassignNodeTasks(nodeId: string): void {
    for (const [taskId, task] of this.runningTasks) {
      if (task.assignedNode === nodeId) {
        this.runningTasks.delete(taskId);
        task.assignedNode = undefined;
        task.startedAt = undefined;
        task.retryCount++;

        // Re-queue
        this.queue.unshift(task);
        this.logger.warn(`Task reassigned due to node failure: ${taskId}`);
      }
    }
  }

  /**
   * Load state from backend.
   */
  private async loadState(): Promise<void> {
    try {
      // Load queued tasks
      const queueKeys = await this.stateManager.keys('queue:*');
      for (const key of queueKeys) {
        const data = await this.stateManager.get(key);
        if (data) {
          const task = JSON.parse(data) as QueuedTask;
          task.queuedAt = new Date(task.queuedAt);
          this.queue.push(task);
        }
      }

      // Sort queue by priority
      this.queue.sort((a, b) => a.priority - b.priority);

      // Load running tasks (may need reassignment)
      const runningKeys = await this.stateManager.keys('running:*');
      for (const key of runningKeys) {
        const data = await this.stateManager.get(key);
        if (data) {
          const task = JSON.parse(data) as QueuedTask;
          // Re-queue instead of assuming still running
          task.assignedNode = undefined;
          task.startedAt = undefined;
          this.queue.unshift(task);
        }
        await this.stateManager.delete(key);
      }

      this.logger.info('Scheduler state loaded', {
        queueLength: this.queue.length,
      });
    } catch (error) {
      this.logger.warn('Failed to load scheduler state', { error });
    }
  }

  /**
   * Save state to backend.
   */
  private async saveState(): Promise<void> {
    try {
      // Save queued tasks
      for (const task of this.queue) {
        await this.stateManager.set(
          `queue:${task.id}`,
          JSON.stringify(task),
        );
      }

      this.logger.debug('Scheduler state saved');
    } catch (error) {
      this.logger.warn('Failed to save scheduler state', { error });
    }
  }
}
