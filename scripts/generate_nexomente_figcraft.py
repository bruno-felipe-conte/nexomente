#!/usr/bin/env python3
"""
NexoMente Official FigCraft Prototype Generator (Polished Pass)
- Zero broken emoji glyphs (uses crisp vector icons and clean geometric indicators)
- Explicit line wrapping so no text overflows card boundaries
- Authentic NX Design System tokens from app/src/index.css
- Exact FigCraft schema: Page root node, pre-computed transform [1,0,0,1,x,y],
  Vector networks, Sparklines, Donut gauges, DropShadows, Variables & Styles.
"""

import json
import math
import os
import textwrap
import zipfile


def hex_to_rgba(hex_str, alpha=1.0):
    h = hex_str.lstrip("#")
    if len(h) == 8:
        r = int(h[0:2], 16) / 255.0
        g = int(h[2:4], 16) / 255.0
        b = int(h[4:6], 16) / 255.0
        a = int(h[6:8], 16) / 255.0
        return {"r": round(r, 6), "g": round(g, 6), "b": round(b, 6), "a": round(a, 6)}
    r = int(h[0:2], 16) / 255.0
    g = int(h[2:4], 16) / 255.0
    b = int(h[4:6], 16) / 255.0
    return {"r": round(r, 6), "g": round(g, 6), "b": round(b, 6), "a": round(alpha, 6)}


def solid_fill(hex_str, alpha=1.0):
    return [{
        "type": "solid",
        "color": hex_to_rgba(hex_str, alpha),
        "opacity": 1.0,
        "visible": True,
        "blend": "normal",
    }]


def linear_gradient_fill(hex_start, hex_end, alpha_start=1.0, alpha_end=1.0, vertical=True):
    return [{
        "type": "gradient",
        "kind": "linear",
        "stops": [
            {"position": 0.0, "color": hex_to_rgba(hex_start, alpha_start)},
            {"position": 1.0, "color": hex_to_rgba(hex_end, alpha_end)},
        ],
        "from": [0.5, 0.0] if vertical else [0.0, 0.5],
        "to": [0.5, 1.0] if vertical else [1.0, 0.5],
        "width": [0.0, 0.0],
        "opacity": 1.0,
        "visible": True,
        "blend": "normal",
    }]


def card_shadow(glow_hex=None):
    effects = [
        {
            "type": "dropShadow",
            "color": hex_to_rgba("#000000", 0.42),
            "offset": [0.0, 8.0],
            "radius": 24.0,
            "spread": -4.0,
            "blend": "normal",
            "show_behind": False,
            "visible": True,
        }
    ]
    if glow_hex:
        effects.append({
            "type": "dropShadow",
            "color": hex_to_rgba(glow_hex, 0.24),
            "offset": [0.0, 0.0],
            "radius": 20.0,
            "spread": 0.0,
            "blend": "normal",
            "show_behind": False,
            "visible": True,
        })
    return effects


NX = {
    "void": "#0A0B0F",
    "depth": "#10121A",
    "surface": "#161923",
    "overlay": "#1E2130",
    "border": "#2A2F45",
    "muted": "#3D4460",
    "subtle": "#5C6380",
    "dim": "#8B93B0",
    "text": "#CBD0E0",
    "bright": "#EDF0F7",
    "primary": "#5B7CF4",
    "primary_hover": "#7090F6",
    "secondary": "#38BDF8",
    "accent": "#F59E0B",
    "success": "#22C55E",
    "error": "#F43F5E",
    "warning": "#FB923C",
    "violet": "#8B5CF6",
}


class FigcraftBuilder:
    def __init__(self):
        self.nodes = {}
        self.next_id = 1
        self.page_id = self.alloc_id()
        self.nodes[str(self.page_id)] = {
            "id": self.page_id,
            "name": "NexoMente — Product Prototype",
            "type": "page",
            "background": hex_to_rgba("#07080C"),
            "flows": [],
            "prototype": {
                "device": "None",
                "background": hex_to_rgba("#07080C"),
                "rotation": "portrait",
            },
            "guides": [],
            "children": [],
            "width": 0.0,
            "height": 0.0,
        }

    def alloc_id(self):
        nid = self.next_id
        self.next_id += 1
        return nid

    def _attach(self, parent_id, node):
        nid = node["id"]
        self.nodes[str(nid)] = node
        if parent_id is not None and str(parent_id) in self.nodes:
            self.nodes[str(parent_id)].setdefault("children", []).append(nid)
        return nid

    def frame(
        self,
        parent_id,
        name,
        x,
        y,
        w,
        h,
        fill=None,
        fills=None,
        stroke=None,
        stroke_weight=1.0,
        radius=0.0,
        radii=None,
        clip=False,
        effects=None,
        layout=None,
        child_layout=None,
        interactions=None,
        grids=None,
    ):
        nid = self.alloc_id()
        node = {
            "id": nid,
            "name": name,
            "type": "frame",
            "parent": parent_id,
            "children": [],
            "transform": [1.0, 0.0, 0.0, 1.0, float(x), float(y)],
            "width": float(w),
            "height": float(h),
            "clip": bool(clip),
        }
        if fills is not None:
            node["fills"] = fills
        elif fill is not None:
            node["fills"] = solid_fill(fill)
        if stroke is not None:
            node["strokes"] = solid_fill(stroke)
            node["stroke"] = {
                "weight": float(stroke_weight),
                "align": "inside",
                "sides": None,
                "cap_start": "none",
                "cap_end": "none",
                "join": "miter",
                "miter_limit": 4.0,
                "dashes": [],
            }
        if radii is not None:
            node["corners"] = {"radii": [float(r) for r in radii], "smoothing": 0.6}
        elif radius > 0:
            node["corners"] = {"radii": [float(radius)] * 4, "smoothing": 0.6}
        if effects:
            node["effects"] = effects
        if layout:
            node["layout"] = layout
        if child_layout:
            node["child_layout"] = child_layout
        if interactions:
            node["interactions"] = interactions
        if grids:
            node["grids"] = grids
        return self._attach(parent_id, node)

    def rect(self, parent_id, name, x, y, w, h, fill=None, fills=None, radius=0.0, stroke=None, stroke_weight=1.0):
        nid = self.alloc_id()
        node = {
            "id": nid,
            "name": name,
            "type": "rectangle",
            "parent": parent_id,
            "blend": "normal",
            "transform": [1.0, 0.0, 0.0, 1.0, float(x), float(y)],
            "width": float(w),
            "height": float(h),
        }
        if fills is not None:
            node["fills"] = fills
        elif fill is not None:
            node["fills"] = solid_fill(fill)
        if radius > 0:
            node["corners"] = {"radii": [float(radius)] * 4, "smoothing": 0.0}
        if stroke is not None:
            node["strokes"] = solid_fill(stroke)
            node["stroke"] = {
                "weight": float(stroke_weight),
                "align": "inside",
                "sides": None,
                "cap_start": "none",
                "cap_end": "none",
                "join": "miter",
                "miter_limit": 4.0,
                "dashes": [],
            }
        return self._attach(parent_id, node)

    def ellipse(self, parent_id, name, x, y, w, h, fill=None, stroke=None, stroke_weight=2.0, inner=0.0, start=0.0, sweep=6.2831853):
        nid = self.alloc_id()
        node = {
            "id": nid,
            "name": name,
            "type": "ellipse",
            "parent": parent_id,
            "blend": "normal",
            "transform": [1.0, 0.0, 0.0, 1.0, float(x), float(y)],
            "width": float(w),
            "height": float(h),
            "inner": float(inner),
            "start": float(start),
            "sweep": float(sweep),
        }
        if fill is not None:
            node["fills"] = solid_fill(fill)
        if stroke is not None:
            node["strokes"] = solid_fill(stroke)
            node["stroke"] = {
                "weight": float(stroke_weight),
                "align": "center",
                "sides": None,
                "cap_start": "round",
                "cap_end": "round",
                "join": "round",
                "miter_limit": 4.0,
                "dashes": [],
            }
        return self._attach(parent_id, node)

    def text(
        self,
        parent_id,
        name,
        characters,
        x,
        y,
        w=None,
        h=None,
        size=14.0,
        weight="Regular",
        color="#EDF0F7",
        family="Inter",
        letter_spacing=0.0,
        line_height=135.0,
        align_h="left",
        wrap_chars=None,
    ):
        nid = self.alloc_id()
        if wrap_chars and "\n" not in characters and len(characters) > wrap_chars:
            characters = "\n".join(textwrap.wrap(characters, width=wrap_chars))
        elif w is not None and "\n" not in characters:
            max_c = max(12, int(w / (size * 0.57)))
            if len(characters) > max_c:
                characters = "\n".join(textwrap.wrap(characters, width=max_c))

        lines = characters.split("\n")
        longest = max(len(line) for line in lines) if lines else 1
        est_w = float(w) if w is not None else max(24.0, round(longest * size * 0.56 + 6.0, 1))
        est_h = float(h) if h is not None else max(16.0, round(len(lines) * size * (line_height / 100.0), 1))
        node = {
            "id": nid,
            "name": name,
            "type": "text",
            "characters": characters,
            "style": {
                "font_family": family,
                "font_style": weight,
                "font_size": float(size),
                "line_height": {"unit": "percent", "value": float(line_height)},
                "letter_spacing": {"unit": "percent", "value": float(letter_spacing)},
                "decoration": "none",
                "case": "original",
                "fills": None,
                "link": None,
            },
            "parent": parent_id,
            "blend": "normal",
            "transform": [1.0, 0.0, 0.0, 1.0, float(x), float(y)],
            "width": est_w,
            "height": est_h,
            "fills": solid_fill(color),
            "align_h": align_h,
            "auto_resize": "height" if w is not None else "widthAndHeight",
        }
        return self._attach(parent_id, node)

    def vector_line(self, parent_id, name, x, y, points, stroke_color="#5B7CF4", stroke_weight=2.0, closed_fill=None, dashes=None):
        nid = self.alloc_id()
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        w = max(1.0, max(xs) - min(xs) if xs else 1.0)
        h = max(1.0, max(ys) - min(ys) if ys else 1.0)
        vertices = [{"x": float(px), "y": float(py), "radius": 0.0} for px, py in points]
        segments = []
        for i in range(len(points) - 1):
            segments.append({"a": i, "b": i + 1, "ta": [0.0, 0.0], "tb": [0.0, 0.0]})
        regions = []
        if closed_fill is not None and len(points) >= 3:
            segments.append({"a": len(points) - 1, "b": 0, "ta": [0.0, 0.0], "tb": [0.0, 0.0]})
            regions = [{"loops": [list(range(len(points)))], "winding": "nonZero"}]

        node = {
            "id": nid,
            "name": name,
            "type": "vector",
            "parent": parent_id,
            "blend": "normal",
            "transform": [1.0, 0.0, 0.0, 1.0, float(x), float(y)],
            "width": float(w),
            "height": float(h),
            "network": {
                "vertices": vertices,
                "segments": segments,
                "regions": regions,
            },
        }
        if closed_fill is not None:
            node["fills"] = closed_fill
        if stroke_color is not None:
            node["strokes"] = solid_fill(stroke_color)
            node["stroke"] = {
                "weight": float(stroke_weight),
                "align": "center",
                "sides": None,
                "cap_start": "round",
                "cap_end": "round",
                "join": "round",
                "miter_limit": 4.0,
                "dashes": dashes or [],
            }
        return self._attach(parent_id, node)

    def sparkline(self, parent_id, name, x, y, w, h, values, color_hex):
        sp_frame = self.frame(parent_id, name, x, y, w, h, clip=True)
        n = len(values)
        vmin, vmax = min(values), max(values)
        span = max(1e-5, vmax - vmin)
        line_pts = []
        for i, v in enumerate(values):
            px = round((i / (n - 1)) * w, 1)
            py = round(h - 4.0 - ((v - vmin) / span) * (h - 8.0), 1)
            line_pts.append((px, py))

        area_pts = list(line_pts) + [(w, h), (0.0, h)]
        self.vector_line(
            sp_frame,
            f"{name}/Area",
            0,
            0,
            area_pts,
            stroke_color=None,
            closed_fill=linear_gradient_fill(color_hex, color_hex, 0.28, 0.0, vertical=True),
        )
        self.vector_line(
            sp_frame,
            f"{name}/Stroke",
            0,
            0,
            line_pts,
            stroke_color=color_hex,
            stroke_weight=2.2,
        )
        last_x, last_y = line_pts[-1]
        self.ellipse(sp_frame, f"{name}/Dot", last_x - 3.5, last_y - 3.5, 7, 7, fill=color_hex)
        return sp_frame

    def icon_vector(self, parent_id, kind, x, y, color_hex):
        ic = self.frame(parent_id, f"Icon/{kind}", x, y, 20, 20)
        if kind == "dashboard":
            self.rect(ic, "q1", 2, 2, 7, 7, fill=None, stroke=color_hex, stroke_weight=1.8, radius=2)
            self.rect(ic, "q2", 11, 2, 7, 7, fill=None, stroke=color_hex, stroke_weight=1.8, radius=2)
            self.rect(ic, "q3", 2, 11, 7, 7, fill=None, stroke=color_hex, stroke_weight=1.8, radius=2)
            self.rect(ic, "q4", 11, 11, 7, 7, fill=None, stroke=color_hex, stroke_weight=1.8, radius=2)
        elif kind == "mic":
            self.rect(ic, "capsule", 7, 2, 6, 10, fill=None, stroke=color_hex, stroke_weight=1.8, radius=3)
            self.vector_line(ic, "stand", 4, 9, [(0, 0), (0, 3), (6, 6), (12, 3), (12, 0)], stroke_color=color_hex, stroke_weight=1.8)
            self.vector_line(ic, "stem", 10, 15, [(0, 0), (0, 3)], stroke_color=color_hex, stroke_weight=1.8)
        elif kind == "cards":
            self.rect(ic, "back", 5, 2, 12, 13, fill=None, stroke=color_hex, stroke_weight=1.6, radius=2.5)
            self.rect(ic, "front", 2, 5, 12, 13, fill=NX["depth"], stroke=color_hex, stroke_weight=1.8, radius=2.5)
        elif kind == "graph":
            self.vector_line(ic, "edges", 4, 4, [(2, 8), (8, 2), (12, 10), (2, 8)], stroke_color=color_hex, stroke_weight=1.5)
            self.ellipse(ic, "n1", 2, 9, 5, 5, fill=color_hex)
            self.ellipse(ic, "n2", 9, 2, 5, 5, fill=color_hex)
            self.ellipse(ic, "n3", 13, 11, 5, 5, fill=color_hex)
        elif kind == "notes":
            self.rect(ic, "doc", 3, 2, 14, 16, fill=None, stroke=color_hex, stroke_weight=1.8, radius=2.5)
            self.vector_line(ic, "l1", 6, 7, [(0, 0), (8, 0)], stroke_color=color_hex, stroke_weight=1.6)
            self.vector_line(ic, "l2", 6, 11, [(0, 0), (8, 0)], stroke_color=color_hex, stroke_weight=1.6)
            self.vector_line(ic, "l3", 6, 15, [(0, 0), (5, 0)], stroke_color=color_hex, stroke_weight=1.6)
        elif kind == "settings":
            self.ellipse(ic, "ring", 3, 3, 14, 14, stroke=color_hex, stroke_weight=1.8)
            self.ellipse(ic, "core", 7.5, 7.5, 5, 5, fill=color_hex)
        elif kind == "flame":
            self.vector_line(
                ic,
                "flame",
                4,
                2,
                [(6, 0), (11, 6), (9, 14), (6, 16), (3, 14), (1, 6), (6, 0)],
                stroke_color=color_hex,
                stroke_weight=1.8,
                closed_fill=solid_fill(color_hex, 0.25),
            )
        return ic


