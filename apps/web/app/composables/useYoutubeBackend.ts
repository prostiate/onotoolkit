import type { DownloadParams, DownloadResult, YoutubeVideoInfo } from "~/types/youtube";
import { defaultDownloadName, parseContentDispositionFilename } from "~/utils/youtube";

/**
 * Client for the YouTube Downloader. It calls the app's own same-origin proxy
 * routes (`/api/yt/*`), which run in the Nitro server and forward signed
 * requests to the private backend. The browser never sees the backend URL or
 * any secret.
 */
export function useYoutubeBackend() {
  async function readError(res: Response, fallback: string): Promise<string> {
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) return data.error;
    } catch {
      /* response body was not JSON */
    }
    return fallback;
  }

  async function fetchInfo(url: string): Promise<YoutubeVideoInfo> {
    const res = await fetch(`/api/yt/info?url=${encodeURIComponent(url)}`, {
      headers: { Accept: "application/json" }
    });
    if (!res.ok) throw new Error(await readError(res, "Could not fetch video details."));
    return (await res.json()) as YoutubeVideoInfo;
  }

  async function fetchDownload(
    params: DownloadParams,
    turnstileToken = ""
  ): Promise<DownloadResult> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (turnstileToken) headers["cf-turnstile-response"] = turnstileToken;
    const res = await fetch(`/api/yt/download`, {
      method: "POST",
      headers,
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error(await readError(res, "The download failed."));
    const blob = await res.blob();
    const filename =
      parseContentDispositionFilename(res.headers.get("Content-Disposition")) ??
      defaultDownloadName("youtube", params.mode);
    return { blob, filename };
  }

  /** Triggers a browser download of an in-memory blob. Nothing is re-uploaded. */
  function saveBlob(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  return { fetchInfo, fetchDownload, saveBlob };
}
