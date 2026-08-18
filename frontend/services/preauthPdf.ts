import { jsPDF } from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * Converts a complete template canvas into one PDF page per visible template
 * page.  Templates intentionally model their document pages as direct
 * children with `max-w-[210mm]`; cropping against those boundaries prevents
 * PDF export from cutting a section in half at an arbitrary raster offset.
 */
export function templateCanvasToPdf(
  templateContainer: HTMLElement,
  canvas: HTMLCanvasElement,
): jsPDF {
  const pdf = new jsPDF("p", "mm", "a4");
  const templateRoot = templateContainer.firstElementChild as HTMLElement | null;
  const rootBox = templateContainer.getBoundingClientRect();
  const scaleY = canvas.height / Math.max(rootBox.height, 1);
  const scaleX = canvas.width / Math.max(rootBox.width, 1);
  const pages = templateRoot
    ? Array.from(templateRoot.children).filter(
        (node): node is HTMLElement =>
          node instanceof HTMLElement && node.className.includes("max-w-[210mm]"),
      )
    : [];

  // Older/custom templates without logical page wrappers retain a single-page
  // export rather than being blindly sliced into arbitrary A4 fragments.
  const slices = pages.length
    ? pages.map((page) => {
        const pageBox = page.getBoundingClientRect();
        return {
          x: Math.max(0, Math.round((pageBox.left - rootBox.left) * scaleX)),
          y: Math.max(0, Math.round((pageBox.top - rootBox.top) * scaleY)),
          width: Math.min(canvas.width, Math.round(pageBox.width * scaleX)),
          height: Math.min(canvas.height, Math.round(pageBox.height * scaleY)),
        };
      })
    : [{ x: 0, y: 0, width: canvas.width, height: canvas.height }];

  slices.forEach((slice, index) => {
    if (index > 0) pdf.addPage("a4", "p");
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = Math.max(1, slice.width);
    pageCanvas.height = Math.max(1, slice.height);
    const context = pageCanvas.getContext("2d");
    if (!context) throw new Error("Unable to create PDF page canvas");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    context.drawImage(
      canvas,
      slice.x,
      slice.y,
      slice.width,
      slice.height,
      0,
      0,
      slice.width,
      slice.height,
    );

    const scale = Math.min(A4_WIDTH_MM / slice.width, A4_HEIGHT_MM / slice.height);
    const width = slice.width * scale;
    const height = slice.height * scale;
    const x = (A4_WIDTH_MM - width) / 2;
    const y = (A4_HEIGHT_MM - height) / 2;
    pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", x, y, width, height, undefined, "FAST");
  });

  return pdf;
}