def nav_click(dest_id):
    return [{
        "trigger": {"type": "onClick"},
        "actions": [{"type": "navigate", "dest": dest_id}],
        "transition": {"type": "dissolve"},
        "duration_ms": 220,
        "easing": "easeOut",
    }]


def desktop_grid():
    return [{
        "kind": "columns",
        "size": 72.0,
        "count": 12,
        "gutter": 24.0,
        "offset": 32.0,
        "align": "max",
        "color": hex_to_rgba("#5B7CF4", 0.05),
        "visible": False,
    }]


def build_sidebar(b, screen_id, active_key, screen_ids):
    sb = b.frame(screen_id, "Sidebar", 0, 0, 248, 960, fill=NX["depth"], stroke=NX["border"])

    # Brand Header
    brand = b.frame(sb, "Brand", 20, 24, 208, 48)
    logo_box = b.frame(
        brand,
        "Logo Mark",
        0,
        4,
        40,
        40,
        fills=linear_gradient_fill(NX["primary"], NX["secondary"], vertical=False),
        radius=11,
        effects=card_shadow(NX["primary"]),
    )
    b.vector_line(logo_box, "Neural Mark", 10, 10, [(0, 20), (0, 0), (20, 20), (20, 0)], stroke_color="#FFFFFF", stroke_weight=2.6)
    b.text(brand, "App Name", "NexoMente", 52, 4, w=148, h=22, size=18.0, weight="Bold", color=NX["bright"], letter_spacing=-1.0)
    b.text(brand, "App Tagline", "SECOND BRAIN • LOCAL AI", 52, 27, w=154, h=14, size=9.5, weight="SemiBold", color=NX["secondary"], letter_spacing=3.0)

    b.text(sb, "Section/Modules", "ECOSSISTEMA COGNITIVO", 24, 92, w=190, h=14, size=10.0, weight="Bold", color=NX["subtle"], letter_spacing=4.0)

    items = [
        ("Dashboard", "dashboard", "dashboard", screen_ids["dash"], None),
        ("Dojo de Poesia", "dojo", "mic", screen_ids["dojo"], "AI"),
        ("Flashcards FSRS", "cards", "cards", screen_ids["cards"], "42"),
        ("Grafo Neural", "graph", "graph", screen_ids["graph"], "1.2k"),
        ("Vault de Notas", "notes", "notes", screen_ids["dash"], None),
        ("Configurações", "settings", "settings", screen_ids["dash"], None),
    ]

    ny = 116
    for label, key, icon_name, target_id, badge_txt in items:
        is_active = key == active_key
        row_fill = NX["overlay"] if is_active else None
        row_stroke = NX["primary"] if is_active else None
        txt_col = NX["bright"] if is_active else NX["dim"]
        ic_col = NX["primary"] if is_active else NX["subtle"]

        nav_row = b.frame(sb, f"Nav/{label}", 16, ny, 216, 42, fill=row_fill, stroke=row_stroke, radius=10, interactions=nav_click(target_id))
        if is_active:
            b.rect(nav_row, "Active Indicator", 0, 9, 3.5, 24, fill=NX["primary"], radius=2)
        b.icon_vector(nav_row, icon_name, 14, 11, ic_col)
        b.text(nav_row, "Label", label, 44, 12, w=120, h=18, size=13.0, weight="SemiBold" if is_active else "Medium", color=txt_col)
        if badge_txt:
            b_bg = NX["primary"] if is_active else NX["surface"]
            b_fg = "#FFFFFF" if is_active else NX["dim"]
            badge = b.frame(nav_row, "Badge", 168, 10, 38, 22, fill=b_bg, radius=6)
            b.text(badge, "Count", badge_txt, 6, 4, w=28, h=14, size=10.5, weight="Bold", color=b_fg)
        ny += 48

    # Local AI Engine Status Pill
    ai_card = b.frame(sb, "AI Runtime Status", 16, 432, 216, 86, fill=NX["surface"], stroke=NX["border"], radius=12)
    b.ellipse(ai_card, "Online Dot", 14, 16, 8, 8, fill=NX["success"])
    b.text(ai_card, "Runtime Title", "Motor Neural Offline", 28, 12, w=176, h=16, size=11.5, weight="SemiBold", color=NX["bright"])
    b.text(ai_card, "LLM Model", "Llama 3.2 3B • 48 tok/s", 14, 35, w=188, h=15, size=11.0, weight="Regular", color=NX["dim"])
    b.text(ai_card, "STT Model", "Whisper ONNX • 16kHz Worker", 14, 54, w=188, h=15, size=11.0, weight="Regular", color=NX["secondary"])

    # Tamagotchi Companion Widget
    pet = b.frame(sb, "Tamagotchi Companion", 16, 536, 216, 228, fill=NX["surface"], stroke=NX["border"], radius=16, effects=card_shadow())
    b.text(pet, "Companion Header", "COMPANHEIRO PET", 16, 16, w=130, h=13, size=9.5, weight="Bold", color=NX["accent"], letter_spacing=3.0)
    lvl_badge = b.frame(pet, "Level Pill", 154, 12, 46, 20, fill=NX["overlay"], stroke=NX["accent"], radius=6)
    b.text(lvl_badge, "Lvl", "NV 14", 7, 3, w=34, h=14, size=10.0, weight="Bold", color=NX["accent"])

    stage = b.frame(pet, "Pet Stage", 16, 40, 184, 88, fill=NX["void"], stroke=NX["border"], radius=12)
    b.ellipse(stage, "Pet Aura", 62, 14, 60, 60, fill=NX["primary"])
    b.ellipse(stage, "Body", 66, 18, 52, 52, fill=NX["overlay"], stroke=NX["secondary"], stroke_weight=2.0)
    b.ellipse(stage, "Left Eye", 77, 36, 10, 10, fill=NX["secondary"])
    b.ellipse(stage, "Right Eye", 97, 36, 10, 10, fill=NX["secondary"])
    b.vector_line(stage, "Crown", 78, 16, [(0, 8), (14, 0), (28, 8)], stroke_color=NX["accent"], stroke_weight=2.2)

    b.text(pet, "Pet Name", "Kora • Espírito Sináptico", 16, 138, w=184, h=18, size=12.5, weight="Bold", color=NX["bright"])
    b.text(pet, "Pet Mood", "✦ Em Fluxo Máximo (+25% XP)", 16, 157, w=184, h=15, size=11.0, weight="Medium", color=NX["success"])

    b.text(pet, "XP Label", "XP Nível 14", 16, 182, w=80, h=14, size=10.5, weight="Medium", color=NX["dim"])
    b.text(pet, "XP Numbers", "2.840 / 3.000", 118, 182, w=82, h=14, size=10.5, weight="SemiBold", color=NX["bright"])
    b.rect(pet, "XP Track", 16, 202, 184, 8, fill=NX["void"], radius=4)
    b.rect(pet, "XP Fill", 16, 202, 168, 8, fills=linear_gradient_fill(NX["accent"], NX["primary"], vertical=False), radius=4)

    # User Footer
    user = b.frame(sb, "User Profile", 16, 884, 216, 56, fill=NX["surface"], stroke=NX["border"], radius=12)
    av = b.frame(user, "Avatar", 12, 11, 34, 34, fills=linear_gradient_fill(NX["primary"], NX["violet"]), radius=17)
    b.text(av, "Initials", "BR", 8, 8, w=20, h=18, size=12.0, weight="Bold", color="#FFFFFF")
    b.text(user, "User Name", "Bruno • Vault Local", 56, 11, w=148, h=18, size=12.5, weight="SemiBold", color=NX["bright"])
    b.text(user, "Vault Sync", "✦ 100% On-Device • 18d", 56, 30, w=148, h=14, size=10.5, weight="Regular", color=NX["dim"])
    return sb


