import { createDiscordAdapter } from '@chat-adapter/discord';
import type { PlatformDescriptor, PlatformMessenger } from '@lobechat/bot-platform-core';

import { DiscordPlatformClient } from './client';

function extractChannelId(platformThreadId: string): string {
  const parts = platformThreadId.split(':');
  return parts[3] || parts[2];
}

function createDiscordMessenger(
  discord: DiscordPlatformClient,
  channelId: string,
  platformThreadId: string,
): PlatformMessenger {
  return {
    createMessage: (content) => discord.createMessage(channelId, content).then(() => {}),
    editMessage: (messageId, content) => discord.editMessage(channelId, messageId, content),
    removeReaction: (messageId, emoji) => discord.removeOwnReaction(channelId, messageId, emoji),
    triggerTyping: () => discord.triggerTyping(channelId),
    updateThreadName: (name) => {
      const threadId = platformThreadId.split(':')[3];
      return threadId ? discord.updateChannelName(threadId, name) : Promise.resolve();
    },
  };
}

export const discordDescriptor: PlatformDescriptor = {
  extractChatId: extractChannelId,
  parseMessageId: (compositeId) => compositeId,

  createMessenger(credentials, platformThreadId) {
    const discord = new DiscordPlatformClient(credentials.botToken);
    const channelId = extractChannelId(platformThreadId);
    return createDiscordMessenger(discord, channelId, platformThreadId);
  },

  createAdapter(credentials, applicationId) {
    return {
      discord: createDiscordAdapter({
        applicationId,
        botToken: credentials.botToken,
        publicKey: credentials.publicKey,
      }),
    };
  },

  async onBotRegistered({ credentials, registerByToken }) {
    if (credentials.botToken && registerByToken) {
      registerByToken(credentials.botToken);
    }
  },
};
