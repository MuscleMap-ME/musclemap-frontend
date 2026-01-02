/**
 * Rivals WebSocket
 *
 * Real-time updates for active rivalries.
 */
import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { verifyToken } from '../../auth';
import { rivalsService } from './service';
import type { RivalEvent, RivalWorkoutEvent, RivalMilestoneEvent } from './types';

// Store connections by user ID
const userConnections = new Map<string, Set<WebSocket>>();

// Store connection to user mapping for cleanup
const connectionToUser = new WeakMap<WebSocket, string>();

export function registerRivalsWebSocket(fastify: FastifyInstance): void {
  fastify.get('/ws/rivals', { websocket: true }, (socket, req) => {
    let userId: string | null = null;

    // Authenticate
    const token =
      (req.query as Record<string, string>)?.token ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      socket.close(4001, 'Authentication required');
      return;
    }

    try {
      const payload = verifyToken(token);
      userId = payload.userId;
    } catch {
      socket.close(4001, 'Invalid token');
      return;
    }

    // Add to user connections
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId)!.add(socket);
    connectionToUser.set(socket, userId);

    // Send initial data
    sendInitialData(socket, userId);

    // Handle messages
    socket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(socket, userId!, message);
      } catch (err) {
        socket.send(
          JSON.stringify({ type: 'error', message: 'Invalid message format' })
        );
      }
    });

    // Handle close
    socket.on('close', () => {
      if (userId) {
        const connections = userConnections.get(userId);
        if (connections) {
          connections.delete(socket);
          if (connections.size === 0) {
            userConnections.delete(userId);
          }
        }
      }
    });

    // Heartbeat
    const heartbeat = setInterval(() => {
      if (socket.readyState === socket.OPEN) {
        socket.ping();
      }
    }, 30000);

    socket.on('close', () => clearInterval(heartbeat));
  });
}

async function sendInitialData(socket: WebSocket, userId: string): Promise<void> {
  try {
    const [rivals, stats, pending] = await Promise.all([
      rivalsService.getUserRivalries(userId, 'active'),
      rivalsService.getUserStats(userId),
      rivalsService.getPendingRequests(userId),
    ]);

    socket.send(
      JSON.stringify({
        type: 'snapshot',
        data: {
          rivals,
          stats,
          pendingRequests: pending,
        },
      })
    );
  } catch (err) {
    socket.send(
      JSON.stringify({
        type: 'error',
        message: 'Failed to load rivalry data',
      })
    );
  }
}

async function handleMessage(
  socket: WebSocket,
  userId: string,
  message: { type: string; data?: Record<string, unknown> }
): Promise<void> {
  switch (message.type) {
    case 'heartbeat':
      socket.send(JSON.stringify({ type: 'heartbeat', timestamp: new Date() }));
      break;

    case 'refresh':
      await sendInitialData(socket, userId);
      break;

    default:
      socket.send(
        JSON.stringify({ type: 'error', message: 'Unknown message type' })
      );
  }
}

/**
 * Send event to a specific user
 */
export function sendToUser(userId: string, event: RivalEvent): void {
  const connections = userConnections.get(userId);
  if (!connections) return;

  const message = JSON.stringify({ type: 'event', event });
  for (const socket of connections) {
    if (socket.readyState === socket.OPEN) {
      socket.send(message);
    }
  }
}

/**
 * Broadcast workout update to all rivalry opponents
 */
export async function broadcastRivalWorkout(
  userId: string,
  username: string,
  workoutId: string,
  tuEarned: number,
  topMuscles: string[]
): Promise<void> {
  // Get updated rivalries
  const rivalries = await rivalsService.getUserRivalries(userId, 'active');

  for (const rivalry of rivalries) {
    const opponentId = rivalry.opponent.id;
    const totalTU = rivalry.myTU;

    const event: RivalWorkoutEvent = {
      type: 'rival.workout',
      rivalryId: rivalry.id,
      timestamp: new Date(),
      data: {
        userId,
        username,
        tuEarned,
        totalTU,
        workoutId,
        topMuscles,
      },
    };

    // Send to opponent
    sendToUser(opponentId, event);

    // Check for milestones
    checkMilestones(rivalry, userId, username, opponentId);
  }
}

/**
 * Check and broadcast milestone events
 */
function checkMilestones(
  rivalry: Awaited<ReturnType<typeof rivalsService.getUserRivalries>>[0],
  userId: string,
  username: string,
  opponentId: string
): void {
  const myTU = rivalry.myTU;
  const opponentTU = rivalry.opponentTU;
  const previousMyTU = myTU; // This would need to track previous state

  // Check overtake
  if (myTU > opponentTU && previousMyTU <= opponentTU) {
    const event: RivalMilestoneEvent = {
      type: 'rival.milestone',
      rivalryId: rivalry.id,
      timestamp: new Date(),
      data: {
        userId,
        username,
        milestone: 'overtake',
        value: myTU - opponentTU,
      },
    };
    sendToUser(opponentId, event);
    sendToUser(userId, event);
  }

  // Check TU milestones
  const tuMilestones = [100, 500] as const;
  for (const milestone of tuMilestones) {
    if (myTU >= milestone && previousMyTU < milestone) {
      const event: RivalMilestoneEvent = {
        type: 'rival.milestone',
        rivalryId: rivalry.id,
        timestamp: new Date(),
        data: {
          userId,
          username,
          milestone: `tu_${milestone}` as 'tu_100' | 'tu_500',
          value: myTU,
        },
      };
      sendToUser(opponentId, event);
      sendToUser(userId, event);
    }
  }
}

/**
 * Broadcast rivalry status change
 */
export function broadcastRivalryStatusChange(
  rivalryId: string,
  type: 'rival.request' | 'rival.accepted' | 'rival.declined' | 'rival.ended',
  challengerId: string,
  challengedId: string,
  data: Record<string, unknown> = {}
): void {
  const event: RivalEvent = {
    type,
    rivalryId,
    timestamp: new Date(),
    data,
  };

  sendToUser(challengerId, event);
  sendToUser(challengedId, event);
}

/**
 * Get connection stats
 */
export function getConnectionStats(): { users: number; connections: number } {
  let connections = 0;
  for (const sockets of userConnections.values()) {
    connections += sockets.size;
  }
  return {
    users: userConnections.size,
    connections,
  };
}
