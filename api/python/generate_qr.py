from fastapi import APIRouter, Body, HTTPException
from PIL import Image, ImageDraw
import qrcode
import qrcode.image.svg
from io import BytesIO
import base64
import asyncio
import math
from typing import Optional

router = APIRouter()

# Print layout presets in points (1pt = 1/72 inch)
LAYOUT_PRESETS = {
    "avery_5160": {
        "label_width": 504,   # 2.625in
        "label_height": 144,  # 1in
        "cols": 3,
        "rows": 10,
        "page_width": 612,    # Letter
        "page_height": 792,   # Letter
        "margin_top": 36,     # 0.5in
        "margin_left": 32,    # ~0.44in
        "gap_x": 0,
        "gap_y": 0,
    },
    "avery_8460": {
        "label_width": 288,   # 4in
        "label_height": 144,  # 1in
        "cols": 2,
        "rows": 5,
        "page_width": 612,
        "page_height": 792,
        "margin_top": 72,
        "margin_left": 18,
        "gap_x": 0,
        "gap_y": 0,
    },
    "roll_40x30": {
        "label_width": 240,   # 40mm
        "label_height": 180,  # 30mm
        "cols": 2,
        "rows": 5,
        "page_width": 595,
        "page_height": 842,
        "margin_top": 28,
        "margin_left": 28,
        "gap_x": 8,
        "gap_y": 8,
    },
}


def hex_to_rgb(hex_color: str):
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join(c * 2 for c in hex_color)
    try:
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    except ValueError:
        return (0, 0, 0)


