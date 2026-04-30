import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventBusService, SensorEvent, AlertEvent } from '../../common/event-bus/event-bus.service';

const THROTTLE_INTERVAL_MS = 100; // Max 10 updates/sec per room

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly clientSubscriptions = new Map<string, Set<string>>();
  // Throttle: buffer latest event per room, flush on interval
  private readonly roomBuffers = new Map<string, SensorEvent>();
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly activeRedisSubscriptions = new Set<string>();

  constructor(private readonly eventBus: EventBusService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    // Start throttle flush timer
    this.flushTimer = setInterval(() => this.flushBuffers(), THROTTLE_INTERVAL_MS);
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
    this.clientSubscriptions.set(client.id, new Set());
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
    this.clientSubscriptions.delete(client.id);
  }

  // ─── Subscribe to tenant-level sensor data ─────────────────

  @SubscribeMessage('subscribe:tenant')
  async handleSubscribeTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ) {
    const room = `tenant:${data.tenantId}`;
    client.join(room);
    this.clientSubscriptions.get(client.id)?.add(room);

    // Only subscribe to Redis once per tenant
    const subKey = `sensor:${data.tenantId}`;
    if (!this.activeRedisSubscriptions.has(subKey)) {
      this.activeRedisSubscriptions.add(subKey);
      await this.eventBus.subscribeSensorData(data.tenantId, (event) => {
        this.bufferEvent(`tenant:${event.tenantId}`, event);
        this.bufferEvent(`sensor:${event.sensorId}`, event);
      });
    }

    // Subscribe to alerts for this tenant
    const alertSubKey = `alert:${data.tenantId}`;
    if (!this.activeRedisSubscriptions.has(alertSubKey)) {
      this.activeRedisSubscriptions.add(alertSubKey);
      await this.eventBus.subscribeAlerts(data.tenantId, (alert) => {
        this.server.to(room).emit('alert', alert);
      });
    }

    this.logger.log(`Client ${client.id} subscribed to tenant ${data.tenantId}`);
    return { subscribed: room };
  }

  // ─── Subscribe to a specific twin's data ───────────────────

  @SubscribeMessage('subscribe:twin')
  handleSubscribeTwin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { twinId: string },
  ) {
    const room = `twin:${data.twinId}`;
    client.join(room);
    this.clientSubscriptions.get(client.id)?.add(room);
    this.logger.log(`Client ${client.id} subscribed to twin ${data.twinId}`);
    return { subscribed: room };
  }

  // ─── Subscribe to a specific sensor ────────────────────────

  @SubscribeMessage('subscribe:sensor')
  async handleSubscribeSensor(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sensorId: string },
  ) {
    const room = `sensor:${data.sensorId}`;
    client.join(room);
    this.clientSubscriptions.get(client.id)?.add(room);

    const subKey = `sensor-direct:${data.sensorId}`;
    if (!this.activeRedisSubscriptions.has(subKey)) {
      this.activeRedisSubscriptions.add(subKey);
      await this.eventBus.subscribeSensor(data.sensorId, (event) => {
        this.bufferEvent(`sensor:${event.sensorId}`, event);
      });
    }

    this.logger.log(`Client ${client.id} subscribed to sensor ${data.sensorId}`);
    return { subscribed: room };
  }

  // ─── Unsubscribe ───────────────────────────────────────────

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    client.leave(data.room);
    this.clientSubscriptions.get(client.id)?.delete(data.room);
    this.logger.debug(`Client ${client.id} unsubscribed from ${data.room}`);
    return { unsubscribed: data.room };
  }

  // ─── Throttled broadcast ───────────────────────────────────

  private bufferEvent(room: string, event: SensorEvent) {
    // Keep only the latest event per room (drop older ones = load shedding)
    this.roomBuffers.set(room, event);
  }

  private flushBuffers() {
    if (this.roomBuffers.size === 0) return;

    for (const [room, event] of this.roomBuffers) {
      this.server.to(room).emit('sensor:data', event);
    }
    this.roomBuffers.clear();
  }

  // ─── Direct broadcast (for non-throttled events) ──────────

  broadcastSensorData(event: SensorEvent) {
    this.bufferEvent(`tenant:${event.tenantId}`, event);
    this.bufferEvent(`sensor:${event.sensorId}`, event);
    if (event.twinId) {
      this.bufferEvent(`twin:${event.twinId}`, event);
    }
  }

  broadcastAlert(alert: AlertEvent) {
    this.server.to(`tenant:${alert.tenantId}`).emit('alert', alert);
  }

  onModuleDestroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }
}
