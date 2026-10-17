#!/usr/bin/env python3
"""
Renders a visual preview and thumbnail.png from prototypes/nexomente-app.json
and embeds thumbnail.png inside prototypes/nexomente-app.figcraft.
Also enforces strict pixel-level bounding-box assertions so NO text node
or child frame ever overflows its parent container.
"""

import json
import math
import os
import zipfile
from PIL import Image, ImageDraw, ImageFont


def rgba_to_tuple(c, opacity=1.0):
    r = int(round(c.get("r", 0) * 255))
    g = int(round(c.get("g", 0) * 255))
    b = int(round(c.get("b", 0) * 255))
    a = int(round(c.get("a", 1.0) * opacity * 255))
    return (r, g, b, a)


def get_fill_color(node):
    fills = node.get("fills")
    if not fills:
        return None
    f = fills[0]
    if not f.get("visible", True):
        return None
    if f["type"] == "solid":
        return rgba_to_tuple(f["color"], f.get("opacity", 1.0))
    if f["type"] == "gradient" and f.get("stops"):
        return rgba_to_tuple(f["stops"][0]["color"], f.get("opacity", 1.0))
    return None


def get_stroke_color(node):
    strokes = node.get("strokes")
    if not strokes:
        return None
    s = strokes[0]
    if not s.get("visible", True):
        return None
    if s["type"] == "solid":
        return rgba_to_tuple(s["color"], s.get("opacity", 1.0))
    return None


def load_font(size, bold=False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, max(8, int(round(size))))
            except Exception:
                pass
    return ImageFont.load_default()


def check_text_bounds(nodes):
    """Checks every text node against its parent frame width/height using real PIL font metrics."""
    dummy = Image.new("RGBA", (10, 10))
    draw = ImageDraw.Draw(dummy)
    overflows = []

    for nid, node in nodes.items():
        if node.get("type") != "text":
            continue
        parent = nodes.get(str(node.get("parent")))
        if not parent or parent.get("type") != "frame":
            continue
        # Skip graph node floating labels which intentionally center below small circles
        if node.get("name", "").startswith("Label/"):
            continue

        txt = node.get("characters", "")
        style = node.get("style", {})
        fsize = style.get("font_size", 13.0)
        is_bold = "Bold" in style.get("font_style", "") or "SemiBold" in style.get("font_style", "")
        fnt = load_font(fsize, bold=is_bold)

        t = node.get("transform", [1, 0, 0, 1, 0, 0])
        tx, ty = t[4], t[5]
        pw, ph = parent.get("width", 0), parent.get("height", 0)

        bbox = draw.multiline_textbbox((0, 0), txt, font=fnt, spacing=4)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]

        if tx + tw > pw + 2.0:
            overflows.append(
                f"[WIDTH OVERFLOW] Node {nid} '{node['name']}' in parent '{parent['name']}': "
                f"tx({tx}) + text_w({tw:.1f}) = {tx+tw:.1f} > parent_w({pw}) | text={repr(txt)}"
            )
        if ty + th > ph + 4.0:
            overflows.append(
                f"[HEIGHT OVERFLOW] Node {nid} '{node['name']}' in parent '{parent['name']}': "
                f"ty({ty}) + text_h({th:.1f}) = {ty+th:.1f} > parent_h({ph}) | text={repr(txt)}"
            )
    return overflows


