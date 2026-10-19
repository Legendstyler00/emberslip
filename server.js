// Production entry point. Wraps the adapter-node handler so that security headers are also
// sent with static files, which adapter-node serves before SvelteKit's hooks run.
import { createServer } from 'node:http';
import { handler } from './build/handler.js';

const securityHeaders = {
	// Pages get a full policy from SvelteKit, which replaces this one. Everything else
	// (JSON, fonts, scripts) never needs to load anything.
	'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
	'strict-transport-security': 'max-age=63072000; includeSubDomains',
	'x-content-type-options': 'nosniff',
	'x-frame-options': 'DENY',
	'referrer-policy': 'no-referrer',
	'permissions-policy':
		'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
	'cross-origin-opener-policy': 'same-origin',
	'cross-origin-resource-policy': 'same-origin',
	'x-robots-tag': 'noindex, nofollow'
};

const server = createServer((req, res) => {
	for (const [name, value] of Object.entries(securityHeaders)) res.setHeader(name, value);
	handler(req, res, () => {
		res.statusCode = 404;
		res.end('Not found');
	});
});

const host = process.env.HOST ?? '0.0.0.0';
const port = Number(process.env.PORT ?? 3000);

server.listen(port, host, () => {
	console.log(`Listening on http://${host}:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
	process.on(signal, () => {
		server.close(() => process.exit(0));
		server.closeIdleConnections();
		setTimeout(() => process.exit(0), 10_000).unref();
	});
}
