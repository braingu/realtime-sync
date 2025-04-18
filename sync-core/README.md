# sync-core

A minimal, reusable WebSocket room engine for real-time document collaboration.

## Features

- Lightweight room/session management over WebSockets
- Lifecycle hooks (`onJoin`, `onLeave`, `onMessage`, `onBroadcast`, `onPresenceUpdate`)
- Built-in presence system for user cursors, names, tools, etc.
- Framework-agnostic, plug into any Node or browser WebSocket implementation
- Modular design, reusable across real-time whiteboards, map overlays, editors, etc.

## Installation

```bash
npm install sync-core
```

If you're developing locally and using this in a sibling repo, see the development section below.

## Usage

```ts
import { SyncRoom } from "sync-core";

const room = new SyncRoom({ id: "my-room" });

room.connect("session-123", {
  send: (message) => socket.send(message),
  onMessage: (handleMessage) =>
    socket.on("message", (message) => handleMessage(message.toString())),
  onClose: (handleClose) => socket.on("close", handleClose),
});
```

You can also provide optional lifecycle hooks for greater control:

```ts
const room = new SyncRoom({
  id: "shared-doc",
  hooks: {
    onJoin: (sessionId) => console.log(`🔗 ${sessionId} joined`),
    onLeave: (sessionId) => console.log(`❌ ${sessionId} left`),
    onMessage: (sessionId, message) => sanitize(message),
    onBroadcast: (fromSessionId, toSessionId, message) =>
      audit(fromSessionId, toSessionId, message),
    onPresenceUpdate: (sessionId, presenceData) =>
      console.log(`📡 ${sessionId} updated presence:`, presenceData),
  },
});
```

### Presence API

```ts
// Set/update presence data for a session
room.updatePresence("session-123", { name: "Alice", cursor: [100, 200] });

// Retrieve presence for a specific session
const presence = room.getPresence("session-123");

// Get all presence data in the room
const allPresence = room.getAllPresence();
```

## Development

To use `sync-core` in a local sibling project during development:

### Option 1: Use `npm link`

```bash
# In sync-core (once)
npm link

# In the consumer project (e.g., sync-whiteboard)
npm link sync-core
```

This creates a symlink from your global npm folder to your local project so it stays in sync as you develop.

### Option 2: Use a relative file path

In your consumer project's `package.json`:

```json
{
  "dependencies": {
    "sync-core": "file:../sync-core"
  }
}
```

Then install with:

```bash
npm install
```

## License

MIT © 2025 BrainGu
