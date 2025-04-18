import { fastify, FastifyRequest } from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import { getOrCreateRoom } from "./rooms";
import { WebSocket } from "ws";

const PORT = 5858;
const app = fastify({
  logger: {
    level: "debug",
    transport: {
      target: "pino-pretty",
    },
  },
});

// Register plugins
app.register(websocket);
app.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});

// Health check endpoint - useful for debugging
app.get("/", async () => ({
  status: "sync-whiteboard is running",
  time: new Date().toISOString(),
}));

// Define request parameter types
interface ConnectParams {
  roomId?: string; // Make optional to handle empty roomId case
}

// TLDraw sends these parameters automatically
interface ConnectQuerystring {
  clientId?: string;
  appUser?: string;
  storeId?: string;
  sessionId?: string; // TLDraw adds this automatically
}

// Debug endpoint to check request parameters
app.get("/debug", (request, reply) => {
  reply.send({
    query: request.query,
    params: request.params,
    url: request.url,
    headers: request.headers,
  });
});

// WebSocket sync route that handles both /:roomId and / paths
app.get<{ Params: ConnectParams; Querystring: ConnectQuerystring }>(
  "/connect/:roomId?", // Make roomId optional with ?
  { websocket: true },
  (
    socket,
    request: FastifyRequest<{
      Params: ConnectParams;
      Querystring: ConnectQuerystring;
    }>
  ) => {
    // Use roomId from params or default to a global room
    const roomId = request.params.roomId || "global-room";

    // TLDraw will add sessionId, but we can use clientId as a backup
    const sessionId =
      request.query.sessionId || request.query.clientId || crypto.randomUUID();
    const appUser = request.query.appUser || "anonymous";
    const storeId = request.query.storeId || "default-store";

    // Log detailed connection info for debugging
    app.log.info(
      {
        event: "websocket_connect",
        roomId,
        sessionId,
        appUser,
        storeId,
        url: request.url,
        headers: request.headers,
      },
      `WS Connect: user=${appUser} room=${roomId}`
    );

    try {
      const room = getOrCreateRoom(roomId);

      // Handle socket errors
      socket.on("error", (err) => {
        app.log.error(`WebSocket error in room ${roomId}: ${err}`);
      });

      // Handle socket close
      socket.on("close", (code, reason) => {
        app.log.info(
          `WS Disconnect: user=${appUser} room=${roomId} code=${code} reason=${
            reason || "No reason"
          }`
        );
      });

      // Handle socket messages for debugging
      socket.on("message", (data) => {
        app.log.debug(
          `WS Message from ${appUser} in ${roomId}: ${data.slice.length} bytes`
        );
      });

      // Process the connection with TLSocketRoom
      room.handleSocketConnect({
        sessionId,
        socket: socket,
      });
    } catch (err: any) {
      app.log.error(`Error in WS handler: ${err}`);
      socket.close(1011, `Server error: ${err.message}`);
    }
  }
);

// Start the server with proper error handling
const start = async () => {
  try {
    // Listen on all interfaces (0.0.0.0) to ensure it's accessible
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 sync-whiteboard server running on port ${PORT}`);

    // Log all routes for debugging
    console.log("Routes registered:");
    app._routes.forEach((route) => {
      console.log(`${route.method} ${route.url}`);
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
