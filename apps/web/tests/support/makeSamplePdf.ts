import { deflateSync } from "node:zlib";
import { PDFDocument, StandardFonts } from "pdf-lib";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes, 0);
  body.set(data, typeBytes.length);

  const chunk = new Uint8Array(4 + body.length + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(body, 4);
  view.setUint32(4 + body.length, crc32(body));
  return chunk;
}

/**
 * Encodes an RGB PNG of pseudo-random ("photographic") pixels so it does not
 * trivially compress. A large image guarantees Ghostscript downsampling has
 * something meaningful to shrink.
 */
export function makeNoisePng(size: number): Uint8Array {
  const rowBytes = size * 3;
  const raw = new Uint8Array((rowBytes + 1) * size);
  let seed = 0x9e3779b9;
  for (let y = 0; y < size; y += 1) {
    const offset = y * (rowBytes + 1);
    raw[offset] = 0; // filter: none
    for (let x = 0; x < rowBytes; x += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      raw[offset + 1 + x] = (seed >>> 16) & 0xff;
    }
  }

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, size);
  ihdrView.setUint32(4, size);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour (RGB)

  const idat = new Uint8Array(deflateSync(raw));
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const chunks = [
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", new Uint8Array(0))
  ];

  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const png = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    png.set(chunk, cursor);
    cursor += chunk.length;
  }
  return png;
}

/**
 * Builds an image-heavy PDF that Ghostscript can meaningfully compress by
 * downsampling. Deterministic, so tests are stable.
 */
export async function makeImageHeavyPdf(imageSize = 1000, pages = 2): Promise<Uint8Array> {
  const png = makeNoisePng(imageSize);
  const doc = await PDFDocument.create();
  const embedded = await doc.embedPng(png);

  for (let i = 0; i < pages; i += 1) {
    const page = doc.addPage([612, 792]);
    page.drawImage(embedded, { x: 36, y: 96, width: 540, height: 600 });
    page.drawText(`Ono PDF sample page ${i + 1}`, { x: 36, y: 730, size: 24 });
  }

  return doc.save();
}

/**
 * Builds a text-based PDF with a large heading, a two-line paragraph, and a
 * bulleted list, so the text-extraction (PDF -> Markdown) tools have real
 * structure to reconstruct. Deterministic.
 */
export async function makeTextPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);

  page.drawText("Sample Heading", { x: 72, y: 700, size: 24, font });
  page.drawText("This is the first paragraph of the document.", { x: 72, y: 660, size: 12, font });
  page.drawText("It continues on a second line here.", { x: 72, y: 645, size: 12, font });
  page.drawText("- First bullet point", { x: 72, y: 610, size: 12, font });
  page.drawText("- Second bullet point", { x: 72, y: 595, size: 12, font });

  return doc.save();
}