def build_topbar(b, screen_id, title, subtitle, cta_label, cta_dest_id):
    top = b.frame(screen_id, "Top Bar", 280, 24, 1128, 60)
    b.text(top, "Screen Title", title, 0, 2, w=530, h=30, size=23.0, weight="Bold", color=NX["bright"], letter_spacing=-1.0)
    b.text(top, "Screen Subtitle", subtitle, 0, 35, w=540, h=18, size=12.5, weight="Regular", color=NX["dim"], wrap_chars=78)

    search = b.frame(top, "Quick Search (Cmd+K)", 556, 9, 268, 42, fill=NX["surface"], stroke=NX["border"], radius=10)
    b.ellipse(search, "Search Lens", 14, 13, 13, 13, stroke=NX["subtle"], stroke_weight=1.8)
    b.text(search, "Search Placeholder", "Buscar notas, poemas...", 36, 12, w=180, h=18, size=12.0, weight="Regular", color=NX["subtle"])
    kbd = b.frame(search, "Shortcut Kbd", 224, 9, 34, 24, fill=NX["overlay"], radius=5)
    b.text(kbd, "Kbd Text", "⌘K", 6, 4, w=22, h=15, size=10.5, weight="SemiBold", color=NX["dim"])

    streak = b.frame(top, "Streak Pill", 836, 9, 118, 42, fill=NX["surface"], stroke=NX["border"], radius=10)
    b.icon_vector(streak, "flame", 12, 11, NX["accent"])
    b.text(streak, "Streak Text", "18 Dias", 38, 12, w=70, h=18, size=13.0, weight="Bold", color=NX["accent"])

    cta = b.frame(
        top,
        "Primary CTA",
        966,
        9,
        162,
        42,
        fills=linear_gradient_fill(NX["primary"], "#4A6BEF", vertical=False),
        radius=10,
        effects=card_shadow(NX["primary"]),
        interactions=nav_click(cta_dest_id),
    )
    b.text(cta, "CTA Label", cta_label, 18, 12, w=130, h=18, size=12.5, weight="Bold", color="#FFFFFF")
    return top


