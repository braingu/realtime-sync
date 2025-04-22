import { TLSocketRoom } from "@tldraw/sync-core";
import { whiteboardSchema } from "./schema";
import { TLRecord } from "@tldraw/tlschema";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";

// For file storage
const STORAGE_DIR = "./room-data";

// Create storage directory if it doesn't exist
mkdir(STORAGE_DIR, { recursive: true }).catch(console.error);

// Room state tracking
interface RoomState {
  room: TLSocketRoom<TLRecord, void>;
  id: string;
  needsPersist: boolean;
}

// In-memory map of active rooms
const rooms = new Map<string, RoomState>();

// Simple mutex to prevent race conditions
let mutex = Promise.resolve<null | Error>(null);

// Read room data from disk
async function readSnapshotIfExists(roomId: string) {
  try {
    const data = await readFile(join(STORAGE_DIR, `${roomId}.json`), "utf-8");
    console.log(`Room ${roomId} data loaded successfully`);
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.log(`No existing data found for room ${roomId}`);
      return undefined;
    }
    console.error(`Error loading room ${roomId}:`, error);
    throw error;
  }
}

// Save room data to disk
async function saveSnapshot(
  roomId: string,
  room: TLSocketRoom<TLRecord, void>
) {
  try {
    const snapshot = room.getCurrentSnapshot();
    await writeFile(
      join(STORAGE_DIR, `${roomId}.json`),
      JSON.stringify(snapshot)
    );
    console.log(`Room ${roomId} data saved successfully`);
  } catch (error) {
    console.error(`Failed to save room ${roomId}:`, error);
  }
}

// Get or create a room
export async function getOrCreateRoom(
  roomId: string
): Promise<TLSocketRoom<TLRecord, void>> {
  // Chain to existing promise to ensure sequential access
  mutex = mutex
    .then(async () => {
      // Check if room exists and is open
      if (rooms.has(roomId)) {
        const roomState = rooms.get(roomId)!;
        if (!roomState.room.isClosed()) {
          return null; // Room exists and is open
        }
      }

      console.log("Creating new room:", roomId);
      const initialSnapshot = await readSnapshotIfExists(roomId);

      // Create room state
      const roomState: RoomState = {
        needsPersist: false,
        id: roomId,
        room: new TLSocketRoom({
          schema: whiteboardSchema,
          initialSnapshot,
          log: {
            warn: console.warn,
            error: console.error,
          },
          onSessionRemoved(room, args) {
            console.log(
              `Session ${args.sessionId} removed from room ${roomId}`
            );
            if (args.numSessionsRemaining === 0) {
              console.log(`Last user left room ${roomId}, saving final state`);
              saveSnapshot(roomId, room);
              console.log("closing room", roomId);
              room.close();
            }
          },
          onDataChange() {
            roomState.needsPersist = true;
          },
        }),
      };

      rooms.set(roomId, roomState);
      return null;
    })
    .catch((error) => {
      // Return errors as values to avoid breaking the chain
      console.error(`Error in mutex chain for room ${roomId}:`, error);
      return error;
    });

  // Wait for the mutex operation to complete
  const err = await mutex;
  if (err) throw err;

  return rooms.get(roomId)!.room;
}

// Periodically save room data
setInterval(() => {
  for (const roomState of rooms.values()) {
    if (roomState.needsPersist) {
      roomState.needsPersist = false;
      console.log(`Saving snapshot for room ${roomState.id}`);
      saveSnapshot(roomState.id, roomState.room);
    }

    if (roomState.room.isClosed()) {
      console.log(`Deleting closed room ${roomState.id}`);
      rooms.delete(roomState.id);
    }
  }
}, 2000);
