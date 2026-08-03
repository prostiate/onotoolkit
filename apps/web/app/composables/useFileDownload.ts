/** Triggers a client-side download of in-memory bytes. Nothing is uploaded. */
export function useFileDownload() {
  function triggerDownload(url: string, fileName: string): void {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function download(bytes: Uint8Array, fileName: string, mimeType = "application/pdf"): void {
    const view = new Uint8Array(bytes.byteLength);
    view.set(bytes);
    const blob = new Blob([view], { type: mimeType });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, fileName);

    // Revoke on the next tick so the download has a chance to start.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  /** Downloads an existing Blob (e.g. an encoded image) without a copy. */
  function downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    triggerDownload(url, fileName);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return { download, downloadBlob };
}