# =============================================================================
# SCREEN 1: DASHBOARD — VISÃO GERAL
# =============================================================================
def build_screen_dashboard(b, screen_ids):
    s1 = b.frame(b.page_id, "1. Dashboard — Visão Geral", 0, 0, 1440, 960, fill=NX["void"], clip=True, grids=desktop_grid())
    build_sidebar(b, s1, "dashboard", screen_ids)
    build_topbar(
        b,
        s1,
        "Bom dia, Bruno",
        "Seu Segundo Cérebro processou 42 flashcards e 3 poemas com IA local hoje.",
        "✦ Abrir Dojo AI →",
        screen_ids["dojo"],
    )

    kpi_configs = [
        ("Flashcards Revisados (FSRS)", "42 / 50", "+16% vs média semanal", NX["primary"], [18, 24, 22, 31, 29, 38, 42], screen_ids["cards"]),
        ("Precisão Fonética (Whisper)", "96.4%", "+2.8% no Soneto", NX["success"], [88, 90, 89, 92, 94, 95, 96.4], screen_ids["dojo"]),
        ("Sinapses no Grafo Neural", "1.284", "+38 conexões novas", NX["secondary"], [980, 1020, 1080, 1120, 1190, 1240, 1284], screen_ids["graph"]),
        ("Evolução Cognitiva (XP)", "2.840 XP", "Faltam 160 XP p/ NV 15", NX["accent"], [1900, 2100, 2250, 2400, 2580, 2710, 2840], screen_ids["dojo"]),
    ]

    kx = 280
    for title, val, delta, color_hex, series, dest in kpi_configs:
        card = b.frame(s1, f"KPI/{title}", kx, 104, 264, 138, fill=NX["surface"], stroke=NX["border"], radius=16, effects=card_shadow(), interactions=nav_click(dest))
        b.rect(card, "Accent Strip", 20, 0, 48, 3, fill=color_hex, radius=1.5)
        b.text(card, "KPI Label", title, 20, 18, w=224, h=18, size=12.0, weight="Medium", color=NX["dim"])
        b.text(card, "KPI Value", val, 20, 46, w=130, h=34, size=26.0, weight="Bold", color=NX["bright"], letter_spacing=-1.0)
        b.text(card, "KPI Delta", delta, 20, 98, w=160, h=16, size=11.0, weight="SemiBold", color=color_hex)
        b.sparkline(card, "Sparkline", 150, 48, 94, 42, series, color_hex)
        kx += 288

    # Left Chart Card
    chart_card = b.frame(s1, "Card/Desempenho Cognitivo Semanal", 280, 266, 744, 332, fill=NX["surface"], stroke=NX["border"], radius=16, effects=card_shadow())
    b.text(chart_card, "Chart Title", "Ritmo de Estudo & Retenção Neural (7 Dias)", 24, 22, w=450, h=22, size=16.0, weight="Bold", color=NX["bright"])
    b.text(chart_card, "Chart Sub", "Comparativo entre Revisões FSRS-5 e Sessões de Oratória no Dojo Whisper", 24, 46, w=480, h=16, size=12.0, weight="Regular", color=NX["dim"])

    b.ellipse(chart_card, "Leg1 Dot", 516, 28, 10, 10, fill=NX["primary"])
    b.text(chart_card, "Leg1 Text", "Flashcards FSRS", 532, 24, w=104, h=16, size=11.5, weight="Medium", color=NX["text"])
    b.ellipse(chart_card, "Leg2 Dot", 642, 28, 10, 10, fill=NX["secondary"])
    b.text(chart_card, "Leg2 Text", "Versos Dojo", 658, 24, w=76, h=16, size=11.5, weight="Medium", color=NX["text"])

    for yl, yy in [("60", 96), ("45", 142), ("30", 188), ("15", 234), ("0", 280)]:
        b.text(chart_card, f"Y/{yl}", yl, 24, yy - 7, w=24, h=14, size=10.5, weight="Regular", color=NX["subtle"])
        b.rect(chart_card, f"Gridline/{yl}", 56, yy, 660, 1, fill=NX["border"])

    days = [("Seg", 34, 18), ("Ter", 42, 26), ("Qua", 38, 22), ("Qui", 51, 35), ("Sex", 46, 30), ("Sáb", 56, 42), ("Dom", 49, 39)]
    bx = 84
    for d_name, v_fsrs, v_dojo in days:
        h1 = round((v_fsrs / 60.0) * 184.0, 1)
        h2 = round((v_dojo / 60.0) * 184.0, 1)
        b.rect(chart_card, f"Bar/{d_name}/FSRS", bx, 280 - h1, 22, h1, fills=linear_gradient_fill(NX["primary"], "#3B53B8"), radius=5)
        b.rect(chart_card, f"Bar/{d_name}/Dojo", bx + 26, 280 - h2, 22, h2, fills=linear_gradient_fill(NX["secondary"], "#1D7FA8"), radius=5)
        b.text(chart_card, f"Day/{d_name}", d_name, bx + 12, 292, w=32, h=15, size=11.5, weight="Medium", color=NX["dim"])
        bx += 92

    # Right Donut Card
    donut_card = b.frame(s1, "Card/Maturidade da Memória FSRS", 1048, 266, 360, 332, fill=NX["surface"], stroke=NX["border"], radius=16, effects=card_shadow(), interactions=nav_click(screen_ids["cards"]))
    b.text(donut_card, "Donut Title", "Estabilidade da Memória", 24, 22, w=280, h=22, size=16.0, weight="Bold", color=NX["bright"])
    b.text(donut_card, "Donut Sub", "Distribuição de 640 cartões no FSRS-5", 24, 46, w=290, h=16, size=12.0, weight="Regular", color=NX["dim"])

    cx, cy, sz = 24, 86, 152
    b.ellipse(donut_card, "Ring Track", cx, cy, sz, sz, fill=NX["overlay"], inner=0.70, start=0.0, sweep=6.28318)
    b.ellipse(donut_card, "Seg/Maduros", cx, cy, sz, sz, fill=NX["success"], inner=0.70, start=-1.5708, sweep=3.64)
    b.ellipse(donut_card, "Seg/Jovens", cx, cy, sz, sz, fill=NX["primary"], inner=0.70, start=2.07, sweep=1.50)
    b.ellipse(donut_card, "Seg/Aprendendo", cx, cy, sz, sz, fill=NX["accent"], inner=0.70, start=3.57, sweep=0.75)
    b.ellipse(donut_card, "Seg/Novos", cx, cy, sz, sz, fill=NX["secondary"], inner=0.70, start=4.32, sweep=0.39)

    b.text(donut_card, "Retention Pct", "94.2%", cx + 38, cy + 52, w=84, h=30, size=22.0, weight="Bold", color=NX["bright"])
    b.text(donut_card, "Retention Sub", "Retenção", cx + 48, cy + 82, w=68, h=16, size=11.0, weight="Medium", color=NX["dim"])

    d_legs = [
        ("Maduros (>21d)", "371", NX["success"]),
        ("Jovens (4–20d)", "154", NX["primary"]),
        ("Aprendendo", "77", NX["accent"]),
        ("Novos na Fila", "38", NX["secondary"]),
    ]
    ly = 94
    for l_name, l_cnt, l_col in d_legs:
        b.ellipse(donut_card, f"Dot/{l_name}", 192, ly + 4, 9, 9, fill=l_col)
        b.text(donut_card, f"Name/{l_name}", l_name, 208, ly, w=102, h=16, size=11.0, weight="Regular", color=NX["text"])
        b.text(donut_card, f"Val/{l_name}", l_cnt, 314, ly, w=28, h=16, size=11.5, weight="Bold", color=NX["bright"])
        ly += 34

    study_btn = b.frame(donut_card, "Btn/Iniciar Revisão", 24, 268, 312, 42, fill=NX["overlay"], stroke=NX["primary"], radius=10, interactions=nav_click(screen_ids["cards"]))
    b.text(study_btn, "Btn Label", "✦ Revisar 42 Cartões Pendentes →", 44, 12, w=230, h=18, size=12.5, weight="SemiBold", color=NX["primary"])

    # Row 3 Left: Recent Vault Notes
    notes_card = b.frame(s1, "Card/Notas Recentes do Vault", 280, 622, 744, 314, fill=NX["surface"], stroke=NX["border"], radius=16, effects=card_shadow())
    b.text(notes_card, "Notes Title", "Notas Recentes & Conexões Geradas por IA", 24, 20, w=420, h=22, size=16.0, weight="Bold", color=NX["bright"])
    b.text(notes_card, "View Graph Link", "Ver no Grafo Neural →", 576, 22, w=144, h=18, size=12.0, weight="SemiBold", color=NX["primary"])

    vault_rows = [
        ("Arquitetura de Grafos & Algoritmo de Dijkstra", "#Algoritmos • #CiênciaDaComputação", "8 Cards FSRS", "98% Retenção", NX["primary"]),
        ("Soneto de Fidelidade — Vinicius de Moraes", "#Oratória • #PoesiaClássica", "Whisper: 96.4%", "+120 XP hoje", NX["success"]),
        ("Consolidação Sináptica e Curva de Ebbinghaus", "#Neurociência • #Memória", "12 Cards FSRS", "6 Conexões", NX["secondary"]),
    ]
    ry = 62
    for n_title, n_tags, n_stat1, n_stat2, badge_col in vault_rows:
        r_box = b.frame(notes_card, f"Note/{n_title[:18]}", 24, ry, 696, 72, fill=NX["overlay"], stroke=NX["border"], radius=12)
        b.rect(r_box, "Left Tag Bar", 0, 14, 4, 44, fill=badge_col, radius=2)
        b.text(r_box, "Note Title", n_title, 20, 14, w=410, h=20, size=13.5, weight="SemiBold", color=NX["bright"], wrap_chars=52)
        b.text(r_box, "Note Tags", n_tags, 20, 40, w=360, h=16, size=11.5, weight="Regular", color=NX["dim"])

        p1 = b.frame(r_box, "Stat Pill 1", 448, 22, 122, 28, fill=NX["surface"], radius=7)
        b.text(p1, "S1", n_stat1, 12, 6, w=100, h=16, size=11.0, weight="SemiBold", color=badge_col)

        p2 = b.frame(r_box, "Stat Pill 2", 580, 22, 100, 28, fill=NX["surface"], radius=7)
        b.text(p2, "S2", n_stat2, 12, 6, w=80, h=16, size=11.0, weight="Medium", color=NX["text"])
        ry += 82

    # Row 3 Right: Dojo Spotlight
    dojo_promo = b.frame(
        s1,
        "Card/Dojo de Poesia Spotlight",
        1048,
        622,
        360,
        314,
        fills=linear_gradient_fill("#181D36", NX["surface"], vertical=True),
        stroke=NX["primary"],
        radius=16,
        effects=card_shadow(NX["primary"]),
        interactions=nav_click(screen_ids["dojo"]),
    )
    tag = b.frame(dojo_promo, "Whisper Tag", 24, 20, 148, 24, fill=NX["overlay"], stroke=NX["secondary"], radius=6)
    b.text(tag, "Tag Label", "✦ WHISPER AI LOCAL", 10, 4.5, w=128, h=15, size=10.0, weight="Bold", color=NX["secondary"])

    b.text(dojo_promo, "Spotlight Title", "Dojo de Recitação", 24, 56, w=312, h=26, size=20.0, weight="Bold", color=NX["bright"])
    b.text(
        dojo_promo,
        "Spotlight Verse",
        "“De tudo, ao meu amor serei atento\nAntes, e com tal zelo, e sempre, e tanto...”",
        24,
        90,
        w=312,
        h=44,
        size=12.5,
        weight="Medium",
        color=NX["text"],
    )

    wf_box = b.frame(dojo_promo, "Mini Waveform", 24, 150, 312, 76, fill=NX["void"], stroke=NX["border"], radius=12)
    bars = [14, 22, 36, 48, 30, 54, 42, 26, 40, 58, 46, 32, 50, 38, 24, 18, 34, 48, 28, 16]
    wx = 18
    for idx, bh in enumerate(bars):
        col = NX["secondary"] if idx < 13 else NX["muted"]
        b.rect(wf_box, f"WBar/{idx}", wx, 38 - bh / 2, 8, bh, fill=col, radius=4)
        wx += 14

    launch_btn = b.frame(
        dojo_promo,
        "Btn/Continuar Recitação",
        24,
        246,
        312,
        44,
        fills=linear_gradient_fill(NX["primary"], NX["secondary"], vertical=False),
        radius=10,
        interactions=nav_click(screen_ids["dojo"]),
    )
    b.text(launch_btn, "Btn Text", "Continuar Declamação (+50 XP) →", 40, 13, w=240, h=18, size=12.5, weight="Bold", color="#FFFFFF")
    return s1


