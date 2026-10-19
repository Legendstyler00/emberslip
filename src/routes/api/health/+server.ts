import { reply } from '#lib/server/http.ts';
import { database } from '#lib/server/services.ts';

export function GET() {
	database().prepare('SELECT 1').get();
	return reply({ ok: true });
}
