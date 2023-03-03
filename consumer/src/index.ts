/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
}

export default {
	async queue(
		batch: MessageBatch<Error>,
		env: Env
	): Promise<void> {
		let messages = JSON.stringify(batch.messages);
		console.log(messages);
	},
};