# =============================================================================
# SCREEN 2: DOJO DE POESIA — WHISPER AI
# =============================================================================
def build_screen_dojo(b, screen_ids):
    s2 = b.frame(b.page_id, "2. Dojo de Poesia — Whisper AI", 1600, 0, 1440, 960, fill=NX["void"], clip=True, grids=desktop_grid())
    build_sidebar(b, s2, "dojo", screen_ids)
    build_topbar(
        b,
        s2,
        "Dojo de Recitação & Oratória",
        "Transcrição fonética em tempo real a 16kHz via OpenAI Whisper ONNX.",
        "✦ Ir p/ Flashcards →",
        screen_ids["cards"],
    )

    arena = b.frame(s2, "Arena de Recitação", 280, 104, 744, 832, fill=NX["surface"], stroke=NX["border"], radius=20, effects=card_shadow())
    b.text(arena, "Work Category", "OBRA CLÁSSICA • ESTROFE 1 DE 4", 32, 28, w=280, h=14, size=11.0, weight="Bold", color=NX["secondary"], letter_spacing=3.0)
    b.text(arena, "Poem Name", "Soneto de Fidelidade — Vinicius de Moraes", 32, 48, w=520, h=28, size=21.0, weight="Bold", color=NX["bright"])

    xp_pill = b.frame(arena, "Session XP Pill", 576, 32, 136, 36, fill=NX["overlay"], stroke=NX["accent"], radius=10)
    b.text(xp_pill, "XP Text", "✦ +145 XP Ganho", 14, 10, w=112, h=16, size=12.0, weight="Bold", color=NX["accent"])

    # Verse 1 (Completed)
    v1 = b.frame(arena, "Verse 1 (Done)", 32, 96, 680, 74, fill=NX["overlay"], stroke=NX["success"], radius=14)
    b.text(v1, "V1 Text", "“De tudo, ao meu amor serei atento”", 24, 14, w=480, h=24, size=17.0, weight="SemiBold", color=NX["success"])
    b.text(v1, "V1 Sub", "✓ Verso 1 dominado • Acurácia fonética: 99.1% • Cadência ideal", 24, 42, w=480, h=16, size=11.5, weight="Medium", color=NX["dim"])
    v1_badge = b.frame(v1, "V1 Score", 584, 22, 74, 30, fill=NX["surface"], radius=8)
    b.text(v1_badge, "Score", "99.1%", 16, 7, w=48, h=16, size=12.5, weight="Bold", color=NX["success"])

    # Verse 2 (Active Recitation Target)
    v2 = b.frame(arena, "Verse 2 (Active Target)", 32, 186, 680, 176, fill=NX["overlay"], stroke=NX["primary"], stroke_weight=2.0, radius=16, effects=card_shadow(NX["primary"]))
    active_pill = b.frame(v2, "Active Tag", 24, 18, 174, 24, fill=NX["surface"], stroke=NX["primary"], radius=6)
    b.text(active_pill, "Tag", "● RECITANDO AGORA • V2", 10, 5, w=156, h=14, size=10.0, weight="Bold", color=NX["primary"])

    b.text(v2, "V2 Main Verse", "“Antes, e com tal zelo, e sempre, e tanto”", 24, 56, w=632, h=36, size=24.0, weight="Bold", color=NX["bright"], letter_spacing=-0.5)

    tokens = [
        ("Antes,", "100%", NX["success"]),
        ("e com", "98%", NX["success"]),
        ("tal zelo,", "95%", NX["success"]),
        ("e sempre,", "89%", NX["accent"]),
        ("e tanto", "ouvindo...", NX["secondary"]),
    ]
    tx = 24
    for tok_w, tok_pct, tok_col in tokens:
        t_chip = b.frame(v2, f"Token/{tok_w}", tx, 108, 118, 48, fill=NX["surface"], stroke=tok_col, radius=10)
        b.text(t_chip, "Word", tok_w, 12, 7, w=94, h=18, size=13.0, weight="Bold", color=NX["bright"])
        b.text(t_chip, "Match", tok_pct, 12, 27, w=94, h=14, size=10.5, weight="SemiBold", color=tok_col)
        tx += 128

    # Verse 3 & 4
    v3 = b.frame(arena, "Verse 3 (Upcoming)", 32, 378, 680, 60, fill=NX["depth"], stroke=NX["border"], radius=12)
    b.text(v3, "V3 Text", "“Que mesmo em face do maior encanto”", 24, 19, w=500, h=22, size=15.5, weight="Medium", color=NX["subtle"])
    b.text(v3, "V3 Lock", "Próximo verso", 564, 21, w=96, h=18, size=11.5, weight="Regular", color=NX["subtle"])

    v4 = b.frame(arena, "Verse 4 (Upcoming)", 32, 450, 680, 60, fill=NX["depth"], stroke=NX["border"], radius=12)
    b.text(v4, "V4 Text", "“Dele se encante mais meu pensamento.”", 24, 19, w=500, h=22, size=15.5, weight="Medium", color=NX["subtle"])

    # Live Audio Spectrum Visualizer
    spec = b.frame(arena, "Live Audio Spectrum", 32, 530, 680, 170, fill=NX["void"], stroke=NX["border"], radius=16)
    b.ellipse(spec, "Rec Dot", 20, 18, 8, 8, fill=NX["error"])
    b.text(spec, "Spec Header", "CAPTURA PCM 16kHz • FLOAT32ARRAY STREAM", 34, 15, w=340, h=15, size=10.5, weight="Bold", color=NX["dim"], letter_spacing=2.0)
    b.text(spec, "Latency", "Worker Latency: 38ms • 60 FPS UI", 456, 15, w=204, h=15, size=11.0, weight="Medium", color=NX["secondary"])

    heights = [
        14, 20, 32, 48, 66, 84, 72, 54, 62, 88, 96, 78, 56, 40, 64, 86, 94, 76,
        52, 68, 84, 70, 48, 36, 58, 78, 64, 44, 30, 42, 56, 38, 24, 18, 12, 10,
    ]
    sx = 22
    for i, bh in enumerate(heights):
        bar_col = NX["secondary"] if i % 3 == 0 else NX["primary"]
        b.rect(spec, f"FreqBar/{i}", sx, 104 - bh / 2, 11, bh, fill=bar_col, radius=5.5)
        sx += 17.8

    # Controls Bar
    btn_retry = b.frame(arena, "Btn/Repetir Verso", 32, 728, 180, 52, fill=NX["overlay"], stroke=NX["border"], radius=12)
    b.text(btn_retry, "Label", "↺ Repetir Verso", 36, 16, w=116, h=20, size=13.5, weight="SemiBold", color=NX["text"])

    btn_rec = b.frame(
        arena,
        "Btn/Gravando Ativo",
        232,
        724,
        280,
        60,
        fills=linear_gradient_fill(NX["error"], "#E11D48", vertical=False),
        radius=16,
        effects=card_shadow(NX["error"]),
    )
    b.ellipse(btn_rec, "Rec Pulse", 46, 23, 14, 14, fill="#FFFFFF")
    b.text(btn_rec, "Rec Text", "Ouvindo... (Pausar)", 70, 19, w=170, h=22, size=15.0, weight="Bold", color="#FFFFFF")

    btn_next = b.frame(arena, "Btn/Avançar Verso", 532, 728, 180, 52, fill=NX["overlay"], stroke=NX["primary"], radius=12, interactions=nav_click(screen_ids["cards"]))
    b.text(btn_next, "Next Label", "Próximo Verso →", 32, 16, w=124, h=20, size=13.5, weight="SemiBold", color=NX["primary"])

    # Right Panel: Whisper Telemetry
    diag = b.frame(s2, "Painel de Diagnóstico Fonético", 1048, 104, 360, 480, fill=NX["surface"], stroke=NX["border"], radius=20, effects=card_shadow())
    b.text(diag, "Diag Title", "Precisão Fonética Global", 24, 24, w=280, h=22, size=16.0, weight="Bold", color=NX["bright"])
    b.text(diag, "Diag Sub", "Algoritmo de Match de Tokens Normalizados", 24, 48, w=300, h=16, size=12.0, weight="Regular", color=NX["dim"])

    b.ellipse(diag, "Gauge BG", 96, 86, 168, 168, fill=NX["overlay"], inner=0.74, start=0.0, sweep=6.28318)
    b.ellipse(diag, "Gauge Value", 96, 86, 168, 168, fill=NX["success"], inner=0.74, start=-1.5708, sweep=6.05)
    b.text(diag, "Gauge Pct", "96.4%", 136, 144, w=92, h=32, size=26.0, weight="Bold", color=NX["bright"])
    b.text(diag, "Gauge Pass", "ACIMA DO LIMIAR", 132, 180, w=104, h=14, size=9.5, weight="Bold", color=NX["success"])

    m_rows = [
        ("Fidelidade Lexical", "98.2%", NX["success"]),
        ("Ritmo & Pausas Métricas", "94.5%", NX["primary"]),
        ("Clareza de Consoantes", "96.8%", NX["secondary"]),
        ("Modelo Local Ativo", "Whisper-Base ONNX", NX["text"]),
    ]
    my = 282
    for m_k, m_v, m_c in m_rows:
        b.rect(diag, f"Div/{m_k}", 24, my - 8, 312, 1, fill=NX["border"])
        b.text(diag, f"K/{m_k}", m_k, 24, my, w=176, h=18, size=12.0, weight="Medium", color=NX["dim"])
        b.text(diag, f"V/{m_k}", m_v, 208, my, w=128, h=18, size=12.0, weight="Bold", color=m_c)
        my += 44

    # Pet Live Reaction Card
    pet_react = b.frame(s2, "Card/Reação do Tamagotchi", 1048, 608, 360, 328, fill=NX["surface"], stroke=NX["accent"], radius=20, effects=card_shadow(NX["accent"]))
    b.text(pet_react, "React Header", "EVOLUÇÃO DO PET EM TEMPO REAL", 24, 22, w=280, h=14, size=10.0, weight="Bold", color=NX["accent"], letter_spacing=2.5)
    b.text(pet_react, "React Title", "Kora absorveu sua oratória!", 24, 44, w=312, h=22, size=16.0, weight="Bold", color=NX["bright"])
    b.text(
        pet_react,
        "Speech Bubble",
        "“Sua dicção em ‘tal zelo, e sempre, e tanto’ atingiu 96.4%! Mais 2 estrofes perfeitas e desbloquearemos Orador Dourado.”",
        24,
        74,
        w=312,
        h=68,
        size=12.0,
        weight="Regular",
        color=NX["text"],
        wrap_chars=46,
    )

    p_stats = [
        ("Energia Vital", 92, NX["success"]),
        ("Sabedoria Poética", 84, NX["primary"]),
        ("Multiplicador de Combo (4x)", 100, NX["accent"]),
    ]
    py = 168
    for ps_label, ps_val, ps_col in p_stats:
        b.text(pet_react, f"L/{ps_label}", ps_label, 24, py, w=220, h=16, size=11.5, weight="Medium", color=NX["dim"])
        b.text(pet_react, f"P/{ps_label}", f"{ps_val}%", 296, py, w=40, h=16, size=11.5, weight="Bold", color=ps_col)
        b.rect(pet_react, f"Track/{ps_label}", 24, py + 22, 312, 8, fill=NX["void"], radius=4)
        b.rect(pet_react, f"Fill/{ps_label}", 24, py + 22, round(3.12 * ps_val), 8, fill=ps_col, radius=4)
        py += 48

    return s2


