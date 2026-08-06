// Ambient types for the Cloudflare Turnstile browser API (loaded via script tag).
export {};

interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  size?: "normal" | "compact" | "flexible" | "invisible";
  theme?: "auto" | "light" | "dark";
  appearance?: "always" | "execute" | "interaction-only";
}

interface TurnstileApi {
  render(element: HTMLElement | string, options: TurnstileRenderOptions): string;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
  getResponse(widgetId?: string): string | undefined;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