def build_svg_with_logo(qr_svg: str, logo_b64: str, size: int = 1000) -> str:
    import xml.etree.ElementTree as ET
    from xml.sax.saxutils import escape

    root = ET.fromstring(qr_svg)
    ns = {"svg": "http://www.w3.org/2000/svg"}
    ET.register_namespace("", "http://www.w3.org/2000/svg")

    clip_id = "logo-clip"
    clip = ET.SubElement(root, f"{{{ns['svg']}}}clipPath", {"id": clip_id})
    circle = ET.SubElement(clip, f"{{{ns['svg']}}}circle", {
        "cx": str(size // 2),
        "cy": str(size // 2),
        "r": str(size // 6),
    })

    logo_data = base64.b64decode(logo_b64)
    logo_b64_inline = base64.b64encode(logo_data).decode()
    _, ext = "png", "png"

    img = ET.SubElement(root, f"{{{ns['svg']}}}image", {
        "x": str(size // 2 - size // 6),
        "y": str(size // 2 - size // 6),
        "width": str(size // 3),
        "height": str(size // 3),
        "clip-path": f"url(#{clip_id})",
        "href": f"data:image/{ext};base64,{logo_b64_inline}",
        "preserveAspectRatio": "xMidYMid slice",
    })

    return ET.tostring(root, encoding="unicode")


@router.post("/generate")
async def generate_qr(
    data: str = Body(...),
    fg_color: str = Body("#000000"),
    bg_color: str = Body("#FFFFFF"),
    logo_b64: Optional[str] = Body(None),
    format: str = Body("png"),
    box_size: int = Body(10),
    border: int = Body(4),
    error_correction: str = Body("M"),
    dpi: int = Body(72),
):
    ec_map = {"L": qrcode.constants.ERROR_CORRECT_L, "M": qrcode.constants.ERROR_CORRECT_M,
              "Q": qrcode.constants.ERROR_CORRECT_Q, "H": qrcode.constants.ERROR_CORRECT_H}
    ec = ec_map.get(error_correction.upper(), qrcode.constants.ERROR_CORRECT_M)

    qr = qrcode.QRCode(box_size=box_size, border=border, error_correction=ec)
    qr.add_data(data)
    qr.make(fit=True)

    if format == "svg":
        img = qr.make_image(image_factory=qrcode.image.svg.SvgPathImage,
                            fill_color=fg_color, back_color=bg_color)
        buf = BytesIO()
        img.save(buf)
        svg_str = buf.getvalue().decode()

        if logo_b64:
            size = (box_size * (qr.modules_count or 21) + border * 2 * box_size)
            svg_str = build_svg_with_logo(svg_str, logo_b64, size)

        return {"image": base64.b64encode(svg_str.encode()).decode(), "format": "svg"}

    if format == "pdf":
        try:
            from fpdf import FPDF
        except ImportError:
            raise HTTPException(status_code=500, detail="PDF generation requires fpdf2")

        pdf = FPDF(unit="pt", format="letter")
        pdf.add_page()

        qr_img = qr.make_image(fill_color=fg_color, back_color=bg_color).convert("RGB")
        qr_size_pts = min(pdf.w, pdf.h) * 0.6
        tmp = BytesIO()
        dpi_render = 72
        pil_size = int(qr_size_pts / 72 * dpi_render)
        qr_resized = qr_img.resize((pil_size, pil_size), Image.LANCZOS)

        if logo_b64:
            try:
                logo_data = base64.b64decode(logo_b64)
                logo = Image.open(BytesIO(logo_data)).convert("RGBA")
                ls = pil_size // 4
                logo = logo.resize((ls, ls), Image.LANCZOS)
                pos = ((pil_size - ls) // 2, (pil_size - ls) // 2)
                mask = Image.new("L", (ls, ls), 0)
                from PIL import ImageDraw as PILImageDraw
                draw = PILImageDraw.Draw(mask)
                draw.ellipse((0, 0, ls, ls), fill=255)
                qr_resized.paste(logo, pos, mask)
            except Exception:
                pass

        qr_resized.save(tmp, format="PNG", dpi=(dpi, dpi))
        tmp.seek(0)
        x = (pdf.w - qr_size_pts) / 2
        y = (pdf.h - qr_size_pts) / 2
        pdf.image(tmp, x=x, y=y, w=qr_size_pts, h=qr_size_pts)

        pdf_bytes = pdf.output(dest="S").encode("latin1")
        return {"image": base64.b64encode(pdf_bytes).decode(), "format": "pdf"}

    if format == "pdf-label":
        try:
            from fpdf import FPDF
        except ImportError:
            raise HTTPException(status_code=500, detail="PDF label generation requires fpdf2")

        layout_name = Body("avery_5160")
        layout = LAYOUT_PRESETS.get(layout_name, LAYOUT_PRESETS["avery_5160"])

        pdf = FPDF(unit="pt", format=(layout["page_width"], layout["page_height"]))
        pdf.set_auto_page_break(auto=False)
        pdf.add_page()

        qr_img = qr.make_image(fill_color=fg_color, back_color=bg_color).convert("RGB")
        label_w = layout["label_width"]
        label_h = layout["label_height"]

        for row in range(layout["rows"]):
            for col in range(layout["cols"]):
                x = layout["margin_left"] + col * (label_w + layout["gap_x"])
                y = layout["margin_top"] + row * (label_h + layout["gap_y"])

                qr_pil = qr_img.resize((int(label_h * 0.85), int(label_h * 0.85)), Image.LANCZOS)
                tmp = BytesIO()
                qr_pil.save(tmp, format="PNG", dpi=(dpi, dpi))
                tmp.seek(0)
                pdf.image(tmp, x=x + 4, y=y + 4, h=label_h - 8)

                if data:
                    pdf.set_xy(x + label_h, y + label_h * 0.2)
                    pdf.set_font("Helvetica", size=min(8, label_h * 0.04))
                    pdf.multi_cell(label_w - label_h - 8, 8, data)

        pdf_bytes = pdf.output(dest="S").encode("latin1")
        return {"image": base64.b64encode(pdf_bytes).decode(), "format": "pdf", "layout": layout_name}

    # Default: PNG (and other raster formats)
    img = qr.make_image(fill_color=fg_color, back_color=bg_color).convert("RGB")

    if logo_b64:
        try:
            logo_data = base64.b64decode(logo_b64)
            logo = Image.open(BytesIO(logo_data)).convert("RGBA")
            qr_width, qr_height = img.size
            logo_size = qr_width // 4
            logo = logo.resize((logo_size, logo_size), Image.LANCZOS)

            mask = Image.new("L", (logo_size, logo_size), 0)
            draw = ImageDraw.Draw(mask)
            draw.ellipse((0, 0, logo_size, logo_size), fill=255)
            pos = ((qr_width - logo_size) // 2, (qr_height - logo_size) // 2)
            img.paste(logo, pos, mask)
        except Exception:
            pass

    buf = BytesIO()
    save_kwargs = {"format": format.upper()}
    if format.lower() in ("png", "jpg", "jpeg"):
        save_kwargs["dpi"] = (dpi, dpi)
    if format.lower() in ("jpg", "jpeg"):
        save_kwargs["quality"] = 85
    img.save(buf, **save_kwargs)
    return {"image": base64.b64encode(buf.getvalue()).decode(), "format": format, "dpi": dpi}


@router.post("/generate-bulk")
async def generate_bulk(
    items: list = Body(...),
    format: str = Body("png"),
    fg_color: str = Body("#000000"),
    bg_color: str = Body("#FFFFFF"),
    box_size: int = Body(10),
    border: int = Body(4),
    parallel: bool = Body(True),
):
    if len(items) > 1000:
        raise HTTPException(status_code=400, detail="Maximum 1000 items per bulk request")

    async def generate_one(item: dict) -> dict:
        try:
            qr_img = qrcode.make(
                item.get("data", ""),
                box_size=box_size,
                border=border,
                fill_color=fg_color,
                back_color=bg_color,
            )
            buf = BytesIO()
            qr_img.save(buf, format=format.upper())
            return {
                "id": item.get("id", ""),
                "label": item.get("label", ""),
                "image": base64.b64encode(buf.getvalue()).decode(),
            }
        except Exception as e:
            return {
                "id": item.get("id", ""),
                "label": item.get("label", ""),
                "error": str(e),
            }

    if parallel and len(items) > 1:
        batch_size = 20
        all_results = []
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            results = await asyncio.gather(*[generate_one(item) for item in batch])
            all_results.extend(results)
        return {"results": all_results, "format": format, "total": len(all_results)}
    else:
        results = [await generate_one(item) for item in items]
        return {"results": results, "format": format, "total": len(results)}