# =============================================================================
# SCREEN 3: ESTUDO FSRS — FLASHCARDS
# =============================================================================
def build_screen_flashcards(b, screen_ids):
    s3 = b.frame(b.page_id, "3. Estudo FSRS — Flashcards", 3200, 0, 1440, 960, fill=NX["void"], clip=True, grids=desktop_grid())
    build_sidebar(b, s3, "cards", screen_ids)
    build_topbar(
        b,
        s3,
        "Repetição Espaçada (FSRS-5)",
        "Fila otimizada pela Curva de Esquecimento Individual • Cartão 14 de 50",
        "✦ Abrir Grafo 3D →",
        screen_ids["graph"],
    )

    prog = b.frame(s3, "Session Progress Header", 280, 104, 744, 56, fill=NX["surface"], stroke=NX["border"], radius=14)
    b.text(prog, "Deck Name", "Deck: Ciência da Computação & Neurociência", 20, 18, w=320, h=20, size=13.0, weight="SemiBold", color=NX["bright"])
    b.rect(prog, "Prog Track", 360, 24, 240, 8, fill=NX["void"], radius=4)
    b.rect(prog, "Prog Fill", 360, 24, 168, 8, fills=linear_gradient_fill(NX["primary"], NX["secondary"], vertical=False), radius=4)
    b.text(prog, "Prog Count", "35 / 50 (70%)", 616, 18, w=108, h=20, size=12.5, weight="Bold", color=NX["secondary"])

    card = b.frame(s3, "Flashcard Active Card", 280, 178, 744, 616, fill=NX["surface"], stroke=NX["primary"], stroke_weight=1.5, radius=22, effects=card_shadow(NX["primary"]))

    meta_pill = b.frame(card, "Source Note Link", 32, 28, 304, 30, fill=NX["overlay"], stroke=NX["border"], radius=8)
    b.text(meta_pill, "Source Text", "Nota: Consolidação Sináptica & FSRS-5.md", 12, 6, w=280, h=18, size=11.5, weight="Medium", color=NX["secondary"])

    fsrs_pill = b.frame(card, "FSRS Params", 464, 28, 248, 30, fill=NX["overlay"], radius=8)
    b.text(fsrs_pill, "Params Text", "Estab. S: 14.8d • Dificuldade D: 4.2", 12, 7, w=232, h=16, size=10.5, weight="SemiBold", color=NX["dim"], wrap_chars=45)

    b.text(card, "Q Label", "PERGUNTA (FRENTE)", 32, 82, w=200, h=14, size=10.5, weight="Bold", color=NX["primary"], letter_spacing=3.0)
    b.text(
        card,
        "Question Prompt",
        "Como o modelo matemático do FSRS-5 calcula a\nprobabilidade de recordação R(t, S) após t dias?",
        32,
        106,
        w=680,
        h=64,
        size=19.0,
        weight="Bold",
        color=NX["bright"],
        line_height=140.0,
    )

    b.rect(card, "Card Divider", 32, 192, 680, 1, fill=NX["border"])

    b.text(card, "A Label", "RESPOSTA REVELADA (VERSO)", 32, 214, w=240, h=14, size=10.5, weight="Bold", color=NX["success"], letter_spacing=3.0)
    b.text(
        card,
        "Answer Explanation",
        "Diferente do SM-2 (Anki clássico), o FSRS-5 modela a memória através do\ncomponente DSR (Difficulty, Stability, Retrievability) usando uma curva de\ndecaimento hiperbólico calibrada por aprendizado de máquina:",
        32,
        238,
        w=680,
        h=64,
        size=14.0,
        weight="Regular",
        color=NX["text"],
        line_height=145.0,
    )

    code_box = b.frame(card, "Formula Block", 32, 316, 680, 132, fill=NX["void"], stroke=NX["border"], radius=14)
    b.text(code_box, "Code Header", "math / fsrs_scheduler.ts", 20, 14, w=240, h=16, size=11.0, weight="SemiBold", color=NX["subtle"], family="Liberation Mono")
    b.text(code_box, "Formula Line 1", "R(t, S) = (1 + FACTOR * (t / S)) ^ DECAY", 20, 44, w=620, h=24, size=16.5, weight="Bold", color=NX["secondary"], family="Liberation Mono")
    b.text(code_box, "Formula Line 2", "// Onde S é a Estabilidade (dias p/ R cair de 100% para 90%) e DECAY = -0.5", 20, 82, w=640, h=18, size=11.5, weight="Regular", color=NX["dim"], family="Liberation Mono")

    b.text(card, "Links Label", "CONEXÕES NEURAIS DESTE CARTÃO:", 32, 472, w=280, h=14, size=10.0, weight="Bold", color=NX["subtle"], letter_spacing=3.0)
    chips = [
        ("✦ Curva de Ebbinghaus", NX["primary"]),
        ("✦ SuperMemo SM-2 vs FSRS", NX["secondary"]),
        ("✦ Plasticidade Sináptica", NX["success"]),
    ]
    cx = 32
    for ch_txt, ch_col in chips:
        chip = b.frame(card, f"Chip/{ch_txt}", cx, 496, 212, 34, fill=NX["overlay"], stroke=NX["border"], radius=8, interactions=nav_click(screen_ids["graph"]))
        b.text(chip, "Chip Text", ch_txt, 14, 8, w=184, h=18, size=12.0, weight="SemiBold", color=ch_col)
        cx += 226

    b.text(card, "Shortcut Hint", "Atalhos:  [1] Errei   •   [2] Difícil   •   [3] Bom   •   [4] Fácil   •   [Espaço] Virar", 110, 564, w=540, h=18, size=12.0, weight="Medium", color=NX["subtle"])

    # FSRS 4 Rating Buttons
    ratings = [
        ("1 • Errei", "Rever em < 10 min", "Estabilidade → 1.2d", NX["error"]),
        ("2 • Difícil", "Rever em 3 dias", "Estabilidade → 8.4d", NX["warning"]),
        ("3 • Bom", "Rever em 14 dias", "Estabilidade → 24.0d", NX["primary"]),
        ("4 • Fácil", "Rever em 32 dias", "Estabilidade → 48.5d", NX["success"]),
    ]
    rx = 280
    for r_title, r_int, r_stab, r_col in ratings:
        r_btn = b.frame(s3, f"Rate/{r_title}", rx, 814, 174, 122, fill=NX["surface"], stroke=r_col, stroke_weight=1.5, radius=16, effects=card_shadow(), interactions=nav_click(screen_ids["graph"]))
        b.rect(r_btn, "Top Color Bar", 16, 0, 142, 4, fill=r_col, radius=2)
        b.text(r_btn, "Rate Label", r_title, 20, 20, w=134, h=24, size=16.5, weight="Bold", color=NX["bright"])
        b.text(r_btn, "Rate Interval", r_int, 20, 52, w=134, h=18, size=12.5, weight="SemiBold", color=r_col)
        b.text(r_btn, "Rate Stability", r_stab, 20, 82, w=134, h=16, size=11.0, weight="Regular", color=NX["dim"])
        rx += 190

    # Right Panel: Forgetting Curve
    curve_card = b.frame(s3, "Card/Curva de Esquecimento Ebbinghaus", 1048, 104, 360, 430, fill=NX["surface"], stroke=NX["border"], radius=20, effects=card_shadow())
    b.text(curve_card, "Title", "Projeção da Curva de Retenção", 24, 24, w=312, h=22, size=16.0, weight="Bold", color=NX["bright"])
    b.text(curve_card, "Sub", "Impacto de responder ‘Bom (14d)’ na memória", 24, 48, w=312, h=16, size=12.0, weight="Regular", color=NX["dim"])

    plot = b.frame(curve_card, "Curve Plot", 24, 82, 312, 220, fill=NX["void"], stroke=NX["border"], radius=14, clip=True)
    b.rect(plot, "Threshold 90%", 0, 56, 312, 1, fill=NX["error"])
    b.text(plot, "90% Label", "Limiar FSRS 90%", 198, 38, w=104, h=14, size=10.0, weight="Bold", color=NX["error"])

    old_pts = [(16, 20), (60, 48), (110, 86), (160, 128), (220, 168), (296, 198)]
    b.vector_line(plot, "Decay Sem Revisão", 0, 0, old_pts, stroke_color=NX["muted"], stroke_weight=2.0, dashes=[4.0, 4.0])

    new_pts = [(16, 20), (80, 28), (150, 38), (220, 50), (296, 64)]
    b.vector_line(plot, "Reforço FSRS Hoje", 0, 0, new_pts, stroke_color=NX["success"], stroke_weight=3.0)
    b.ellipse(plot, "Review Point", 12, 16, 9, 9, fill=NX["success"])

    b.text(curve_card, "Legend 1", "● Com revisão hoje: S sobe 14.8d → 24.0d", 24, 322, w=312, h=18, size=12.0, weight="SemiBold", color=NX["success"])
    b.text(curve_card, "Legend 2", "○ Sem revisão: R cairia p/ 74% em 5 dias", 24, 348, w=312, h=18, size=12.0, weight="Regular", color=NX["dim"])
    b.text(curve_card, "Target", "✦ Ganho de XP no cartão: +18 XP", 24, 382, w=312, h=18, size=12.0, weight="Bold", color=NX["accent"])

    # AI Flashcard Generator Card
    gen_card = b.frame(s3, "Card/Gerador Llama 3.2", 1048, 558, 360, 378, fill=NX["surface"], stroke=NX["border"], radius=20, effects=card_shadow())
    b.text(gen_card, "Gen Tag", "✦ LLAMA 3.2 LOCAL GENERATOR", 24, 22, w=260, h=14, size=10.0, weight="Bold", color=NX["secondary"], letter_spacing=3.0)
    b.text(gen_card, "Gen Title", "Síntese Automática de Notas", 24, 44, w=312, h=22, size=16.0, weight="Bold", color=NX["bright"])
    b.text(
        gen_card,
        "Gen Desc",
        "O Llama 3.2 analisou suas últimas 3 notas\ne sugeriu 6 novos flashcards atômicos:",
        24,
        72,
        w=312,
        h=38,
        size=12.0,
        weight="Regular",
        color=NX["dim"],
    )

    sug_items = [
        ("Complexidade temporal do Dijkstra\ncom Fibonacci Heap", "#Algoritmos"),
        ("Papel do hipocampo na potenciação\nde longa duração (LTP)", "#Neurociência"),
    ]
    sy = 124
    for s_txt, s_tag in sug_items:
        s_box = b.frame(gen_card, f"Sug/{s_tag}", 24, sy, 312, 82, fill=NX["overlay"], stroke=NX["border"], radius=12)
        b.text(s_box, "Text", s_txt, 14, 12, w=284, h=38, size=12.0, weight="SemiBold", color=NX["bright"])
        b.text(s_box, "Tag", f"{s_tag} • Aprovar com 1 clique", 14, 56, w=260, h=14, size=10.5, weight="Medium", color=NX["secondary"])
        sy += 92

    gen_btn = b.frame(gen_card, "Btn/Aprovar Sugestões", 24, 318, 312, 42, fill=NX["overlay"], stroke=NX["secondary"], radius=10)
    b.text(gen_btn, "Label", "✦ Adicionar 6 Cartões ao Deck", 52, 12, w=220, h=18, size=12.5, weight="Bold", color=NX["secondary"])

    return s3


