import type { OpenNextConfig } from "@opennextjs/cloudflare";

/**
 * See https://opennext.js.org/cloudflare/config for more details
 */
export default {
  default: {
    runtime: "edge",
  },
} satisfies OpenNextConfig;
