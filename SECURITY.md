# Security

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
(the "Report a vulnerability" button on the Security tab), not in public issues.

## Threat model

Emberslip aims to keep a secret confidential between the person who creates a note and the
person who reads it, even against the server it passes through.

**Protected against**

- An attacker who obtains the database, now or later. It contains only ciphertext and hashes of
  access tokens, and the keys needed to decrypt never reach the server.
- An attacker who reads server or proxy logs. Request paths don't identify notes; the key and
  the identifying tokens are only in the URL fragment or request bodies.
- Link-preview bots and email scanners that fetch URLs. Fetching a page consumes nothing.
- Someone holding the link but not the password. The server releases no ciphertext without a
  token derived from the password, so they can't attack it offline, and five wrong guesses burn
  the note.
- "Harvest now, decrypt later" attacks by future quantum computers. Notes use only symmetric
  primitives with 256-bit keys, and requests use the X-Wing post-quantum hybrid KEM.

**Not protected against**

- A compromised device on either end.
- The recipient passing the secret on.
- Interception of the link before the intended recipient opens it. The tombstone makes it
  visible, but can't undo it. Passwords sent through a second channel help.
- A malicious or compromised server operator who serves modified JavaScript. Like any web-based
  end-to-end encryption, Emberslip relies on the code the server delivers. Run your own instance
  if you can't trust the operator.

## Protocol

All derivations use HKDF-SHA256 with `info` labels prefixed `emberslip/v1/`. Binary values are
base64url-encoded.

### Notes

1. The browser generates a random 32-byte key `K`. The link is `/n#base64url(K)`.
2. `linkToken = HKDF(K, "emberslip/v1/link")`. The server stores `SHA-256(linkToken)` as the
   note's id.
3. Without a password, `encKey = HKDF(K, "emberslip/v1/enc")`.
4. With a password, `PK = PBKDF2-SHA256(NFC(password), salt, 600000)` with a random 16-byte salt.
   Then `encKey = HKDF(K, salt = PK, "emberslip/v1/enc")` and
   `pwToken = HKDF(K, salt = PK, "emberslip/v1/pw")`. The server stores `SHA-256(pwToken)` and
   only releases the ciphertext to a matching `pwToken`.
5. The plaintext `{"v":1,"text":…}` gets a 4-byte length prefix and is zero-padded to the next
   power of two of at least 1 KiB, then encrypted with AES-256-GCM using a random 96-bit IV. The
   additional data binds the password settings, so a server can't swap them unnoticed.
6. Opening a note checks expiry and password, decrements the view count, and burns the note on
   its last view, all in one transaction.

### Status links

Status links are opt-in. Without one, a note stores no open times.

1. The browser generates a second random 32-byte key `M`, independent of `K`. The status link is
   `/manage#base64url(M)`.
2. `manageToken = HKDF(M, "emberslip/v1/manage")`. The server stores `SHA-256(manageToken)` with
   the note.
3. Each successful open appends its time, rounded down to the minute, to the note. Nothing about
   the reader is stored.
4. With `manageToken`, anyone can see views left, expiry, open times and the number of wrong
   password attempts, and can burn the note. It can't decrypt the note, and the note link can't be
   used as a status link.
5. Open times are deleted with the tombstone.

### Requests

1. The requester's browser generates a 32-byte `seed` and a 32-byte `shareSecret`. The X-Wing key
   pair is derived from `seed`.
2. The share link is `/r#base64url(shareSecret)`. The private inbox link is `/inbox#base64url(seed)`.
3. The public key and optional message are encrypted with
   `HKDF(shareSecret, "emberslip/v1/request/seal")` and stored on the server. Without
   `shareSecret`, the server can't read them or substitute its own public key.
4. The responder encapsulates to the public key and encrypts the answer with
   `HKDF(sharedSecret, "emberslip/v1/request/answer")`. A request accepts one answer.
5. The requester decapsulates with the key pair from `seed`. The answer burns once it has been read.

## Operational notes

- SQLite runs with `secure_delete` on, and the write-ahead log is checkpointed and truncated
  every minute, so burned content doesn't linger in free pages or the WAL.
- Don't back up the database or take filesystem snapshots of it.
- Don't enable access logs in the reverse proxy.
- The application keeps client IP addresses only in memory, as keyed hashes, for rate limiting.
