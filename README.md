# Emberslip

Share secrets through notes that burn after reading.

A note is encrypted in your browser before it leaves your device. The key lives in the part of
the link after `#`, which browsers never send to the server, so the server only ever stores
ciphertext. You choose how many times the link can be opened, how long it stays valid, and
whether a password is needed. Once the last view is used up or the time runs out, the note is
overwritten.

## Features

- **End-to-end encrypted notes** with AES-256-GCM. The key never reaches the server.
- **View limits and expiry**: 1–10 views; 5 minutes to 7 days.
- **Optional password.** It is checked before any ciphertext is released, and five wrong attempts
  burn the note.
- **Safe with link previews.** Nothing is consumed until the reader clicks _Reveal_.
- **Tombstones.** A burned note says when and why it burned, so a recipient can tell if someone
  else opened it first.
- **Request a secret.** Send someone a link they can use to send a secret back to you. Answers are
  encrypted with X-Wing (ML-KEM-768 + X25519), a post-quantum hybrid.
- **No accounts, cookies, analytics or third-party requests.** Fonts are self-hosted, and a strict
  Content Security Policy is in place.

See [SECURITY.md](SECURITY.md) for the protocol and threat model.

## Running your own instance

### With Docker Compose

```sh
cp .env.example .env   # set DOMAIN, IMPRINT and optionally SOURCE_URL
docker compose up -d --build
```

This starts Emberslip behind [Caddy](https://caddyserver.com), which obtains TLS certificates
automatically. The SQLite database lives in the `emberslip-data` volume.

### Without Docker

Requires Node.js 24 or newer.

```sh
npm ci
npm run build
DB_PATH=/var/lib/emberslip/emberslip.db ORIGIN=https://emberslip.example.com node server.js
```

Run it behind a reverse proxy that terminates TLS, and don't enable access logs for it.

### Configuration

| Variable                      | Default             | Description                                                                   |
| ----------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| `PORT`, `HOST`                | `3000`, `0.0.0.0`   | Where the server listens.                                                     |
| `ORIGIN`                      |                     | Public URL, e.g. `https://emberslip.example.com`. Needed behind a proxy.      |
| `ADDRESS_HEADER`, `XFF_DEPTH` |                     | Where to read client IPs from behind a proxy, e.g. `X-Forwarded-For` and `1`. |
| `DB_PATH`                     | `data/emberslip.db` | SQLite database file.                                                         |
| `MAX_DB_BYTES`                | `1073741824`        | New notes are refused once the database reaches this size.                    |
| `MAX_VIEWS`                   | `10`                | Highest view limit a note can have.                                           |
| `MIN_TTL_SECONDS`             | `300`               | Shortest allowed lifetime.                                                    |
| `MAX_TTL_SECONDS`             | `604800`            | Longest allowed lifetime, also how long an answer waits to be read.           |
| `MAX_PASSWORD_ATTEMPTS`       | `5`                 | Wrong passwords before a note burns.                                          |
| `TOMBSTONE_SECONDS`           | `2592000`           | How long the "burned at" record is kept.                                      |
| `RATE_LIMIT_CREATE_PER_HOUR`  | `30`                | Notes, requests and answers one client may create per hour. `0` disables.     |
| `RATE_LIMIT_READ_PER_MINUTE`  | `30`                | Reads per client and minute. `0` disables.                                    |
| `IMPRINT`                     |                     | Operator details shown on `/imprint`. Use `\n` for line breaks.               |
| `SOURCE_URL`                  | this repository     | Link to the source of the version you run.                                    |

Don't back up the database. Notes are meant to disappear, and a backup would keep them around.

## Development

```sh
npm install
npm run dev
```

```sh
npm run check                     # types
npm run lint                      # formatting and lint
npm run test:unit -- --run        # unit tests
npx playwright install chromium   # once
npm run test:e2e                  # end-to-end tests against a production build
```

## License

[AGPL-3.0](LICENSE). If you run a modified version for others, you have to offer them its
source code.
