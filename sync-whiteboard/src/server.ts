import fastify from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import { getOrCreateRoom } from "./rooms";
import { storeAsset, loadAsset } from "./assets";

const PORT = 5858;
const app = fastify({
  logger: {
    level: "debug",
  },
});

// Register the websocket plugin before defining routes
app.register(websocket);

// Configure CORS for both HTTP and WebSockets
app.register(cors, { origin: "*" });

// After registering plugins, define routes
app.register(async (app) => {
  // Health check endpoint
  app.get("/", async (request, reply) => {
    return {
      status: "sync-whiteboard is running",
      time: new Date().toISOString(),
    };
  });

  // Main WebSocket connection for tldraw sync - simplified to match reference
  app.get("/connect/:roomId", { websocket: true }, async (socket, req) => {
    // The roomId comes from the URL pathname
    const roomId = (req.params as any).roomId as string;

    // The sessionId is passed from the client as a query param
    const sessionId = (req.query as any)?.sessionId as string;

    // Here we make or get an existing instance of TLSocketRoom for the given roomId
    const room = await getOrCreateRoom(roomId);

    // and finally connect the socket to the room
    room.handleSocketConnect({ sessionId, socket });
  });

  // Allow all content types with no parsing for file uploads
  app.addContentTypeParser("*", (_, __, done) => done(null));

  // Asset endpoint for handling file uploads
  app.put("/assets/:id", async (req, reply) => {
    const id = (req.params as any).id as string;
    await storeAsset(id, req.raw);
    return { success: true };
  });

  // Asset endpoint for retrieving files
  app.get("/assets/:id", async (req, reply) => {
    const id = (req.params as any).id as string;
    const data = await loadAsset(id);
    reply.send(data);
  });
});

// Start the server
const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`sync-whiteboard server running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
