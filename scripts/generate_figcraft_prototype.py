import json
import zipfile
import os

def hex_to_rgba(hex_str, alpha=1.0):
    hex_str = hex_str.lstrip('#')
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    return {"r": round(r, 4), "g": round(g, 4), "b": round(b, 4), "a": alpha}

def solid_fill(hex_str, alpha=1.0):
    return [{"type": "solid", "color": hex_to_rgba(hex_str, alpha), "opacity": 1.0, "visible": True, "blend": "normal"}]

def solid_stroke(hex_str, alpha=1.0):
    return [{"type": "solid", "color": hex_to_rgba(hex_str, alpha), "opacity": 1.0, "visible": True, "blend": "normal"}]

class FigcraftDocBuilder:
    def __init__(self):
        self.nodes = {}
        self.next_id = 1
        
        # Root document node (id: 1)
        self.nodes["1"] = {
            "id": 1,
            "name": "NexoMente Prototipo",
            "type": "document",
            "children": []
        }
        self.next_id = 2

    def alloc_id(self):
        cur = self.next_id
        self.next_id += 1
        return cur

    def add_node(self, node_dict):
        nid = str(node_dict["id"])
        self.nodes[nid] = node_dict
        return node_dict["id"]

    def create_frame(self, parent_id, name, x, y, w, h, bg_color=None, layout=None, child_layout=None, corners=None, strokes=None, interactions=None, clip=True):
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
            "clip": clip
        }
        if bg_color:
            node["fills"] = solid_fill(bg_color)
        if strokes:
            node["strokes"] = strokes
            node["stroke"] = {"weight": 1.0, "align": "inside", "sides": None, "cap_start": "none", "cap_end": "none", "join": "miter", "miter_limit": 4.0, "dashes": []}
        if corners:
            node["corners"] = {"radii": [corners]*4, "smoothing": 0.0}
        if layout:
            node["layout"] = layout
        if child_layout:
            node["child_layout"] = child_layout
        if interactions:
            node["interactions"] = interactions

        self.add_node(node)
        if str(parent_id) in self.nodes:
            self.nodes[str(parent_id)].setdefault("children", []).append(nid)
        return nid

    def create_text(self, parent_id, name, text, x, y, w, h, font_size=14.0, font_weight="Regular", color="#FFFFFF", align="left", child_layout=None):
        nid = self.alloc_id()
        node = {
            "id": nid,
            "name": name,
            "type": "text",
            "characters": text,
            "style": {
                "font_family": "Inter",
                "font_style": font_weight,
                "font_size": float(font_size),
                "line_height": {"unit": "percent", "value": 130.0},
                "letter_spacing": {"unit": "percent", "value": 0.0},
                "decoration": "none",
                "case": "original",
                "fills": None,
                "link": None
            },
            "parent": parent_id,
            "blend": "normal",
            "transform": [1.0, 0.0, 0.0, 1.0, float(x), float(y)],
            "width": float(w),
            "height": float(h),
            "fills": solid_fill(color)
        }
        if child_layout:
            node["child_layout"] = child_layout
        self.add_node(node)
        if str(parent_id) in self.nodes:
            self.nodes[str(parent_id)].setdefault("children", []).append(nid)
        return nid

    def create_rect(self, parent_id, name, x, y, w, h, bg_color=None, corners=None, strokes=None, child_layout=None):
        nid = self.alloc_id()
        node = {
            "id": nid,
            "name": name,
            "type": "rectangle",
            "parent": parent_id,
            "transform": [1.0, 0.0, 0.0, 1.0, float(x), float(y)],
            "width": float(w),
            "height": float(h)
        }
        if bg_color:
            node["fills"] = solid_fill(bg_color)
        if corners:
            node["corners"] = {"radii": [corners]*4, "smoothing": 0.0}
        if strokes:
            node["strokes"] = strokes
            node["stroke"] = {"weight": 1.0, "align": "inside", "sides": None, "cap_start": "none", "cap_end": "none", "join": "miter", "miter_limit": 4.0, "dashes": []}
        if child_layout:
            node["child_layout"] = child_layout

        self.add_node(node)
        if str(parent_id) in self.nodes:
            self.nodes[str(parent_id)].setdefault("children", []).append(nid)
        return nid

    def build_document(self):
        return {
            "nodes": self.nodes,
            "next_id": self.next_id,
            "styles": [],
            "variables": {
                "collections": [
                    {
                        "id": "VariableCollectionId:1",
                        "name": "NexoTheme",
                        "modes": [
                            {"id": "VariableCollectionId:1/mode1", "name": "Dark Cyberpunk"}
                        ]
                    }
                ],
                "variables": [
                    {
                        "id": "VariableID:1",
                        "name": "bg/deep",
                        "collection": "VariableCollectionId:1",
                        "resolvedType": "color",
                        "values": {"VariableCollectionId:1/mode1": {"type": "color", "value": hex_to_rgba("#090D16")}}
                    },
                    {
                        "id": "VariableID:2",
                        "name": "accent/cyan",
                        "collection": "VariableCollectionId:1",
                        "resolvedType": "color",
                        "values": {"VariableCollectionId:1/mode1": {"type": "color", "value": hex_to_rgba("#00F0FF")}}
                    },
                    {
                        "id": "VariableID:3",
                        "name": "accent/purple",
                        "collection": "VariableCollectionId:1",
                        "resolvedType": "color",
                        "values": {"VariableCollectionId:1/mode1": {"type": "color", "value": hex_to_rgba("#8B5CF6")}}
                    }
                ]
            },
            "current_page": 1,
            "document_colors": [],
            "comments": []
        }

