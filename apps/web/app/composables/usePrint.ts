import { buildPrintDocument } from "~/utils/print";

/**
 * Opens the browser print dialog for a chunk of body HTML (user chooses "Save as
 * PDF"). Uses an isolated hidden iframe so app styles never leak in and no popup
 * is blocked - vector output, real text, print-CSS pagination. Shared by the
 * Markdown, HTML->PDF, and Word->PDF tools. Client-only.
 */
export function usePrint() {
  async function printHtml(bodyHtml: string, title = "Document"): Promise<void> {
    const doc = buildPrintDocument(bodyHtml, title);

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (!frameDoc) {
      iframe.remove();
      throw new Error("Unable to open the print view.");
    }

    frameDoc.open();
    frameDoc.write(doc);
    frameDoc.close();

    await new Promise<void>((resolve) => {
      const done = (): void => {
        const frameWindow = iframe.contentWindow;
        if (frameWindow) {
          frameWindow.focus();
          frameWindow.print();
        }
        setTimeout(() => {
          iframe.remove();
          resolve();
        }, 500);
      };
      if (iframe.contentWindow?.document.readyState === "complete") done();
      else iframe.addEventListener("load", done, { once: true });
    });
  }

  /**
   * Generates and downloads a PDF file directly (no dialog) by rasterizing the
   * body HTML with html2pdf.js. Output is an image-based PDF: not searchable and
   * lower fidelity than `printHtml`, but a true one-click download. Library is
   * imported dynamically so it stays out of the SSR bundle.
   */
  async function downloadPdf(bodyHtml: string, fileName: string): Promise<void> {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas-pro"),
      import("jspdf")
    ]);

    // Render inside an isolated iframe so the app's Tailwind v4 `oklch()` colors
    // never enter the captured DOM, and the content gets a normal in-flow layout.
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "820px";
    iframe.style.height = "1200px";
    iframe.style.opacity = "0";
    iframe.style.zIndex = "-1";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (!frameDoc) {
      iframe.remove();
      throw new Error("Unable to render the PDF.");
    }
    frameDoc.open();
    frameDoc.write(buildPrintDocument(bodyHtml, fileName));
    frameDoc.close();
    await new Promise<void>((resolve) => {
      if (frameDoc.readyState === "complete") resolve();
      else iframe.addEventListener("load", () => resolve(), { once: true });
    });

    try {
      const canvas = await html2canvas(frameDoc.body, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        windowWidth: 820
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(fileName);
    } finally {
      iframe.remove();
    }
  }

  return { printHtml, downloadPdf };
}
