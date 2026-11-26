from fastapi import APIRouter, Body, HTTPException
from io import BytesIO
import base64
from datetime import datetime, timezone
from typing import Optional

router = APIRouter()

REPORT_CACHE: dict[str, tuple[str, float]] = {}
CACHE_TTL = 300  # 5 minutes


def _make_table(draw, y_start: float, headers: list[str], rows: list[list[str]],
                col_widths: list[float], x_start: float, page_width: float,
                font_bold, font_normal, font_size: int = 8):
    """Draw a table using PIL ImageDraw."""
    from PIL import ImageFont
    try:
        font_b = ImageFont.truetype(font_bold, font_size)
        font_n = ImageFont.truetype(font_normal, font_size)
    except Exception:
        font_b = ImageFont.load_default()
        font_n = font_b

    row_h = font_size + 12
    y = y_start

    # Header
    x = x_start
    for i, h in enumerate(headers):
        draw.text((x + 4, y + 4), h, fill=(255, 255, 255), font=font_b)
        x += col_widths[i]
    y += row_h + 4

    # Rows
    for row in rows:
        x = x_start
        for i, cell in enumerate(row):
            draw.text((x + 4, y + 4), str(cell), fill=(50, 50, 50), font=font_n)
            x += col_widths[i]
        y += row_h

    return y


