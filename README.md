# Emberslip

Share secrets through notes that burn after reading.

A note is encrypted in your browser before it leaves your device. The key lives in the
part of the link after `#`, which browsers never send to the server, so the server only
ever stores ciphertext. You choose how many times the link can be opened, how long it
stays valid, and whether a password is needed.

## Development

Requires Node.js 24 or newer.

```sh
npm install
npm run dev
```

Tests:

```sh
npm run test:unit -- --run
npx playwright install chromium   # once
npm run test:e2e
```

## License

[AGPL-3.0](LICENSE)