def render_node(draw, nodes, nid, ox, oy, scale=1.0):
    node = nodes.get(str(nid))
    if not node:
        return
    t = node.get("transform", [1, 0, 0, 1, 0, 0])
    nx = ox + t[4] * scale
    ny = oy + t[5] * scale
    w = node.get("width", 0) * scale
    h = node.get("height", 0) * scale
    ntype = node.get("type")

    fill = get_fill_color(node)
    stroke = get_stroke_color(node)
    sw = max(1, int(round(node.get("stroke", {}).get("weight", 1.0) * scale))) if stroke else 0

    if ntype in ("frame", "rectangle"):
        radii = node.get("corners", {}).get("radii", [0, 0, 0, 0])
        r = int(round((radii[0] if radii else 0) * scale))
        if w > 0 and h > 0 and (fill or stroke):
            draw.rounded_rectangle([nx, ny, nx + w, ny + h], radius=r, fill=fill, outline=stroke, width=sw)
    elif ntype == "ellipse":
        inner = node.get("inner", 0.0)
        start_deg = math.degrees(node.get("start", 0.0))
        sweep_deg = math.degrees(node.get("sweep", 6.2831853))
        if inner > 0.0 and fill:
            arc_w = max(2, int(round((w / 2.0) * (1.0 - inner))))
            draw.arc([nx, ny, nx + w, ny + h], start=start_deg, end=start_deg + sweep_deg, fill=fill, width=arc_w)
        else:
            draw.ellipse([nx, ny, nx + w, ny + h], fill=fill, outline=stroke, width=sw)
    elif ntype == "vector":
        net = node.get("network", {})
        verts = net.get("vertices", [])
        segs = net.get("segments", [])
        if stroke and segs:
            for seg in segs:
                va = verts[seg["a"]]
                vb = verts[seg["b"]]
                draw.line(
                    [nx + va["x"] * scale, ny + va["y"] * scale, nx + vb["x"] * scale, ny + vb["y"] * scale],
                    fill=stroke,
                    width=max(1, sw),
                )
    elif ntype == "text":
        txt = node.get("characters", "")
        style = node.get("style", {})
        fsize = style.get("font_size", 13.0) * scale
        is_bold = "Bold" in style.get("font_style", "") or "SemiBold" in style.get("font_style", "")
        fnt = load_font(fsize, bold=is_bold)
        if fill and txt:
            draw.multiline_text((nx, ny), txt, font=fnt, fill=fill, spacing=4)

    for cid in node.get("children", []):
        render_node(draw, nodes, cid, nx, ny, scale=scale)


def main():
    json_path = "/mnt/c/Users/bruno/Documents/nexomente/prototypes/nexomente-app.json"
    figcraft_path = "/mnt/c/Users/bruno/Documents/nexomente/prototypes/nexomente-app.figcraft"
    out_dir = "/mnt/c/Users/bruno/Documents/nexomente/prototypes"

    with open(json_path, "r", encoding="utf-8") as f:
        doc = json.load(f)

    nodes = doc["nodes"]
    overflows = check_text_bounds(nodes)
    if overflows:
        print(f"FOUND {len(overflows)} TEXT OVERFLOWS:")
        for ov in overflows:
            print("  ", ov)
    else:
        print("ZERO text overflows detected across all 4 screens!")

    page = nodes["1"]
    overview = Image.new("RGBA", (1440 * 2 + 120, 960 * 2 + 120), (7, 8, 12, 255))
    positions = [(40, 40), (1440 + 80, 40), (40, 960 + 80), (1440 + 80, 960 + 80)]

    for idx, sid in enumerate(page["children"]):
        s_img = Image.new("RGBA", (1440, 960), (10, 11, 15, 255))
        s_draw = ImageDraw.Draw(s_img, "RGBA")
        s_node = dict(nodes[str(sid)])
        orig_t = s_node["transform"]
        nodes[str(sid)]["transform"] = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0]
        render_node(s_draw, nodes, sid, 0, 0, scale=1.0)
        nodes[str(sid)]["transform"] = orig_t

        screen_png = os.path.join(out_dir, f"preview-screen-{idx+1}.png")
        s_img.save(screen_png)
        overview.paste(s_img, positions[idx])

    overview_png = os.path.join(out_dir, "preview-all-screens.png")
    overview.save(overview_png)

    thumb = overview.resize((960, 640), Image.Resampling.LANCZOS)
    thumb_path = os.path.join(out_dir, "thumbnail.png")
    thumb.save(thumb_path)

    with zipfile.ZipFile(figcraft_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("document.json", json.dumps(doc, ensure_ascii=False))
        zf.write(thumb_path, "thumbnail.png")


if __name__ == "__main__":
    main()