@router.post("/report")
async def generate_report(
    title: str = Body("QR Code Performance Report"),
    brand_name: str = Body("QRForge"),
    primary_color: str = Body("#ff5c00"),
    period_label: str = Body("Last 7 Days"),
    total_scans: int = Body(0),
    total_qrs: int = Body(0),
    top_country: str = Body("N/A"),
    daily_trend: list = Body([]),
    top_locations: list = Body([]),
    top_browsers: dict = Body({}),
    top_devices: dict = Body({}),
    include_qr_codes: list = Body([]),
):
    from PIL import Image, ImageDraw, ImageFont

    WIDTH, HEIGHT = 595, 842  # A4
    img = Image.new("RGB", (WIDTH, HEIGHT), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Helper colors
    primary_rgb = tuple(int(primary_color.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
    light_bg = tuple(min(c + 40, 255) for c in primary_rgb)

    # Header bar
    draw.rectangle([0, 0, WIDTH, 100], fill=primary_rgb)
    try:
        font_title = ImageFont.truetype("DejaVuSans-Bold.ttf", 22)
        font_sub = ImageFont.truetype("DejaVuSans.ttf", 10)
        font_body = ImageFont.truetype("DejaVuSans.ttf", 9)
        font_bold = ImageFont.truetype("DejaVuSans-Bold.ttf", 9)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = font_title
        font_body = font_title
        font_bold = font_title

    draw.text((30, 30), title, fill=(255, 255, 255), font=font_title)
    draw.text((30, 65), f"{brand_name}  |  {period_label}", fill=(255, 255, 255), font=font_sub)

    # Summary cards
    card_w = (WIDTH - 80) // 4
    cards_data = [
        ("Total Scans", str(total_scans)),
        ("Active QRs", str(total_qrs)),
        ("Top Country", top_country),
        ("Period", period_label),
    ]
    for i, (label, value) in enumerate(cards_data):
        x = 30 + i * (card_w + 10)
        draw.rectangle([x, 130, x + card_w, 180], fill=light_bg)
        draw.text((x + 10, 138), value, fill=primary_rgb, font=font_title)
        draw.text((x + 10, 162), label, fill=(100, 100, 100), font=font_sub)

    # Daily trend section
    y_pos = 210
    draw.text((30, y_pos), "Daily Scan Trend", fill=primary_rgb, font=font_bold)
    y_pos += 22

    if daily_trend:
        # Simple bar chart
        chart_x, chart_y = 30, y_pos
        chart_w, chart_h = WIDTH - 60, 140
        draw.rectangle([chart_x, chart_y, chart_x + chart_w, chart_y + chart_h], outline=(220, 220, 220))

        values = [d.get("scans", 0) for d in daily_trend]
        max_val = max(values) if values else 1
        bar_count = len(values)
        bar_w = chart_w // bar_count if bar_count > 0 else chart_w

        for i, v in enumerate(values):
            bar_h = (v / max_val) * (chart_h - 20)
            bx = chart_x + i * bar_w + 4
            draw.rectangle([bx, chart_y + chart_h - bar_h - 10, bx + bar_w - 8, chart_y + chart_h - 10],
                           fill=primary_rgb)
            # Label
            label = daily_trend[i].get("date", "")[-5:] if daily_trend[i].get("date") else ""
            draw.text((bx + 2, chart_y + chart_h - 8), label, fill=(100, 100, 100), font=font_sub)

        y_pos = chart_y + chart_h + 15
    else:
        y_pos += 20
        draw.text((30, y_pos), "No scan data available for this period.", fill=(150, 150, 150), font=font_body)
        y_pos += 20

    # Top locations table
    if top_locations:
        draw.text((30, y_pos), "Top Locations", fill=primary_rgb, font=font_bold)
        y_pos += 22
        loc_headers = ["City", "Country", "Scans"]
        loc_rows = [[l.get("city", ""), l.get("country", ""), str(l.get("scans", 0))] for l in top_locations[:10]]
        col_widths = [150, 200, 80]
        _make_table(draw, y_pos, loc_headers, loc_rows, col_widths, 30, WIDTH, "DejaVuSans-Bold.ttf", "DejaVuSans.ttf", 8)
        y_pos += 30 + len(loc_rows) * 20

    # Browsers & Devices
    if top_browsers or top_devices:
        draw.text((30, y_pos), "Technology Breakdown", fill=primary_rgb, font=font_bold)
        y_pos += 22

        if top_browsers:
            draw.text((30, y_pos), "Browsers:", fill=(50, 50, 50), font=font_bold)
            y_pos += 14
            for browser, count in sorted(top_browsers.items(), key=lambda x: -x[1])[:5]:
                bar_len = min((count / max(top_browsers.values())) * 200, 200) if top_browsers.values() else 0
                draw.rectangle([30, y_pos, 30 + bar_len, y_pos + 10], fill=primary_rgb)
                draw.text((240, y_pos - 1), f"{browser}: {count}", fill=(50, 50, 50), font=font_body)
                y_pos += 14

        if top_devices:
            y_pos += 6
            draw.text((30, y_pos), "Devices:", fill=(50, 50, 50), font=font_bold)
            y_pos += 14
            for device, count in sorted(top_devices.items(), key=lambda x: -x[1])[:5]:
                bar_len = min((count / max(top_devices.values())) * 200, 200) if top_devices.values() else 0
                draw.rectangle([30, y_pos, 30 + bar_len, y_pos + 10], fill=primary_rgb)
                draw.text((240, y_pos - 1), f"{device}: {count}", fill=(50, 50, 50), font=font_body)
                y_pos += 14

    # Footer
    draw.text((30, HEIGHT - 30), f"Generated by {brand_name} on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
              fill=(180, 180, 180), font=font_sub)

    buf = BytesIO()
    img.save(buf, format="PDF", resolution=72)
    pdf_bytes = buf.getvalue()

    cache_key = f"report_{hash(repr(daily_trend))}"
    REPORT_CACHE[cache_key] = (base64.b64encode(pdf_bytes).decode(), datetime.now(timezone.utc).timestamp())

    return {
        "data": base64.b64encode(pdf_bytes).decode(),
        "format": "pdf",
        "filename": f"scan_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
        "pages": 1,
    }


@router.post("/invoice")
async def generate_invoice(
    invoice_number: str = Body(...),
    customer_name: str = Body(...),
    customer_email: str = Body(...),
    items: list = Body([]),
    tax_rate: float = Body(0.0),
    currency: str = Body("NGN"),
    brand_name: str = Body("QRForge"),
    primary_color: str = Body("#ff5c00"),
):
    from PIL import Image, ImageDraw, ImageFont

    WIDTH, HEIGHT = 595, 842
    img = Image.new("RGB", (WIDTH, HEIGHT), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    primary_rgb = tuple(int(primary_color.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))

    try:
        font_large = ImageFont.truetype("DejaVuSans-Bold.ttf", 28)
        font_title = ImageFont.truetype("DejaVuSans-Bold.ttf", 18)
        font_body = ImageFont.truetype("DejaVuSans.ttf", 10)
        font_bold = ImageFont.truetype("DejaVuSans-Bold.ttf", 10)
        font_small = ImageFont.truetype("DejaVuSans.ttf", 8)
    except Exception:
        font_large = ImageFont.load_default()
        font_title = font_large
        font_body = font_large
        font_bold = font_large
        font_small = font_large

    # Header
    draw.rectangle([0, 0, WIDTH, 120], fill=primary_rgb)
    draw.text((30, 30), "INVOICE", fill=(255, 255, 255), font=font_large)
    draw.text((30, 72), f"{brand_name}", fill=(255, 255, 255), font=font_title)
    draw.text((WIDTH - 250, 30), f"#{invoice_number}", fill=(255, 255, 255), font=font_title)
    draw.text((WIDTH - 250, 65), datetime.now(timezone.utc).strftime("%B %d, %Y"), fill=(255, 255, 255), font=font_body)

    # Bill To
    y = 150
    draw.text((30, y), "Bill To:", fill=primary_rgb, font=font_bold)
    y += 18
    draw.text((30, y), customer_name, fill=(50, 50, 50), font=font_body)
    y += 14
    draw.text((30, y), customer_email, fill=(50, 50, 50), font=font_body)
    y += 30

    # Items table header
    col_widths = [250, 80, 80, 80]
    headers = ["Description", "Qty", "Unit Price", "Total"]
    x_positions = [30]
    for w in col_widths[:-1]:
        x_positions.append(x_positions[-1] + w)

    draw.rectangle([30, y, 30 + sum(col_widths), y + 22], fill=primary_rgb)
    for i, h in enumerate(headers):
        draw.text((x_positions[i] + 6, y + 4), h, fill=(255, 255, 255), font=font_bold)
    y += 26

    subtotal = 0
    for item in items:
        desc = item.get("description", "")
        qty = int(item.get("quantity", 1))
        unit_price = float(item.get("unit_price", 0))
        total = qty * unit_price
        subtotal += total

        row_data = [desc, str(qty), f"{currency} {unit_price:,.2f}", f"{currency} {total:,.2f}"]
        for i, val in enumerate(row_data):
            draw.text((x_positions[i] + 6, y + 2), val, fill=(50, 50, 50), font=font_body)
        y += 18

    # Totals
    y += 10
    tax = subtotal * tax_rate
    grand_total = subtotal + tax

    draw.text((30 + sum(col_widths) - 160, y), f"Subtotal: {currency} {subtotal:,.2f}", fill=(50, 50, 50), font=font_body)
    y += 16
    draw.text((30 + sum(col_widths) - 160, y), f"Tax ({tax_rate*100:.0f}%): {currency} {tax:,.2f}", fill=(50, 50, 50), font=font_body)
    y += 16
    draw.text((30 + sum(col_widths) - 160, y), f"Total: {currency} {grand_total:,.2f}", fill=primary_rgb, font=font_bold)

    # Footer
    draw.text((30, HEIGHT - 30), f"Thank you for choosing {brand_name}.",
              fill=(180, 180, 180), font=font_small)

    buf = BytesIO()
    img.save(buf, format="PDF", resolution=72)
    return {
        "data": base64.b64encode(buf.getvalue()).decode(),
        "format": "pdf",
        "filename": f"invoice_{invoice_number}_{datetime.now().strftime('%Y%m%d')}.pdf",
    }


@router.post("/labels")
async def generate_labels(
    qr_codes: list = Body(...),
    layout: str = Body("avery_5160"),
    brand_name: str = Body("QRForge"),
    include_text: bool = Body(True),
):
    from PIL import Image, ImageDraw, ImageFont
    import qrcode as qrcode_lib
    from io import BytesIO as _BI

    LAYOUTS = {
        "avery_5160": {"cols": 3, "rows": 10, "label_w": 168, "label_h": 48,
                       "margin_top": 12, "margin_left": 10, "gap_x": 4, "gap_y": 2,
                       "page_w": 612, "page_h": 792},
        "avery_8460": {"cols": 2, "rows": 5, "label_w": 288, "label_h": 144,
                       "margin_top": 24, "margin_left": 6, "gap_x": 0, "gap_y": 0,
                       "page_w": 612, "page_h": 792},
        "roll_40x30": {"cols": 2, "rows": 5, "label_w": 240, "label_h": 180,
                       "margin_top": 10, "margin_left": 10, "gap_x": 4, "gap_y": 4,
                       "page_w": 595, "page_h": 842},
    }

    fmt = LAYOUTS.get(layout, LAYOUTS["avery_5160"])
    cols, rows = fmt["cols"], fmt["rows"]
    labels_per_page = cols * rows
    total_labels = len(qr_codes)
    num_pages = max(1, (total_labels + labels_per_page - 1) // labels_per_page)

    try:
        font_small = ImageFont.truetype("DejaVuSans.ttf", 7)
    except Exception:
        font_small = ImageFont.load_default()

    pages = []
    for page_idx in range(num_pages):
        page = Image.new("RGB", (fmt["page_w"], fmt["page_h"]), (255, 255, 255))
        draw = ImageDraw.Draw(page)

        start_idx = page_idx * labels_per_page
        end_idx = min(start_idx + labels_per_page, total_labels)

        for i in range(start_idx, end_idx):
            local_idx = i - start_idx
            row = local_idx // cols
            col = local_idx % cols

            qr_data = qr_codes[i]
            content = qr_data.get("content", qr_data.get("data", ""))
            label = qr_data.get("label", qr_data.get("name", ""))

            x = fmt["margin_left"] + col * (fmt["label_w"] + fmt["gap_x"])
            y = fmt["margin_top"] + row * (fmt["label_h"] + fmt["gap_y"])

            # Border
            draw.rectangle([x, y, x + fmt["label_w"], y + fmt["label_h"]], outline=(200, 200, 200))

            qr_img = qrcode_lib.make(content)
            qr_size = int(fmt["label_h"] * 0.85)
            qr_resized = qr_img.resize((qr_size, qr_size))
            page.paste(qr_resized.convert("RGB"), (x + 4, y + 4))

            if include_text and label:
                text_x = x + qr_size + 8
                draw.text((text_x, y + fmt["label_h"] // 2 - 4), label, fill=(50, 50, 50), font=font_small)

        buf = _BI()
        page.save(buf, format="PNG")
        pages.append(base64.b64encode(buf.getvalue()).decode())

    return {
        "pages": pages,
        "format": "png",
        "layout": layout,
        "total_labels": total_labels,
        "num_pages": num_pages,
        "filename": f"labels_{layout}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
    }
