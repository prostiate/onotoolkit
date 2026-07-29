/** Triggers a client-side download of in-memory text. Nothing is uploaded. */
export function useDownload() {
  function download(text: string, fileName: string, mime = "text/plain"): void {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return { download };
}
