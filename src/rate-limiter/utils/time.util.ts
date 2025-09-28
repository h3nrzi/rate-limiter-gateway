export class TimeUtil {
  static parseTimeWindow(window: string): number {
    const match = window.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(
        `Invalid time window format: ${window}. Use format like '1m', '1h', '1d'.`,
      );
    }

    const [, amount, unit] = match;
    const multipliers = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 60 * 60 * 24,
    };

    return parseInt(amount) * multipliers[unit as keyof typeof multipliers];
  }

  static getWindowStartTime(
    windowSeconds: number,
    algorithm: "fixed" | "sliding" = "fixed",
  ): number {
    const now = Math.floor(Date.now() / 1000);

    if (algorithm === "fixed") {
      // Fixed window: align to window boundaries
      return Math.floor(now / windowSeconds) * windowSeconds;
    } else {
      // sliding window: just return current time
      return now;
    }
  }
}
