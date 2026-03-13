import { createTelegramAdapter } from '@chat-adapter/telegram';
import type { PlatformDescriptor, PlatformMessenger } from '@lobechat/bot-platform-core';
import debug from 'debug';

import { TELEGRAM_API_BASE, TelegramPlatformClient } from './client';

const log = debug('bot-platform:telegram:descriptor');

/**
 * Extract the bot user ID from a Telegram bot token.
 * Telegram bot tokens have the format: `<bot_id>:<secret>`.
 */
export function extractBotId(botToken: string): string {
  const colonIndex = botToken.indexOf(':');
  if (colonIndex === -1) return botToken;
  return botToken.slice(0, colonIndex);
}

/**
 * Call Telegram setWebhook API. Idempotent — safe to call on every startup.
 */
export async function setTelegramWebhook(
  botToken: string,
  url: string,
  secretToken?: string,
): Promise<void> {
  const params: Record<string, string> = { url };
  if (secretToken) {
    params.secret_token = secretToken;
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/setWebhook`, {
    body: JSON.stringify(params),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to set Telegram webhook: ${response.status} ${text}`);
  }
}

function extractChatId(platformThreadId: string): string {
  return platformThreadId.split(':')[1];
}

function parseTelegramMessageId(compositeId: string): number {
  const colonIdx = compositeId.lastIndexOf(':');
  return colonIdx !== -1 ? Number(compositeId.slice(colonIdx + 1)) : Number(compositeId);
}

function createTelegramMessenger(
  telegram: TelegramPlatformClient,
  chatId: string,
): PlatformMessenger {
  return {
    createMessage: (content) => telegram.sendMessage(chatId, content).then(() => {}),
    editMessage: (messageId, content) =>
      telegram.editMessageText(chatId, parseTelegramMessageId(messageId), content),
    removeReaction: (messageId) =>
      telegram.removeMessageReaction(chatId, parseTelegramMessageId(messageId)),
    triggerTyping: () => telegram.sendChatAction(chatId, 'typing'),
  };
}

export const telegramDescriptor: PlatformDescriptor = {
  extractChatId,
  parseMessageId: parseTelegramMessageId,

  createMessenger(credentials, platformThreadId) {
    const telegram = new TelegramPlatformClient(credentials.botToken);
    const chatId = extractChatId(platformThreadId);
    return createTelegramMessenger(telegram, chatId);
  },

  createAdapter(credentials) {
    return {
      telegram: createTelegramAdapter({
        botToken: credentials.botToken,
        secretToken: credentials.secretToken,
      }),
    };
  },

  async onBotRegistered({ applicationId, credentials }) {
    // appUrl is not available here — the server-side bot factory handles webhook registration
    // This hook is called by BotMessageRouter during initialization
    log('Telegram bot registered: appId=%s', applicationId);
  },
};
