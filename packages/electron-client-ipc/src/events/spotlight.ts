export interface SpotlightBroadcastEvents {
  /**
   * Ask spotlight renderer to focus the input box.
   */
  spotlightFocus: () => void;

  /**
   * Cross-window data sync notification.
   * Receiving windows should revalidate the specified SWR cache keys.
   */
  syncData: (data: { keys: string[]; source: string }) => void;
}
