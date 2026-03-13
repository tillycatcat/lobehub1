import { createQQAdapter, QQApiClient } from '@lobechat/adapter-qq';
import type { PlatformDescriptor, PlatformMessenger } from '@lobechat/bot-platform-core';

/**
 * Extract the target ID from a QQ platformThreadId.
 *
 * QQ thread ID format: "qq:<type>:<id>" or "qq:<type>:<id>:<guildId>"
 * Returns the <id> portion used for sending messages.
 */
function extractChatId(platformThreadId: string): string {
  return platformThreadId.split(':')[2];
}

/**
 * Extract the thread type (group, guild, c2c, dms) from a QQ platformThreadId.
 */
function extractThreadType(platformThreadId: string): string {
  return platformThreadId.split(':')[1] || 'group';
}

async function sendQQMessage(
  api: QQApiClient,
  threadType: string,
  targetId: string,
  content: string,
): Promise<void> {
  switch (threadType) {
    case 'group': {
      await api.sendGroupMessage(targetId, content);
      return;
    }
    case 'guild': {
      await api.sendGuildMessage(targetId, content);
      return;
    }
    case 'c2c': {
      await api.sendC2CMessage(targetId, content);
      return;
    }
    case 'dms': {
      await api.sendDmsMessage(targetId, content);
      return;
    }
    default: {
      await api.sendGroupMessage(targetId, content);
    }
  }
}

function createQQMessenger(
  api: QQApiClient,
  targetId: string,
  threadType: string,
): PlatformMessenger {
  return {
    createMessage: (content) => sendQQMessage(api, threadType, targetId, content),
    editMessage: (_messageId, content) =>
      // QQ does not support editing — send a new message as fallback
      sendQQMessage(api, threadType, targetId, content),
    // QQ Bot API doesn't support reactions or typing
    removeReaction: () => Promise.resolve(),
    triggerTyping: () => Promise.resolve(),
  };
}

export const qqDescriptor: PlatformDescriptor = {
  extractChatId,
  parseMessageId: (compositeId) => compositeId,

  createMessenger(credentials, platformThreadId) {
    const api = new QQApiClient(credentials.appId, credentials.appSecret);
    const targetId = extractChatId(platformThreadId);
    const threadType = extractThreadType(platformThreadId);
    return createQQMessenger(api, targetId, threadType);
  },

  createAdapter(credentials) {
    return {
      qq: createQQAdapter({
        appId: credentials.appId,
        clientSecret: credentials.appSecret,
      }),
    };
  },
};