def make_prototype():
    builder = FigcraftDocBuilder()

    # Pre-allocate Screen Frame IDs so we can hook interactive navigation onClick
    screen_dash_id = builder.alloc_id()
    screen_dojo_id = builder.alloc_id()
    screen_cards_id = builder.alloc_id()
    screen_graph_id = builder.alloc_id()

    # Layout presets
    hug_hug = {"sizing_h": "hug", "sizing_v": "hug", "absolute": False, "grid_column_span": 0, "grid_row_span": 0}
    fill_hug = {"sizing_h": "fill", "sizing_v": "hug", "absolute": False, "grid_column_span": 0, "grid_row_span": 0}
    fixed_hug = {"sizing_h": "fixed", "sizing_v": "hug", "absolute": False, "grid_column_span": 0, "grid_row_span": 0}

    def nav_interaction(dest_id):
        return [{
            "trigger": {"type": "onClick"},
            "actions": [{"type": "navigate", "dest": dest_id}],
            "transition": {"type": "dissolve"},
            "duration_ms": 250,
            "easing": "easeOut"
        }]

    # Helper to add standard NexoMente Sidebar
    def add_sidebar(screen_id, active_tab="dashboard"):
        sidebar = builder.create_frame(
            parent_id=screen_id,
            name="Sidebar",
            x=0, y=0, w=260, h=960,
            bg_color="#0F172A",
            layout={
                "mode": "vertical", "wrap": False, "gap": 20.0, "cross_gap": 0.0,
                "padding": [28.0, 20.0, 28.0, 20.0],
                "main_align": "min", "cross_align": "stretch",
                "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [],
                "strokes_included": True, "reverse_z": False
            },
            strokes=solid_stroke("#1E293B")
        )

        # Brand / Logo Header
        brand_box = builder.create_frame(
            parent_id=sidebar, name="Brand", x=0, y=0, w=220, h=52,
            layout={"mode": "horizontal", "wrap": False, "gap": 12.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "min", "cross_align": "center", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
            child_layout=fill_hug
        )
        builder.create_rect(parent_id=brand_box, name="Logo Icon", x=0, y=0, w=38, h=38, bg_color="#00F0FF", corners=10.0)
        title_box = builder.create_frame(parent_id=brand_box, name="Brand Texts", x=0, y=0, w=160, h=38, layout={"mode": "vertical", "wrap": False, "gap": 2.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "center", "cross_align": "min", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False}, child_layout=fill_hug)
        builder.create_text(parent_id=title_box, name="App Title", text="NEXOMENTE", x=0, y=0, w=140, h=20, font_size=16.0, font_weight="Bold", color="#FFFFFF", child_layout=hug_hug)
        builder.create_text(parent_id=title_box, name="App Subtitle", text="Local Intelligence", x=0, y=0, w=140, h=14, font_size=11.0, font_weight="Regular", color="#64748B", child_layout=hug_hug)

        # Navigation Links
        nav_items = [
            ("🌌 Dashboard", "dashboard", screen_dash_id),
            ("🎙️ Dojo de Voz", "dojo", screen_dojo_id),
            ("🃏 Flashcards", "flashcards", screen_cards_id),
            ("🕸️ Grafo Neural", "graph", screen_graph_id),
            ("📝 Notas & Vault", "notas", screen_dash_id),
            ("⚙️ Configurações", "settings", screen_dash_id)
        ]

        nav_container = builder.create_frame(
            parent_id=sidebar, name="Nav Menu", x=0, y=0, w=220, h=360,
            layout={"mode": "vertical", "wrap": False, "gap": 8.0, "cross_gap": 0.0, "padding": [12.0, 0, 0, 0], "main_align": "min", "cross_align": "stretch", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
            child_layout=fill_hug
        )

        for label, key, target_id in nav_items:
            is_active = (key == active_tab)
            bg = "#1E293B" if is_active else "#00000000"
            txt_color = "#00F0FF" if is_active else "#94A3B8"
            border = solid_stroke("#00F0FF") if is_active else None

            btn = builder.create_frame(
                parent_id=nav_container, name=f"Nav - {label}", x=0, y=0, w=220, h=44,
                bg_color="#1E293B" if is_active else None,
                corners=8.0,
                strokes=border,
                layout={"mode": "horizontal", "wrap": False, "gap": 10.0, "cross_gap": 0.0, "padding": [10.0, 14.0, 10.0, 14.0], "main_align": "min", "cross_align": "center", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
                child_layout=fill_hug,
                interactions=nav_interaction(target_id)
            )
            builder.create_text(parent_id=btn, name="Label", text=label, x=0, y=0, w=180, h=20, font_size=13.0, font_weight="SemiBold" if is_active else "Medium", color=txt_color, child_layout=hug_hug)

        # Pet Companion Mini-Widget in Sidebar
        pet_card = builder.create_frame(
            parent_id=sidebar, name="Pet Widget", x=0, y=0, w=220, h=160,
            bg_color="#131D31",
            corners=14.0,
            strokes=solid_stroke("#2A3756"),
            layout={"mode": "vertical", "wrap": False, "gap": 10.0, "cross_gap": 0.0, "padding": [16.0, 16.0, 16.0, 16.0], "main_align": "center", "cross_align": "stretch", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
            child_layout=fill_hug
        )
        pet_header = builder.create_frame(parent_id=pet_card, name="Pet Header", x=0, y=0, w=188, h=40, layout={"mode": "horizontal", "wrap": False, "gap": 10.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "min", "cross_align": "center", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False}, child_layout=fill_hug)
        builder.create_rect(parent_id=pet_header, name="Pet Avatar", x=0, y=0, w=36, h=36, bg_color="#8B5CF6", corners=18.0)
        pet_meta = builder.create_frame(parent_id=pet_header, name="Pet Meta", x=0, y=0, w=130, h=36, layout={"mode": "vertical", "wrap": False, "gap": 2.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "center", "cross_align": "min", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False}, child_layout=fill_hug)
        builder.create_text(parent_id=pet_meta, name="Pet Name", text="Nexo-Pet Lv. 14", x=0, y=0, w=120, h=18, font_size=13.0, font_weight="Bold", color="#F8FAFC", child_layout=hug_hug)
        builder.create_text(parent_id=pet_meta, name="Pet State", text="✨ Animado & Focado", x=0, y=0, w=120, h=14, font_size=11.0, font_weight="Medium", color="#10B981", child_layout=hug_hug)
        
        # XP bar
        xp_bg = builder.create_rect(parent_id=pet_card, name="XP Bar BG", x=0, y=0, w=188, h=6, bg_color="#1E293B", corners=3.0, child_layout=fill_hug)
        builder.create_text(parent_id=pet_card, name="XP Info", text="XP: 2.840 / 3.000", x=0, y=0, w=188, h=14, font_size=10.0, font_weight="Regular", color="#64748B", child_layout=hug_hug)

    # =========================================================================
    # SCREEN 1: DASHBOARD
    # =========================================================================
    builder.nodes[str(screen_dash_id)] = {
        "id": screen_dash_id,
        "name": "1 Dashboard Overview",
        "type": "frame",
        "parent": 1,
        "children": [],
        "transform": [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
        "width": 1440.0,
        "height": 960.0,
        "fills": solid_fill("#090D16"),
        "clip": True
    }
    builder.nodes["1"]["children"].append(screen_dash_id)
    add_sidebar(screen_dash_id, active_tab="dashboard")

    # Main Content Area Dashboard
    dash_content = builder.create_frame(
        parent_id=screen_dash_id, name="Content Area", x=260, y=0, w=1180, h=960,
        layout={"mode": "vertical", "wrap": False, "gap": 28.0, "cross_gap": 0.0, "padding": [40.0, 48.0, 40.0, 48.0], "main_align": "min", "cross_align": "stretch", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False}
    )

    # Top Header
    header_bar = builder.create_frame(
        parent_id=dash_content, name="Header Bar", x=0, y=0, w=1084, h=60,
        layout={"mode": "horizontal", "wrap": False, "gap": 0.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "spaceBetween", "cross_align": "center", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=fill_hug
    )
    head_text_box = builder.create_frame(parent_id=header_bar, name="Title Box", x=0, y=0, w=500, h=56, layout={"mode": "vertical", "wrap": False, "gap": 4.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "min", "cross_align": "min", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False}, child_layout=hug_hug)
    builder.create_text(parent_id=head_text_box, name="Greeting", text="Segundo Cérebro • Visão Geral", x=0, y=0, w=400, h=32, font_size=24.0, font_weight="Bold", color="#FFFFFF", child_layout=hug_hug)
    builder.create_text(parent_id=head_text_box, name="Sub", text="Local AI ativa: Llama 3.2 3B & Whisper Quantized", x=0, y=0, w=400, h=18, font_size=13.0, font_weight="Regular", color="#64748B", child_layout=hug_hug)

    action_btn = builder.create_frame(
        parent_id=header_bar, name="CTA Treinar Voz", x=0, y=0, w=180, h=44,
        bg_color="#8B5CF6", corners=10.0,
        layout={"mode": "horizontal", "wrap": False, "gap": 8.0, "cross_gap": 0.0, "padding": [12.0, 20.0, 12.0, 20.0], "main_align": "center", "cross_align": "center", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=hug_hug,
        interactions=nav_interaction(screen_dojo_id)
    )
    builder.create_text(parent_id=action_btn, name="Btn Text", text="🎙️ Iniciar Dojo", x=0, y=0, w=120, h=20, font_size=13.0, font_weight="SemiBold", color="#FFFFFF", child_layout=hug_hug)

    # 4 KPI Stat Cards
    kpi_row = builder.create_frame(
        parent_id=dash_content, name="KPI Row", x=0, y=0, w=1084, h=120,
        layout={"mode": "horizontal", "wrap": False, "gap": 20.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "spaceBetween", "cross_align": "stretch", "grid_columns": 4, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=fill_hug
    )

    kpis = [
        ("Flashcards Hoje", "42 / 50", "+12% vs ontem", "#00F0FF", screen_cards_id),
        ("Acurácia de Voz", "94.8%", "Whisper AI v3", "#10B981", screen_dojo_id),
        ("Nós no Grafo", "1.248 nós", "Conexões neurais", "#8B5CF6", screen_graph_id),
        ("Streak de Foco", "18 Dias 🔥", "Pet em êxtase", "#F59E0B", screen_dash_id)
    ]
    for label, val, sub, accent, link_id in kpis:
        card = builder.create_frame(
            parent_id=kpi_row, name=f"Card {label}", x=0, y=0, w=256, h=110,
            bg_color="#0F172A", corners=14.0, strokes=solid_stroke("#1E293B"),
            layout={"mode": "vertical", "wrap": False, "gap": 6.0, "cross_gap": 0.0, "padding": [18.0, 20.0, 18.0, 20.0], "main_align": "center", "cross_align": "min", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
            child_layout=fill_hug,
            interactions=nav_interaction(link_id)
        )
        builder.create_text(parent_id=card, name="K Label", text=label, x=0, y=0, w=200, h=16, font_size=12.0, font_weight="Medium", color="#94A3B8", child_layout=hug_hug)
        builder.create_text(parent_id=card, name="K Val", text=val, x=0, y=0, w=200, h=30, font_size=24.0, font_weight="Bold", color="#FFFFFF", child_layout=hug_hug)
        builder.create_text(parent_id=card, name="K Sub", text=sub, x=0, y=0, w=200, h=14, font_size=11.0, font_weight="SemiBold", color=accent, child_layout=hug_hug)

    # Two Column Layout (Recent Sessions & AI Recommendations)
    body_grid = builder.create_frame(
        parent_id=dash_content, name="Body Grid", x=0, y=0, w=1084, h=480,
        layout={"mode": "horizontal", "wrap": False, "gap": 24.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "spaceBetween", "cross_align": "stretch", "grid_columns": 2, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=fill_hug
    )

    # Left Column: Recent Notes / Knowledge Feed
    left_feed = builder.create_frame(
        parent_id=body_grid, name="Knowledge Feed", x=0, y=0, w=640, h=460,
        bg_color="#0F172A", corners=16.0, strokes=solid_stroke("#1E293B"),
        layout={"mode": "vertical", "wrap": False, "gap": 16.0, "cross_gap": 0.0, "padding": [24.0, 24.0, 24.0, 24.0], "main_align": "min", "cross_align": "stretch", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=fill_hug
    )
    builder.create_text(parent_id=left_feed, name="Feed Title", text="🧠 Notas Recentes & Sínteses", x=0, y=0, w=500, h=22, font_size=16.0, font_weight="Bold", color="#FFFFFF", child_layout=hug_hug)
    
    notes_list = [
        ("Estruturas de Grafos e Algoritmos de Caminho Mínimo", "Há 2 horas • 5 flashcards gerados", "#00F0FF"),
        ("Neurociência da Memória: Repetição Espaçada FSRS-5", "Há 4 horas • 8 flashcards gerados", "#8B5CF6"),
        ("Soneto de Fidelidade - Vinicius de Moraes (Oratória)", "Ontem • Precisão: 98.2%", "#10B981")
    ]
    for n_title, n_meta, tag_col in notes_list:
        item = builder.create_frame(
            parent_id=left_feed, name="Note Item", x=0, y=0, w=592, h=76,
            bg_color="#1E293B", corners=10.0,
            layout={"mode": "vertical", "wrap": False, "gap": 4.0, "cross_gap": 0.0, "padding": [14.0, 16.0, 14.0, 16.0], "main_align": "center", "cross_align": "min", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
            child_layout=fill_hug
        )
        builder.create_text(parent_id=item, name="Title", text=n_title, x=0, y=0, w=560, h=20, font_size=13.0, font_weight="SemiBold", color="#F1F5F9", child_layout=hug_hug)
        builder.create_text(parent_id=item, name="Meta", text=n_meta, x=0, y=0, w=560, h=14, font_size=11.0, font_weight="Regular", color=tag_col, child_layout=hug_hug)

    # Right Column: Fast Actions / AI Assistant
    right_ai = builder.create_frame(
        parent_id=body_grid, name="AI Assistant Panel", x=0, y=0, w=420, h=460,
        bg_color="#0F172A", corners=16.0, strokes=solid_stroke("#1E293B"),
        layout={"mode": "vertical", "wrap": False, "gap": 16.0, "cross_gap": 0.0, "padding": [24.0, 24.0, 24.0, 24.0], "main_align": "min", "cross_align": "stretch", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=fill_hug
    )
    builder.create_text(parent_id=right_ai, name="AI Title", text="⚡ Ações Rápidas de Estudo", x=0, y=0, w=360, h=22, font_size=16.0, font_weight="Bold", color="#FFFFFF", child_layout=hug_hug)
    
    quick_acts = [
        ("🎙️ Recitar Poema no Dojo", "Treine fala e pontue no Whisper AI", screen_dojo_id),
        ("🃏 Fazer Revisão Diária (FSRS)", "42 flashcards prontos para vencer a curva de esquecimento", screen_cards_id),
        ("🕸️ Explorar Grafo Neural 3D", "Descubra conexões entre notas isoladas", screen_graph_id)
    ]
    for act_title, act_desc, tgt_screen in quick_acts:
        act_box = builder.create_frame(
            parent_id=right_ai, name=f"Act {act_title}", x=0, y=0, w=372, h=88,
            bg_color="#1E293B", corners=12.0, strokes=solid_stroke("#334155"),
            layout={"mode": "vertical", "wrap": False, "gap": 4.0, "cross_gap": 0.0, "padding": [16.0, 16.0, 16.0, 16.0], "main_align": "center", "cross_align": "min", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
            child_layout=fill_hug,
            interactions=nav_interaction(tgt_screen)
        )
        builder.create_text(parent_id=act_box, name="Title", text=act_title, x=0, y=0, w=340, h=20, font_size=13.0, font_weight="SemiBold", color="#00F0FF", child_layout=hug_hug)
        builder.create_text(parent_id=act_box, name="Desc", text=act_desc, x=0, y=0, w=340, h=32, font_size=11.0, font_weight="Regular", color="#94A3B8", child_layout=hug_hug)


    # =========================================================================
    # SCREEN 2: DOJO DE VOZ & POESIA (WHISPER AI)
    # =========================================================================
    builder.nodes[str(screen_dojo_id)] = {
        "id": screen_dojo_id,
        "name": "2 Dojo de Voz (Whisper AI)",
        "type": "frame",
        "parent": 1,
        "children": [],
        "transform": [1.0, 0.0, 0.0, 1.0, 1600.0, 0.0],
        "width": 1440.0,
        "height": 960.0,
        "fills": solid_fill("#090D16"),
        "clip": True
    }
    builder.nodes["1"]["children"].append(screen_dojo_id)
    add_sidebar(screen_dojo_id, active_tab="dojo")

    dojo_content = builder.create_frame(
        parent_id=screen_dojo_id, name="Dojo Content", x=260, y=0, w=1180, h=960,
        layout={"mode": "vertical", "wrap": False, "gap": 28.0, "cross_gap": 0.0, "padding": [40.0, 48.0, 40.0, 48.0], "main_align": "min", "cross_align": "stretch", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False}
    )

    # Header
    dojo_head = builder.create_frame(
        parent_id=dojo_content, name="Dojo Header", x=0, y=0, w=1084, h=60,
        layout={"mode": "horizontal", "wrap": False, "gap": 0.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "spaceBetween", "cross_align": "center", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=fill_hug
    )
    dojo_titles = builder.create_frame(parent_id=dojo_head, name="Titles", x=0, y=0, w=500, h=56, layout={"mode": "vertical", "wrap": False, "gap": 4.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "min", "cross_align": "min", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False}, child_layout=hug_hug)
    builder.create_text(parent_id=dojo_titles, name="Title", text="🎙️ Dojo de Recitação & Oratória", x=0, y=0, w=450, h=32, font_size=24.0, font_weight="Bold", color="#FFFFFF", child_layout=hug_hug)
    builder.create_text(parent_id=dojo_titles, name="Sub", text="Reconhecimento fonético via OpenAI Whisper Local (Transformers.js ONNX)", x=0, y=0, w=550, h=18, font_size=13.0, font_weight="Regular", color="#64748B", child_layout=hug_hug)

    # Main Arena Frame (Poem Box)
    arena_box = builder.create_frame(
        parent_id=dojo_content, name="Arena Box", x=0, y=0, w=1084, h=480,
        bg_color="#0F172A", corners=20.0, strokes=solid_stroke("#2A3756"),
        layout={"mode": "vertical", "wrap": False, "gap": 24.0, "cross_gap": 0.0, "padding": [36.0, 48.0, 36.0, 48.0], "main_align": "center", "cross_align": "center", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=fill_hug
    )

    builder.create_text(parent_id=arena_box, name="Poem Title", text="Soneto de Fidelidade — Vinicius de Moraes", x=0, y=0, w=600, h=26, font_size=18.0, font_weight="Bold", color="#00F0FF", child_layout=hug_hug)
    
    # Verse with Phonetic Match Highlighting
    verse_box = builder.create_frame(
        parent_id=arena_box, name="Verse Display", x=0, y=0, w=780, h=120,
        bg_color="#1E293B", corners=14.0,
        layout={"mode": "vertical", "wrap": False, "gap": 10.0, "cross_gap": 0.0, "padding": [24.0, 24.0, 24.0, 24.0], "main_align": "center", "cross_align": "center", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=hug_hug
    )
    builder.create_text(parent_id=verse_box, name="Current Verse", text="\"De tudo, ao meu amor serei atento\"", x=0, y=0, w=680, h=36, font_size=26.0, font_weight="Bold", color="#FFFFFF", child_layout=hug_hug)
    builder.create_text(parent_id=verse_box, name="Feedback Transcricao", text="Acurácia Detectada: 98.4% • Fonemas em perfeita cadência", x=0, y=0, w=500, h=18, font_size=12.0, font_weight="Medium", color="#10B981", child_layout=hug_hug)

    # Audio Waveform Visualizer simulation
    waveform_box = builder.create_frame(
        parent_id=arena_box, name="Audio Waveform", x=0, y=0, w=640, h=64,
        layout={"mode": "horizontal", "wrap": False, "gap": 6.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "center", "cross_align": "center", "grid_columns": 16, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=hug_hug
    )
    bar_heights = [16, 28, 44, 56, 32, 48, 60, 42, 52, 36, 48, 58, 30, 20, 38, 18]
    for idx, bh in enumerate(bar_heights):
        color = "#00F0FF" if idx % 2 == 0 else "#8B5CF6"
        builder.create_rect(parent_id=waveform_box, name=f"Bar {idx}", x=0, y=0, w=6, h=bh, bg_color=color, corners=3.0)

    # Mic Control Buttons
    mic_row = builder.create_frame(
        parent_id=arena_box, name="Controls", x=0, y=0, w=400, h=64,
        layout={"mode": "horizontal", "wrap": False, "gap": 16.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "center", "cross_align": "center", "grid_columns": 2, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=hug_hug
    )
    mic_btn = builder.create_frame(
        parent_id=mic_row, name="Mic Active", x=0, y=0, w=180, h=52,
        bg_color="#EF4444", corners=14.0,
        layout={"mode": "horizontal", "wrap": False, "gap": 8.0, "cross_gap": 0.0, "padding": [12.0, 20.0, 12.0, 20.0], "main_align": "center", "cross_align": "center", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=hug_hug
    )
    builder.create_text(parent_id=mic_btn, name="Mic Text", text="🛑 Ouvindo...", x=0, y=0, w=120, h=20, font_size=14.0, font_weight="Bold", color="#FFFFFF", child_layout=hug_hug)

    next_btn = builder.create_frame(
        parent_id=mic_row, name="Next Verse", x=0, y=0, w=180, h=52,
        bg_color="#1E293B", corners=14.0, strokes=solid_stroke("#00F0FF"),
        layout={"mode": "horizontal", "wrap": False, "gap": 8.0, "cross_gap": 0.0, "padding": [12.0, 20.0, 12.0, 20.0], "main_align": "center", "cross_align": "center", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=hug_hug
    )
    builder.create_text(parent_id=next_btn, name="Next Text", text="Próximo Verso ➔", x=0, y=0, w=120, h=20, font_size=14.0, font_weight="SemiBold", color="#00F0FF", child_layout=hug_hug)


    # =========================================================================
    # SCREEN 3: FLASHCARDS (FSRS-5 SPACED REPETITION)
    # =========================================================================
    builder.nodes[str(screen_cards_id)] = {
        "id": screen_cards_id,
        "name": "3 Flashcards (FSRS Engine)",
        "type": "frame",
        "parent": 1,
        "children": [],
        "transform": [1.0, 0.0, 0.0, 1.0, 3200.0, 0.0],
        "width": 1440.0,
        "height": 960.0,
        "fills": solid_fill("#090D16"),
        "clip": True
    }
    builder.nodes["1"]["children"].append(screen_cards_id)
    add_sidebar(screen_cards_id, active_tab="flashcards")

    cards_content = builder.create_frame(
        parent_id=screen_cards_id, name="Cards Content", x=260, y=0, w=1180, h=960,
        layout={"mode": "vertical", "wrap": False, "gap": 28.0, "cross_gap": 0.0, "padding": [40.0, 48.0, 40.0, 48.0], "main_align": "min", "cross_align": "stretch", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False}
    )

    # Header
    c_head = builder.create_frame(
        parent_id=cards_content, name="Card Head", x=0, y=0, w=1084, h=60,
        layout={"mode": "horizontal", "wrap": False, "gap": 0.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "spaceBetween", "cross_align": "center", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=fill_hug
    )
    c_titles = builder.create_frame(parent_id=c_head, name="Titles", x=0, y=0, w=500, h=56, layout={"mode": "vertical", "wrap": False, "gap": 4.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "min", "cross_align": "min", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False}, child_layout=hug_hug)
    builder.create_text(parent_id=c_titles, name="Title", text="🃏 Sessão de Flashcards Ativa", x=0, y=0, w=450, h=32, font_size=24.0, font_weight="Bold", color="#FFFFFF", child_layout=hug_hug)
    builder.create_text(parent_id=c_titles, name="Sub", text="Algoritmo: Free Spaced Repetition Scheduler (FSRS-5) • Cartão 14 de 50", x=0, y=0, w=550, h=18, font_size=13.0, font_weight="Regular", color="#64748B", child_layout=hug_hug)

    # 3D Flip Card Container
    card_stage = builder.create_frame(
        parent_id=cards_content, name="Card Stage", x=0, y=0, w=1084, h=460,
        layout={"mode": "vertical", "wrap": False, "gap": 20.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "center", "cross_align": "center", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=fill_hug
    )

    card_obj = builder.create_frame(
        parent_id=card_stage, name="Card Object Front", x=0, y=0, w=720, h=380,
        bg_color="#0F172A", corners=24.0, strokes=solid_stroke("#8B5CF6"),
        layout={"mode": "vertical", "wrap": False, "gap": 16.0, "cross_gap": 0.0, "padding": [40.0, 48.0, 40.0, 48.0], "main_align": "spaceBetween", "cross_align": "stretch", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=hug_hug
    )

    card_badge = builder.create_frame(
        parent_id=card_obj, name="Deck Badge", x=0, y=0, w=160, h=28,
        bg_color="#1E293B", corners=8.0,
        layout={"mode": "horizontal", "wrap": False, "gap": 6.0, "cross_gap": 0.0, "padding": [4.0, 10.0, 4.0, 10.0], "main_align": "center", "cross_align": "center", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=hug_hug
    )
    builder.create_text(parent_id=card_badge, name="Deck Tag", text="🏷️ Algoritmos de Grafos", x=0, y=0, w=140, h=16, font_size=11.0, font_weight="SemiBold", color="#A78BFA", child_layout=hug_hug)

    builder.create_text(parent_id=card_obj, name="Card Question", text="Qual a diferença fundamental na complexidade de tempo entre o Algoritmo de Dijkstra com Min-Heap e a busca em largura (BFS)?", x=0, y=0, w=624, h=100, font_size=20.0, font_weight="SemiBold", color="#F8FAFC", child_layout=hug_hug)
    builder.create_text(parent_id=card_obj, name="Flip Hint", text="✦ Clique no card ou pressione ESPAÇO para virar e conferir a resposta ✦", x=0, y=0, w=624, h=20, font_size=12.0, font_weight="Medium", color="#64748B", child_layout=hug_hug)

    # FSRS Rating Buttons (Errei, Difícil, Bom, Fácil)
    rating_row = builder.create_frame(
        parent_id=cards_content, name="FSRS Rating Row", x=0, y=0, w=1084, h=64,
        layout={"mode": "horizontal", "wrap": False, "gap": 16.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "center", "cross_align": "center", "grid_columns": 4, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=fill_hug
    )

    ratings = [
        ("Errei (1)", "< 10 min", "#EF4444"),
        ("Difícil (2)", "2 dias", "#F59E0B"),
        ("Bom (3)", "4 dias", "#3B82F6"),
        ("Fácil (4)", "9 dias", "#10B981")
    ]
    for r_title, r_time, r_col in ratings:
        r_btn = builder.create_frame(
            parent_id=rating_row, name=f"Rate {r_title}", x=0, y=0, w=160, h=56,
            bg_color="#0F172A", corners=12.0, strokes=solid_stroke(r_col),
            layout={"mode": "vertical", "wrap": False, "gap": 2.0, "cross_gap": 0.0, "padding": [8.0, 16.0, 8.0, 16.0], "main_align": "center", "cross_align": "center", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
            child_layout=hug_hug
        )
        builder.create_text(parent_id=r_btn, name="R Label", text=r_title, x=0, y=0, w=120, h=18, font_size=13.0, font_weight="Bold", color="#FFFFFF", child_layout=hug_hug)
        builder.create_text(parent_id=r_btn, name="R Time", text=r_time, x=0, y=0, w=120, h=14, font_size=11.0, font_weight="Medium", color=r_col, child_layout=hug_hug)


    # =========================================================================
    # SCREEN 4: GRAFO NEURAL 3D / OBSIDIAN-LIKE KNOWLEDGE GRAPH
    # =========================================================================
    builder.nodes[str(screen_graph_id)] = {
        "id": screen_graph_id,
        "name": "4 Grafo Neural Interativo",
        "type": "frame",
        "parent": 1,
        "children": [],
        "transform": [1.0, 0.0, 0.0, 1.0, 4800.0, 0.0],
        "width": 1440.0,
        "height": 960.0,
        "fills": solid_fill("#050811"),
        "clip": True
    }
    builder.nodes["1"]["children"].append(screen_graph_id)
    add_sidebar(screen_graph_id, active_tab="graph")

    graph_content = builder.create_frame(
        parent_id=screen_graph_id, name="Graph Content", x=260, y=0, w=1180, h=960,
        layout={"mode": "vertical", "wrap": False, "gap": 20.0, "cross_gap": 0.0, "padding": [40.0, 48.0, 40.0, 48.0], "main_align": "min", "cross_align": "stretch", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False}
    )

    # Header
    g_head = builder.create_frame(
        parent_id=graph_content, name="Graph Head", x=0, y=0, w=1084, h=60,
        layout={"mode": "horizontal", "wrap": False, "gap": 0.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "spaceBetween", "cross_align": "center", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False},
        child_layout=fill_hug
    )
    g_titles = builder.create_frame(parent_id=g_head, name="Titles", x=0, y=0, w=500, h=56, layout={"mode": "vertical", "wrap": False, "gap": 4.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "min", "cross_align": "min", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False}, child_layout=hug_hug)
    builder.create_text(parent_id=g_titles, name="Title", text="🕸️ Grafo de Sinapses do Conhecimento", x=0, y=0, w=450, h=32, font_size=24.0, font_weight="Bold", color="#FFFFFF", child_layout=hug_hug)
    builder.create_text(parent_id=g_titles, name="Sub", text="Cosmologia de Ideias: 1.248 notas conectadas por similaridade semântica", x=0, y=0, w=550, h=18, font_size=13.0, font_weight="Regular", color="#64748B", child_layout=hug_hug)

    # Canvas Area for Neural Nodes
    canvas_node = builder.create_frame(
        parent_id=graph_content, name="Neural Canvas Area", x=0, y=0, w=1084, h=720,
        bg_color="#0A0F1D", corners=20.0, strokes=solid_stroke("#1E293B"), clip=True
    )

    # Place Graph Cluster Nodes with links
    graph_nodes_data = [
        ("NexoMente Core", 500, 320, 56, "#00F0FF"),
        ("Whisper AI Speech", 340, 200, 42, "#8B5CF6"),
        ("Poemas Clássicos", 220, 140, 32, "#A78BFA"),
        ("FSRS Flashcards", 680, 220, 44, "#10B981"),
        ("Curva de Ebbinghaus", 840, 180, 30, "#34D399"),
        ("Tamagotchi Pet XP", 620, 460, 38, "#F59E0B"),
        ("Obsidian Markdown Vault", 360, 480, 40, "#3B82F6"),
        ("Llama 3.2 Offline", 520, 160, 46, "#EC4899"),
    ]

    for g_label, gx, gy, gsize, gcolor in graph_nodes_data:
        g_circle = builder.create_frame(
            parent_id=canvas_node, name=f"Node {g_label}", x=gx, y=gy, w=gsize, h=gsize,
            bg_color=gcolor, corners=gsize/2.0,
            layout={"mode": "horizontal", "wrap": False, "gap": 0.0, "cross_gap": 0.0, "padding": [0,0,0,0], "main_align": "center", "cross_align": "center", "grid_columns": 1, "grid_rows": 1, "column_tracks": [], "row_tracks": [], "strokes_included": True, "reverse_z": False}
        )
        builder.create_text(parent_id=canvas_node, name=f"Tag {g_label}", text=g_label, x=gx - 40, y=gy + gsize + 6, w=160, h=18, font_size=11.0, font_weight="SemiBold", color="#E2E8F0")

    # Connectors / Synapse links (simulated as thin lines/rectangles)
    synapses = [
        (528, 320, 360, 240),
        (528, 320, 700, 260),
        (528, 320, 640, 460),
        (528, 320, 380, 480),
        (528, 320, 540, 200),
    ]
    for x1, y1, x2, y2 in synapses:
        # midpoint representation or bar
        mx = (x1 + x2) / 2
        my = (y1 + y2) / 2
        builder.create_rect(parent_id=canvas_node, name="Synapse Link", x=mx-20, y=my-1, w=40, h=2, bg_color="#1E293B")

    # Final document JSON
    doc_json = builder.build_document()
    return doc_json

if __name__ == "__main__":
    doc = make_prototype()
    out_dir = "/mnt/c/Users/bruno/Documents/nexomente/prototypes"
    os.makedirs(out_dir, exist_ok=True)
    
    json_path = os.path.join(out_dir, "nexomente-app.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=2)
    print("Saved document JSON:", json_path)
    
    # Save as .figcraft zip package
    figcraft_file = os.path.join(out_dir, "nexomente-app.figcraft")
    with zipfile.ZipFile(figcraft_file, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("document.json", json.dumps(doc, indent=2))
        # copy a thumbnail if exists
        thumb_source = "/mnt/c/Users/bruno/Documents/figcraft/test_render.png"
        if os.path.exists(thumb_source):
            with open(thumb_source, "rb") as tf:
                zf.writestr("thumbnail.png", tf.read())
    print("Saved .figcraft package:", figcraft_file)
