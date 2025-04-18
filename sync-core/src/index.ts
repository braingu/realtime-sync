/**
 * The default shape of a presence payload.
 * You can extend this as needed in your application.
 */
export type Presence = {
  name?: string;
  cursor?: [number, number];
  tool?: string;
  color?: string;
  [key: string]: unknown;
};

/**
 * A minimal socket interface expected by SyncRoom.
 * You can wrap any WebSocket-like object to conform to this interface.
 */
export interface SyncSocket {
  /**
   * Send a message to the connected client.
   */
  send: (data: string | Buffer) => void;

  /**
   * Register a handler for incoming messages from the client.
   */
  onMessage: (handler: (msg: string) => void) => void;

  /**
   * Register a handler for when the connection is closed.
   */
  onClose: (handler: () => void) => void;
}

/**
 * Optional lifecycle hooks that can be provided to customize room behavior.
 */
export interface RoomHooks {
  /**
   * Called when a new session connects to the room.
   */
  onJoin?: (sessionId: string) => void;

  /**
   * Called when a session disconnects from the room.
   */
  onLeave?: (sessionId: string) => void;

  /**
   * Called when a session sends a message.
   * Can optionally transform or sanitize the message.
   */
  onMessage?: (sessionId: string, message: string) => string | void;

  /**
   * Called when a message is broadcast to another client.
   */
  onBroadcast?: (from: string, to: string, message: string) => void;

  /**
   * Called when a session updates their presence data.
   */
  onPresenceUpdate?: (sessionId: string, presence: Presence) => void;
}

/**
 * Configuration object passed when constructing a SyncRoom.
 */
export interface RoomConfig {
  /**
   * Unique ID for the room.
   */
  id: string;

  /**
   * Optional lifecycle hooks.
   */
  hooks?: RoomHooks;
}

/**
 * A SyncRoom manages a group of clients connected to the same room.
 *
 * Each client (identified by sessionId) connects using a `SyncSocket`, and
 * all messages received from a client are broadcast to all other clients.
 *
 * Intended to support collaborative real-time syncing of shared documents.
 * Hooks allow consumers to monitor or modify room behavior.
 *
 * Presence data can be updated independently per session.
 */
export class SyncRoom {
  /** Unique ID of this room */
  id: string;

  /** Active client connections in the room, keyed by sessionId */
  private sockets: Map<string, SyncSocket> = new Map();

  /** Optional lifecycle hooks provided in config */
  private hooks?: RoomHooks;

  /** Ephemeral presence data, keyed by sessionId */
  private presence: Map<string, Presence> = new Map();

  constructor(config: RoomConfig) {
    this.id = config.id;
    this.hooks = config.hooks;
  }

  /**
   * Connect a new client session to this room.
   *
   * @param sessionId A unique ID representing the client session.
   * @param socket A socket conforming to SyncSocket interface.
   */
  connect(sessionId: string, socket: SyncSocket) {
    this.sockets.set(sessionId, socket);
    this.hooks?.onJoin?.(sessionId);

    socket.onMessage((msg) => {
      const maybeTransformed = this.hooks?.onMessage?.(sessionId, msg) ?? msg;
      this.broadcast(sessionId, maybeTransformed);
    });

    socket.onClose(() => {
      this.sockets.delete(sessionId);
      this.presence.delete(sessionId);
      this.hooks?.onLeave?.(sessionId);
    });
  }

  /**
   * Broadcast a message to all other connected clients in the room.
   *
   * @param fromSessionId The sender's session ID.
   * @param message The message to broadcast.
   */
  broadcast(fromSessionId: string, message: string) {
    for (const [sessionId, socket] of this.sockets.entries()) {
      if (sessionId !== fromSessionId) {
        this.hooks?.onBroadcast?.(fromSessionId, sessionId, message);
        socket.send(message);
      }
    }
  }

  /**
   * Update the presence data for a specific session and optionally broadcast it.
   *
   * @param sessionId The session ID associated with the update.
   * @param data Arbitrary presence payload.
   */
  updatePresence(sessionId: string, data: Presence) {
    this.presence.set(sessionId, data);
    this.hooks?.onPresenceUpdate?.(sessionId, data);

    const message = JSON.stringify({
      type: "presence",
      sessionId,
      data,
    });

    this.broadcast(sessionId, message);
  }

  /**
   * Retrieve the current presence data for a specific session.
   *
   * @param sessionId The session ID to look up.
   * @returns The stored presence object or undefined.
   */
  getPresence(sessionId: string): Presence | undefined {
    return this.presence.get(sessionId);
  }

  /**
   * Retrieve a copy of all presence data for this room.
   *
   * @returns A new Map containing all sessionId → presence entries.
   */
  getAllPresence(): Map<string, Presence> {
    return new Map(this.presence);
  }
}