# =============================================================================
# SCREEN 4: GRAFO NEURAL & AI CHAT (LLAMA 3.2)
# =============================================================================
def build_screen_graph(b, screen_ids):
    s4 = b.frame(b.page_id, "4. Grafo Neural & AI Chat", 4800, 0, 1440, 960, fill=NX["void"], clip=True, grids=desktop_grid())
    build_sidebar(b, s4, "graph", screen_ids)
    build_topbar(
        b,
        s4,
        "Grafo de Sinapses & Vault",
        "1.284 notas conectadas por [[WikiLinks]] e embeddings locais.",
        "✦ Voltar ao Início",
        screen_ids["dash"],
    )

    g_canvas = b.frame(s4, "Canvas do Grafo Neural", 280, 104, 744, 832, fill="#07080D", stroke=NX["border"], radius=20, clip=True, effects=card_shadow())

    for gx in range(80, 740, 110):
        b.rect(g_canvas, f"VGrid/{gx}", gx, 0, 1, 832, fill="#111420")
    for gy in range(80, 830, 110):
        b.rect(g_canvas, f"HGrid/{gy}", 0, gy, 744, 1, fill="#111420")

    filters = [
        ("Todos (1.284)", NX["primary"], True, 136),
        ("● Neurociência & FSRS", NX["success"], False, 178),
        ("● IA Local (Whisper)", NX["secondary"], False, 168),
        ("● Poesia & Oratória", NX["accent"], False, 166),
    ]
    fx = 24
    for f_txt, f_col, is_on, fw in filters:
        fp = b.frame(g_canvas, f"Filter/{f_txt}", fx, 20, fw, 34, fill=NX["overlay"] if is_on else NX["surface"], stroke=f_col if is_on else NX["border"], radius=17)
        b.text(fp, "Label", f_txt, 14, 9, w=fw - 24, h=16, size=11.0, weight="SemiBold", color=NX["bright"] if is_on else NX["dim"])
        fx += fw + 12

    nodes_spec = [
        (372, 410, 34, "Segundo Cérebro\n(NexoMente Core)", NX["primary"], True),
        (556, 230, 26, "Algoritmo FSRS-5", NX["success"], True),
        (648, 140, 18, "Curva de Ebbinghaus", NX["success"], False),
        (660, 290, 18, "Consolidação Sináptica", NX["success"], False),
        (480, 130, 16, "Estabilidade & DSR", NX["success"], False),
        (190, 220, 26, "Whisper AI (16kHz)", NX["secondary"], True),
        (96, 136, 18, "Web Worker Off-Thread", NX["secondary"], False),
        (110, 310, 18, "Llama 3.2 3B Local", NX["secondary"], False),
        (268, 120, 16, "Embeddings Locais", NX["secondary"], False),
        (210, 590, 24, "Dojo de Poesia", NX["accent"], True),
        (92, 520, 17, "Soneto de Fidelidade", NX["accent"], False),
        (118, 690, 17, "Métrica & Fonética", NX["accent"], False),
        (310, 700, 16, "Tamagotchi XP Engine", NX["accent"], False),
        (560, 580, 24, "Estruturas de Grafos", NX["primary"], True),
        (664, 500, 17, "Dijkstra & Min-Heap", NX["primary"], False),
        (646, 680, 17, "Árvores Geradoras", NX["primary"], False),
        (470, 710, 16, "Vault Markdown", NX["primary"], False),
    ]

    edges_spec = [
        (0, 1), (0, 5), (0, 9), (0, 13),
        (1, 2), (1, 3), (1, 4), (2, 3),
        (5, 6), (5, 7), (5, 8), (6, 7),
        (9, 10), (9, 11), (9, 12), (5, 9),
        (13, 14), (13, 15), (13, 16), (1, 13),
    ]

    for i_a, i_b in edges_spec:
        xa, ya, _, _, col_a, _ = nodes_spec[i_a]
        xb, yb, _, _, _, _ = nodes_spec[i_b]
        b.vector_line(g_canvas, f"Synapse/{i_a}-{i_b}", 0, 0, [(xa, ya), (xb, yb)], stroke_color=col_a, stroke_weight=1.6 if i_a == 0 else 1.2)

    for idx, (nx_pos, ny_pos, rad, n_label, n_col, is_hub) in enumerate(nodes_spec):
        if is_hub:
            b.ellipse(g_canvas, f"HubGlow/{idx}", nx_pos - rad - 8, ny_pos - rad - 8, (rad + 8) * 2, (rad + 8) * 2, stroke=n_col, stroke_weight=1.2)
        b.ellipse(
            g_canvas,
            f"Node/{n_label}",
            nx_pos - rad,
            ny_pos - rad,
            rad * 2,
            rad * 2,
            fill=NX["surface"] if is_hub else n_col,
            stroke=n_col,
            stroke_weight=3.0 if is_hub else 1.5,
        )
        if is_hub:
            b.ellipse(g_canvas, f"Core/{idx}", nx_pos - 8, ny_pos - 8, 16, 16, fill=n_col)
        b.text(
            g_canvas,
            f"Label/{n_label}",
            n_label,
            nx_pos - 68,
            ny_pos + rad + 6,
            w=140,
            h=30,
            size=11.0 if is_hub else 10.0,
            weight="Bold" if is_hub else "Medium",
            color=NX["bright"] if is_hub else NX["text"],
        )

    hud = b.frame(g_canvas, "Graph HUD Controls", 24, 764, 696, 48, fill=NX["surface"], stroke=NX["border"], radius=12)
    b.text(hud, "HUD Info", "✦ Cytoscape Force Layout • 17 Nós Visíveis • 20 Sinapses Ativas", 18, 15, w=480, h=18, size=12.0, weight="Medium", color=NX["text"])
    b.text(hud, "Zoom", "Zoom: 100%", 596, 15, w=90, h=18, size=12.0, weight="SemiBold", color=NX["primary"], wrap_chars=24)

    # Right Panel: Node Inspector & AI Chat
    insp = b.frame(s4, "Inspector & AI Chat (Llama 3.2)", 1048, 104, 360, 832, fill=NX["surface"], stroke=NX["border"], radius=20, effects=card_shadow())

    b.text(insp, "Inspector Tag", "NÓ SELECIONADO NO GRAFO", 24, 24, w=240, h=14, size=10.0, weight="Bold", color=NX["success"], letter_spacing=3.0)
    b.text(insp, "Selected Node Title", "Algoritmo FSRS-5", 24, 44, w=312, h=26, size=20.0, weight="Bold", color=NX["bright"])
    b.text(insp, "Selected Meta", "Conectado a 14 notas • 28 cards FSRS", 24, 74, w=312, h=16, size=11.5, weight="Regular", color=NX["dim"])

    b.rect(insp, "Div 1", 24, 106, 312, 1, fill=NX["border"])
    b.text(insp, "Backlinks Header", "BACKLINKS BIDIRECIONAIS (3)", 24, 122, w=240, h=14, size=10.5, weight="Bold", color=NX["subtle"], letter_spacing=3.0)

    blinks = [
        ("[[Curva de Ebbinghaus]]", "94% similar"),
        ("[[Consolidação Sináptica]]", "89% similar"),
        ("[[Estruturas de Grafos]]", "76% similar"),
    ]
    by = 146
    for bl_name, bl_sim in blinks:
        bl_row = b.frame(insp, f"BL/{bl_name}", 24, by, 312, 38, fill=NX["overlay"], radius=8)
        b.text(bl_row, "Link", bl_name, 12, 10, w=196, h=18, size=12.0, weight="SemiBold", color=NX["primary"])
        b.text(bl_row, "Sim", bl_sim, 222, 10, w=78, h=18, size=11.0, weight="Regular", color=NX["dim"])
        by += 46

    b.rect(insp, "Div 2", 24, 296, 312, 1, fill=NX["border"])
    b.text(insp, "Chat Header", "✦ CHAT NEURAL COM SEU VAULT (LLAMA 3.2)", 24, 314, w=312, h=15, size=10.5, weight="Bold", color=NX["secondary"], letter_spacing=2.0)

    u_bub = b.frame(insp, "User Message", 48, 344, 288, 68, fill=NX["overlay"], stroke=NX["primary"], radius=14)
    b.text(
        u_bub,
        "Prompt",
        "Como minhas notas de Neurociência\nse conectam ao agendador FSRS-5?",
        14,
        12,
        w=260,
        h=44,
        size=12.0,
        weight="Medium",
        color=NX["bright"],
    )

    ai_bub = b.frame(insp, "Llama Response", 24, 428, 312, 296, fill=NX["void"], stroke=NX["border"], radius=14)
    b.text(ai_bub, "AI Badge", "✦ Llama 3.2 3B • 100% Local RAG", 16, 14, w=260, h=16, size=11.0, weight="Bold", color=NX["secondary"])
    b.text(
        ai_bub,
        "AI Body",
        "Com base em 3 notas do seu Vault:\n\n1. Em [[Consolidação Sináptica]], a repetição\nlogo antes do esquecimento fortalece a\nmielinização neural.\n\n2. O [[Algoritmo FSRS-5]] agenda a revisão\nquando a Retrievability R atinge 90%,\nmaximizando a LTP com 30% menos carga.",
        16,
        40,
        w=280,
        h=204,
        size=11.5,
        weight="Regular",
        color=NX["text"],
        line_height=142.0,
    )
    cite = b.frame(ai_bub, "Citation Chip", 16, 254, 280, 28, fill=NX["surface"], radius=6)
    b.text(cite, "Cite Text", "Fontes: Consolidação Sináptica.md, FSRS-5.md", 10, 7, w=260, h=14, size=10.0, weight="Medium", color=NX["dim"])

    inp = b.frame(insp, "Chat Input", 24, 744, 312, 64, fill=NX["overlay"], stroke=NX["border"], radius=14)
    b.text(inp, "Placeholder", "Pergunte ao Llama 3.2...", 16, 14, w=230, h=18, size=12.0, weight="Regular", color=NX["subtle"], wrap_chars=36)
    b.text(inp, "Sub", "Enter para enviar • Contexto: 14 notas", 16, 36, w=220, h=14, size=10.0, weight="Regular", color=NX["muted"])
    send = b.frame(inp, "Send Button", 268, 16, 32, 32, fill=NX["primary"], radius=8)
    b.text(send, "Arrow", "↑", 11, 6, w=12, h=20, size=14.0, weight="Bold", color="#FFFFFF")

    return s4


