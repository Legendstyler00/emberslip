import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const port = 4173;

export default defineConfig({
	testDir: 'tests',
	testMatch: '**/*.e2e.ts',
	use: { baseURL: `http://localhost:${port}` },
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	// Test against the production build and server, so headers and CSP are the real ones.
	webServer: {
		command: 'npm run build && node server.js',
		port,
		env: {
			...process.env,
			PORT: String(port),
			DB_PATH: join(tmpdir(), `emberslip-e2e-${Date.now()}.db`),
			RATE_LIMIT_CREATE_PER_HOUR: '0',
			RATE_LIMIT_READ_PER_MINUTE: '0'
		} as Record<string, string>
	}
});
