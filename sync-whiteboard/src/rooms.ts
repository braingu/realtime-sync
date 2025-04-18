//sync-whiteboard/rooms.ts
import { TLSocketRoom } from "@tldraw/sync-core";
import { whiteboardSchema } from "./schema";
import { TLRecord } from "@tldraw/tlschema";

const rooms: Record<string, TLSocketRoom<TLRecord, void>> = {};

export function getOrCreateRoom(roomId: string): TLSocketRoom<TLRecord, void> {
  if (!rooms[roomId]) {
    rooms[roomId] = new TLSocketRoom({ schema: whiteboardSchema });
  }
  return rooms[roomId];
}
