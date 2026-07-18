# Purpose

The Remult PartyServer realtime engine for scintilla-chat. Provides client-side
connection pooling (`RemultPartySubscriptionClient`), server-side Durable Object request
delegation (`RemultPartySubscriptionServer`), and stateful Durable Object room implementations
(`RemultPartyRoom`, `RemultLiveQueryStorageRoom`) for scalable real-time synchronization across
a Cloudflare Worker backend.

# Local Contracts

- **Modularity**: Split into client-safe (`client.ts`), server-safe (`server.ts`, `storage.ts`),
  and Cloudflare-only DO files (`remult-party-room.ts`, `live-query-storage-room.ts`).
  `durable-object.ts` re-exports both DO classes for the worker entry. Client-safe files
  (`client.ts`, `channel.ts`, and client-facing `index.ts` exports) must never import `partyserver`
  or `cloudflare:workers` so the SvelteKit Node.js build stays free of edge-only code.
- **Protocol compatibility**: Messages follow the `RemultPartyMessage` protocol, supporting
  `remult:subscribe` / `remult:unsubscribe` (and the older `subscribe` / `unsubscribe`) plus
  `data`, `signal`, `connected`, `error`, and `ping`.
- **Shared Channel Routing**: Channel-to-room resolution lives in `channel.ts`
  (`resolveRoomIdFromChannel`). The client, server publisher, and Durable Object validation all use
  the same default resolver or an intentional backend override built from it.
- **State Persistence**: `RemultLiveQueryStorageRoom` uses transactional `this.state.storage.sql`
  instead of in-memory collections to survive runtime eviction.
- **State Mutation Protection**: Connection state is cloned (`connection.setState({ ...state })`)
  instead of mutated in place to trigger runtime updates.
- **Edge Heartbeat & Auto-Response**: Client pools send a raw `'ping'` string every 50s. The room
  DO uses `setWebSocketAutoResponse` with `WebSocketRequestResponsePair` to reply at the Edge node
  without waking the DO isolate.
- **App-owned Policy Layer**: Package defaults stay generic. Tenant/client-specific room sharing or
  dedication policy belongs in the consuming backend via `RemultPartyServerOptions`, not hardcoded
  here.

# Work Guidance

1. Keep client-safe files free of imports from `partyserver` or `cloudflare:workers`.
2. Use `.js` import extensions in all source files so `tsc` emits resolvable ESM.
3. Do not introduce breaking protocol changes to ensure backward compatibility with standard WebSockets.

# Verification

- **Lint & Type**: `bun run check` (biome) and `bun run build` (tsc) must pass.