def build_styles_and_variables():
    styles = [
        {"id": "S:1", "name": "NX/Void", "description": "Root dark canvas", "type": "paint", "paints": solid_fill(NX["void"])},
        {"id": "S:2", "name": "NX/Depth", "description": "Sidebar & panels", "type": "paint", "paints": solid_fill(NX["depth"])},
        {"id": "S:3", "name": "NX/Surface", "description": "Cards & modules", "type": "paint", "paints": solid_fill(NX["surface"])},
        {"id": "S:4", "name": "NX/Primary Blue", "description": "Primary brand action", "type": "paint", "paints": solid_fill(NX["primary"])},
        {"id": "S:5", "name": "NX/Neural Cyan", "description": "Local AI accent", "type": "paint", "paints": solid_fill(NX["secondary"])},
        {"id": "S:6", "name": "NX/Amber XP", "description": "Tamagotchi & XP", "type": "paint", "paints": solid_fill(NX["accent"])},
        {"id": "S:7", "name": "NX/Success Emerald", "description": "High accuracy / Easy", "type": "paint", "paints": solid_fill(NX["success"])},
        {
            "id": "S:8",
            "name": "NX/Heading XL",
            "description": "Screen title",
            "type": "text",
            "style": {
                "font_family": "Inter",
                "font_style": "Bold",
                "font_size": 24.0,
                "line_height": {"unit": "percent", "value": 125.0},
                "letter_spacing": {"unit": "percent", "value": -1.0},
                "decoration": "none",
                "case": "original",
                "fills": None,
                "link": None,
            },
        },
        {
            "id": "S:9",
            "name": "NX/Card Elevation",
            "description": "Soft dark drop shadow",
            "type": "effect",
            "effects": card_shadow(),
        },
    ]

    variables = {
        "collections": [
            {
                "id": "VariableCollectionId:1",
                "name": "NX Design System",
                "modes": [
                    {"id": "VariableCollectionId:1/mode1", "name": "Dark (Default)"},
                    {"id": "VariableCollectionId:1/mode2", "name": "Light"},
                ],
            }
        ],
        "variables": [
            {
                "id": "VariableID:1",
                "name": "nx/void",
                "collection": "VariableCollectionId:1",
                "resolvedType": "color",
                "values": {
                    "VariableCollectionId:1/mode1": {"type": "color", "value": hex_to_rgba(NX["void"])},
                    "VariableCollectionId:1/mode2": {"type": "color", "value": hex_to_rgba("#F1F5F9")},
                },
                "description": "Background root",
            },
            {
                "id": "VariableID:2",
                "name": "nx/surface",
                "collection": "VariableCollectionId:1",
                "resolvedType": "color",
                "values": {
                    "VariableCollectionId:1/mode1": {"type": "color", "value": hex_to_rgba(NX["surface"])},
                    "VariableCollectionId:1/mode2": {"type": "color", "value": hex_to_rgba("#FFFFFF")},
                },
                "description": "Card surface",
            },
            {
                "id": "VariableID:3",
                "name": "nx/primary",
                "collection": "VariableCollectionId:1",
                "resolvedType": "color",
                "values": {
                    "VariableCollectionId:1/mode1": {"type": "color", "value": hex_to_rgba(NX["primary"])},
                    "VariableCollectionId:1/mode2": {"type": "color", "value": hex_to_rgba("#4F46E5")},
                },
                "description": "Nexo Blue primary",
            },
            {
                "id": "VariableID:4",
                "name": "nx/secondary",
                "collection": "VariableCollectionId:1",
                "resolvedType": "color",
                "values": {
                    "VariableCollectionId:1/mode1": {"type": "color", "value": hex_to_rgba(NX["secondary"])},
                    "VariableCollectionId:1/mode2": {"type": "color", "value": hex_to_rgba("#0284C7")},
                },
                "description": "Neural Cyan",
            },
            {
                "id": "VariableID:5",
                "name": "nx/accent",
                "collection": "VariableCollectionId:1",
                "resolvedType": "color",
                "values": {
                    "VariableCollectionId:1/mode1": {"type": "color", "value": hex_to_rgba(NX["accent"])},
                    "VariableCollectionId:1/mode2": {"type": "color", "value": hex_to_rgba("#D97706")},
                },
                "description": "Amber XP",
            },
        ],
    }
    return styles, variables


def generate():
    b = FigcraftBuilder()
    screen_ids = {"dash": 2, "dojo": 3, "cards": 4, "graph": 5}

    for _, sid in screen_ids.items():
        alloc = b.alloc_id()
        assert alloc == sid

    def init_screen_frame(sid, name, x, y):
        node = {
            "id": sid,
            "name": name,
            "type": "frame",
            "parent": b.page_id,
            "children": [],
            "transform": [1.0, 0.0, 0.0, 1.0, float(x), float(y)],
            "width": 1440.0,
            "height": 960.0,
            "fills": solid_fill(NX["void"]),
            "clip": True,
            "grids": desktop_grid(),
        }
        b.nodes[str(sid)] = node
        b.nodes[str(b.page_id)]["children"].append(sid)
        return sid

    orig_frame = b.frame

    def patched_frame(parent_id, name, x, y, w, h, **kwargs):
        if parent_id == b.page_id:
            if name.startswith("1."):
                return init_screen_frame(screen_ids["dash"], name, x, y)
            if name.startswith("2."):
                return init_screen_frame(screen_ids["dojo"], name, x, y)
            if name.startswith("3."):
                return init_screen_frame(screen_ids["cards"], name, x, y)
            if name.startswith("4."):
                return init_screen_frame(screen_ids["graph"], name, x, y)
        return orig_frame(parent_id, name, x, y, w, h, **kwargs)

    b.frame = patched_frame

    build_screen_dashboard(b, screen_ids)
    build_screen_dojo(b, screen_ids)
    build_screen_flashcards(b, screen_ids)
    build_screen_graph(b, screen_ids)

    b.nodes[str(b.page_id)]["flows"] = [
        {"name": "Fluxo Completo NexoMente", "start": screen_ids["dash"], "description": "Navegação interativa entre Dashboard, Dojo Whisper AI, Flashcards FSRS-5 e Grafo Neural"},
        {"name": "Dojo de Poesia (Whisper)", "start": screen_ids["dojo"], "description": "Fluxo direto de recitação e diagnóstico fonético"},
    ]

    styles, variables = build_styles_and_variables()

    document = {
        "nodes": b.nodes,
        "next_id": b.next_id,
        "styles": styles,
        "variables": variables,
        "current_page": b.page_id,
        "document_colors": [
            hex_to_rgba(NX["void"]),
            hex_to_rgba(NX["depth"]),
            hex_to_rgba(NX["surface"]),
            hex_to_rgba(NX["primary"]),
            hex_to_rgba(NX["secondary"]),
            hex_to_rgba(NX["accent"]),
            hex_to_rgba(NX["success"]),
            hex_to_rgba(NX["error"]),
        ],
        "comments": [],
    }

    out_dir = "/mnt/c/Users/bruno/Documents/nexomente/prototypes"
    os.makedirs(out_dir, exist_ok=True)

    json_path = os.path.join(out_dir, "nexomente-app.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(document, f, indent=2, ensure_ascii=False)

    figcraft_path = os.path.join(out_dir, "nexomente-app.figcraft")
    with zipfile.ZipFile(figcraft_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("document.json", json.dumps(document, ensure_ascii=False))

    print(f"Generated {len(b.nodes)} nodes across 4 screens.")


if __name__ == "__main__":
    generate()
