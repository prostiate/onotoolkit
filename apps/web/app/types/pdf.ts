/**
 * A loaded source PDF held in store state: its raw bytes (for pdf-lib) plus id
 * and page count. The pdf.js document used for thumbnails lives in a non-reactive
 * registry keyed by `id` (see `usePdfPages`), so the class instance never enters
 * reactive state.
 */
export interface PdfSource {
  id: string;
  name: string;
  bytes: Uint8Array;
  pageCount: number;
}

/** A page shown in the organizer grid, with per-page UI state. */
export interface OrganizerPage {
  id: string;
  sourceId: string;
  /** 0-based page index within its source document. */
  pageIndex: number;
  /** Extra rotation applied on top of the page's own rotation (0/90/180/270). */
  rotation: number;
  selected: boolean;
  thumbnail: string | null;
  loading: boolean;
}

/** Minimal reference used to assemble output PDFs with pdf-lib. */
export interface PdfPageRef {
  sourceId: string;
  pageIndex: number;
  rotation: number;
}
