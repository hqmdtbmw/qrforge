// Turn the svg markup the preview renders into a standalone file you can
// open anywhere. The preview's svg has no xml declaration and sometimes no
// xmlns, so a file saved straight from the page would not always open on
// its own. This adds both, and refuses a svg with no shapes in it, which
// is what you get if you read the preview before it has finished drawing.

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XML_DECLARATION = '<?xml version="1.0" standalone="no"?>\r\n';

export function svgDownloadFilename(): string {
  return `qr-code-${Date.now()}.svg`;
}

export function buildStandaloneSvg(svgText: string): string {
  const trimmed = svgText.trim();
  if (!trimmed) {
    throw new Error("there is no svg to download yet");
  }

  const openTag = trimmed.match(/<svg\b[^>]*>/i);
  if (!openTag) {
    throw new Error("that is not an svg file");
  }

  const openTagEnd = trimmed.indexOf(">", openTag.index) + 1;
  const closeTagAt = trimmed.toLowerCase().lastIndexOf("</svg>");
  const inner =
    closeTagAt > openTagEnd ? trimmed.slice(openTagEnd, closeTagAt) : "";
  if (!/<[a-zA-Z]/.test(inner)) {
    throw new Error("the svg has no shapes in it yet");
  }

  let svg = trimmed;
  if (!/\sxmlns\s*=/.test(openTag[0])) {
    svg = svg.replace(/<svg\b/i, `<svg xmlns="${SVG_NAMESPACE}"`);
  }
  if (!svg.startsWith("<?xml")) {
    svg = XML_DECLARATION + svg;
  }
  return svg;
}
