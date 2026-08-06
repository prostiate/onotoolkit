/** Media the user can request from the download backend. */
export type DownloadMode = "video" | "audio";

/** Trimmed video metadata returned by the backend's GET /api/info. */
export interface YoutubeVideoInfo {
  id: string;
  title: string;
  /** Duration in seconds. */
  duration: number;
  thumbnail: string;
  uploader: string;
  /** Distinct video resolutions available, highest first. */
  heights: number[];
  hasAudio: boolean;
}

/** Body sent to the backend's POST /api/download. */
export interface DownloadParams {
  url: string;
  mode: DownloadMode;
  /** Max video height in pixels; 0 means best available. Ignored for audio. */
  quality: number;
}

/** A downloaded file plus the filename the backend suggested. */
export interface DownloadResult {
  blob: Blob;
  filename: string;
}
