import { LiveQlooClient, DEFAULT_BASE_URL } from './live.js';
import { MockQlooClient } from './mock.js';

/** Live client when QLOO_API_KEY is set (and QLOO_FORCE_MOCK is not), otherwise the labelled mock. */
export function createClient(env = process.env) {
  if (env.QLOO_API_KEY && env.QLOO_FORCE_MOCK !== '1') {
    return new LiveQlooClient({ apiKey: env.QLOO_API_KEY, baseUrl: env.QLOO_BASE_URL || DEFAULT_BASE_URL });
  }
  return new MockQlooClient();
}
