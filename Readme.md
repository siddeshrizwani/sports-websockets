# Sports — Live Match Backend

Real-time backend for a sports dashboard. Matches and commentary get created through a normal REST API, and the moment something happens (a new match, a goal, a commentary update), it gets pushed out over WebSockets to whoever's watching — no polling, no refresh.

Built this to actually understand WebSockets at the protocol level instead of just dropping in Socket.IO, so it's using the raw `ws` library for the real-time layer.

## Why REST + WebSockets together

REST handles anything that needs to be a command or needs persistence — creating a match, fetching the match list on page load. WebSockets only handle the live stuff — score updates, commentary as it happens. If you try to do everything over WebSockets you basically end up reinventing REST, just worse. So the split is:

- `POST /matches` creates a match → gets saved to Postgres → then broadcast to everyone connected
- `POST /matches/:id/commentary` adds a commentary event → saved → broadcast only to clients subscribed to that specific match

That second part matters a lot once you have more than a handful of users. You don't want someone watching a cricket match getting flooded with football commentary from a match they don't care about. So clients subscribe/unsubscribe to specific match IDs, and the server keeps a map of who's listening to what.

## Stack

- Node + Express
- `ws` for the WebSocket server (attached to the same HTTP server as Express, one port for both)
- Postgres (Neon) + Drizzle ORM
- Zod for request validation
- ArcJet for rate limiting / bot detection on both the REST routes and the WS handshake
- Site24/7 for APM once it's deployed
- Deployed on Hostinger (needed an always-on Node runtime since WebSocket connections stay open for hours, which rules out most serverless setups)

## How the WebSocket side works

Connection lifecycle:

1. Client connects to `/ws`, gets a `welcome` message back
2. Server pings every client periodically and expects a pong back — if it doesn't hear one, it kills the connection. Stops dead/ghost connections from piling up in memory
3. Client sends `{ type: "subscribe", matchId: 1 }` to join a match's live feed, `{ type: "unsubscribe", matchId: 1 }` to leave
4. Server tracks subscriptions in a `Map<matchId, Set<socket>>`
5. On disconnect, the server cleans up all of that socket's subscriptions automatically

Message types sent by the server:

```
{ type: "welcome" }
{ type: "subscribed", matchId }
{ type: "unsubscribed", matchId }
{ type: "match created", data }      // sent to everyone
{ type: "commentary", data }         // sent only to subscribers of that match
{ type: "error", message }
```

## REST endpoints

```
GET  /matches                     list matches, newest first (limit query param, max 100)
POST /matches                     create a match

GET  /matches/:id/commentary      list commentary for a match, newest first
POST /matches/:id/commentary      add a commentary event, triggers a broadcast
```

Request bodies are validated with Zod — check `source/validation/` for the exact shapes.

## Database

Two tables, kept intentionally simple:

- **matches** — sport, home/away team, status (scheduled/live/finished), scores, start/end time. Status gets derived from start/end time rather than manually set.
- **commentary** — tied to a match by ID, has minute, sequence, period, event type, who did it, a message, and a `metadata` JSON column for anything sport-specific (assists, distance, whatever) so the schema doesn't need a new column every time a new sport gets added.

## Running it locally

```bash
npm install
cp .env.example .env   # fill in your own values
npm run db:generate
npm run db:migrate
npm run dev
```

`.env` needs:

```
DATABASE_URL=
PORT=8000
HOST=0.0.0.0
ARCJET_KEY=
ARCJET_ENV=development
API_URL=http://localhost:8000
```

## Testing the socket manually

`wscat` is the easiest way to poke at this without a frontend:

```bash
npm install -g wscat
wscat -c ws://localhost:8000/ws
```

Then subscribe to a match:

```json
{"type":"subscribe","matchId":1}
```

Open a second `wscat` window that doesn't subscribe to anything, hit the commentary POST endpoint for match 1 through Postman/HTTPie, and only the subscribed window should get the update. That's basically the whole point of the pub/sub layer working correctly.

## Security

ArcJet sits in front of both the REST routes and the WS upgrade handshake — shield rules, bot detection (search engine crawlers allowlisted), and rate limiting. The WS handshake uses a tighter rate-limit window than the REST routes since a connection spam attempt looks different from normal API abuse.

## Folder structure

```
source/
  index.js              Express + HTTP server, wires up the WS server
  arcjet.js              ArcJet rules for HTTP and WS
  db/
    db.js
    schema.js
  routes/
    matches.js
    commentary.js
  validation/
    matches.js
    commentary.js
  utils/
    match-status.js
  ws/
    server.js            connection handling, heartbeat, pub/sub, broadcasting
  seed/
    seed.js               dumps a bunch of test commentary events in for load testing
```

## Notes

This is the backend only — no frontend included here. Load-tested with ~1000 seeded commentary events across multiple matches to make sure the subscription filtering actually holds up and doesn't leak data between matches...
