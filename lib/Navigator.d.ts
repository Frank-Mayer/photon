/**
 * @experimental
 */
export interface INavigator extends Navigator {
  /**
   * @experimental
   */
  connection: {
    downLink: number;
    downlinkMax: number;
    effectiveType: "slow-2g" | "2g" | "3g" | "4g";
    rtt: number;
    saveData: boolean;
    type:
      | "bluetooth"
      | "cellular"
      | "ethernet"
      | "none"
      | "wifi"
      | "wimax"
      | "other"
      | "unknown";
  };
}
