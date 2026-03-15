import debug from 'debug';

import type {
  PlatformWebhookResolver,
  PlatformWebhookResolverContext,
  RegisteredBotProviderConfig,
} from '../../types';

const log = debug('bot-platform:discord:webhook');

/**
 * Discord webhook resolver implements the three-layer lookup strategy:
 *
 * 1. Gateway token header (`x-discord-gateway-token`) — forwarded from gateway worker
 * 2. Interaction payload `application_id` — HTTP interactions
 * 3. Fallback: return first registered Discord bot for signature trial
 */
export const discordWebhookResolver: PlatformWebhookResolver = async (
  context: PlatformWebhookResolverContext,
): Promise<RegisteredBotProviderConfig | undefined> => {
  const { request, registeredBots } = context;

  log('resolveWebhook: method=%s, registered=%d', request.method, registeredBots.length);

  // Layer 1: Gateway event forwarding via token header
  const gatewayToken = request.headers.get('x-discord-gateway-token');
  if (gatewayToken) {
    const match = registeredBots.find((rb) => rb.config.credentials.botToken === gatewayToken);
    if (match) return match;

    log('No matching bot for gateway token');
    return undefined;
  }

  // Layer 2: HTTP Interactions — route by applicationId in payload
  try {
    const cloned = request.clone();
    const payload = await cloned.json();
    const appId = payload.application_id;

    if (appId) {
      const match = registeredBots.find((rb) => rb.config.applicationId === appId);
      if (match) return match;
    }
  } catch {
    // Not valid JSON — fall through
  }

  // Layer 3: Fallback — return first registered bot (server will try signature validation)
  return registeredBots[0];
};
