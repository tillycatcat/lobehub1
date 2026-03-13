import { createLarkAdapter, LarkApiClient } from '@lobechat/adapter-lark';
import type { PlatformDescriptor, PlatformMessenger } from '@lobechat/bot-platform-core';

function extractChatId(platformThreadId: string): string {
  return platformThreadId.split(':')[1];
}

function createLarkMessenger(api: LarkApiClient, chatId: string): PlatformMessenger {
  return {
    createMessage: (content) => api.sendMessage(chatId, content).then(() => {}),
    editMessage: (messageId, content) => api.editMessage(messageId, content).then(() => {}),
    removeReaction: () => Promise.resolve(),
    triggerTyping: () => Promise.resolve(),
  };
}

export function createLarkDescriptorForPlatform(platform: 'lark' | 'feishu'): PlatformDescriptor {
  return {
    extractChatId,
    parseMessageId: (compositeId) => compositeId,

    createMessenger(credentials, platformThreadId) {
      const lark = new LarkApiClient(credentials.appId, credentials.appSecret, platform);
      const chatId = extractChatId(platformThreadId);
      return createLarkMessenger(lark, chatId);
    },

    createAdapter(credentials) {
      return {
        [platform]: createLarkAdapter({
          appId: credentials.appId,
          appSecret: credentials.appSecret,
          encryptKey: credentials.encryptKey,
          platform,
          verificationToken: credentials.verificationToken,
        }),
      };
    },
  };
}

export const larkDescriptor = createLarkDescriptorForPlatform('lark');
export const feishuDescriptor = createLarkDescriptorForPlatform('feishu');
