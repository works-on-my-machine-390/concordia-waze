import requests
import os
from datetime import datetime
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import networkx as nx

# ─── Configuration ────────────────────────────────────────────────────────────
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO_OWNER   = "works-on-my-machine-390"
REPO_NAME    = "concordia-waze"
OUTPUT_FILE  = r"scripts\dependency_graph.png"
# ──────────────────────────────────────────────────────────────────────────────

# ─── Task metadata ────────────────────────────────────────────────────────────
TASKS = {
    252: {"title": "Create schedule model",          "label": "backend"},
    270: {"title": "Create favorites model",         "label": "backend"},
    259: {"title": "Set up Google OAuth2",           "label": "backend"},
    248: {"title": "Build Add Class form UI",        "label": "frontend"},
    249: {"title": "Display local schedule",         "label": "frontend"},
    253: {"title": "Implement schedule endpoints",   "label": "backend"},
    260: {"title": "Google Calendar API",            "label": "backend"},
    261: {"title": "Parse calendar events",          "label": "backend"},
    250: {"title": "Persist schedule on device",     "label": "frontend"},
    251: {"title": "Connect schedule UI",            "label": "frontend"},
    256: {"title": "Add Sync GCal button",           "label": "frontend"},
    262: {"title": "Store synced events",            "label": "backend"},
    263: {"title": "Handle sync errors",             "label": "backend"},
    254: {"title": "Edit/delete class UI",           "label": "frontend"},
    257: {"title": "OAuth callback & synced events", "label": "frontend"},
    255: {"title": "Partial schedule updates",       "label": "backend"},
    267: {"title": "Next class endpoint",            "label": "backend"},
    271: {"title": "Validate favorites uniqueness",  "label": "backend"},
    258: {"title": "Prompt missing event info",      "label": "frontend"},
    264: {"title": "Next Class button UI",           "label": "frontend"},
    268: {"title": "Favorite icon on POI",           "label": "frontend"},
    265: {"title": "Fetch next class & directions",  "label": "frontend"},
    266: {"title": "Transport mode selection",       "label": "frontend"},
    269: {"title": "Display favorites list",         "label": "frontend"},
    272: {"title": "Usability Test",                 "label": "testing"},
    273: {"title": "Add E2E Tests",                  "label": "testing"},
}

# ─── Dependencies (child -> parents it depends on) ────────────────────────────
DEPENDENCIES = {
    253: [252],
    260: [259],
    261: [260],
    250: [248],
    251: [250],
    256: [259],
    262: [261],
    263: [260],
    254: [251],
    257: [256],
    255: [253],
    267: [253],
    271: [270],
    258: [257],
    264: [267],
    268: [270],
    265: [264],
    266: [265],
    269: [268],
    272: [255, 267, 271, 258, 265, 266, 269],
    273: [255, 267, 271, 258, 265, 266, 269],
}

# ─── Colours ──────────────────────────────────────────────────────────────────
COLOURS = {
    "backend":  "#4A90D9",
    "frontend": "#27AE60",
    "testing":  "#E67E22",
}

DEADLINE_LAYERS = {
    "Mar 11": [252, 270, 259, 248, 249],
    "Mar 13": [253, 260, 261, 250, 251, 256],
    "Mar 15": [262, 263, 254, 257],
    "Mar 17": [255, 267, 271, 258, 264, 268],
    "Mar 19": [265, 266, 269],
    "Mar 22": [272, 273]
}
# ──────────────────────────────────────────────────────────────────────────────


def build_graph():
    G = nx.DiGraph()

    for issue_num, meta in TASKS.items():
        G.add_node(issue_num, **meta)

    for child, parents in DEPENDENCIES.items():
        for parent in parents:
            G.add_edge(parent, child)

    return G


def compute_positions():
    """
    Assign (x, y) positions based on deadline layer (x = column)
    and spread nodes evenly within each layer (y = row).
    """
    pos = {}
    x   = 0
    for layer_label, nodes in DEADLINE_LAYERS.items():
        count = len(nodes)
        for i, node in enumerate(nodes):
            y = -(i - (count - 1) / 2.0) * 2.2
            pos[node] = (x * 5.5, y)
        x += 1
    return pos


def draw_graph(G, pos):
    fig, ax = plt.subplots(figsize=(26, 14))
    fig.patch.set_facecolor("#F8F9FA")
    ax.set_facecolor("#F8F9FA")

    # ── Node colours by label ────────────────────────────────────────────────
    node_colours = [
        COLOURS[G.nodes[n]["label"]] for n in G.nodes
    ]

    # ── Draw edges ────────────────────────────���──────────────────────────────
    nx.draw_networkx_edges(
        G, pos,
        ax=ax,
        arrows=True,
        arrowstyle="-|>",
        arrowsize=18,
        edge_color="#999999",
        width=1.4,
        connectionstyle="arc3,rad=0.08",
        min_source_margin=22,
        min_target_margin=22,
    )

    # ── Draw nodes ───────────────────────────────────────────────────────────
    nx.draw_networkx_nodes(
        G, pos,
        ax=ax,
        node_color=node_colours,
        node_size=1800,
        linewidths=1.5,
        edgecolors="#FFFFFF",
    )

    # ── Issue number labels (inside node) ────────────────────────────────────
    nx.draw_networkx_labels(
        G, pos,
        ax=ax,
        labels={n: f"#{n}" for n in G.nodes},
        font_size=8,
        font_color="white",
        font_weight="bold",
    )

    # ── Task title labels (below node) ───────────────────────────────────────
    title_pos = {n: (x, y - 1.05) for n, (x, y) in pos.items()}
    nx.draw_networkx_labels(
        G, title_pos,
        ax=ax,
        labels={n: _wrap(G.nodes[n]["title"], 18) for n in G.nodes},
        font_size=6.5,
        font_color="#333333",
    )

    # ── Deadline column headers ───────────────────────────────────────────────
    x_positions = {}
    xi = 0
    for layer_label in DEADLINE_LAYERS:
        x_positions[layer_label] = xi * 5.5
        xi += 1

    y_max = max(y for _, y in pos.values()) + 2.4
    for layer_label, xval in x_positions.items():
        ax.text(
            xval, y_max, layer_label,
            ha="center", va="center",
            fontsize=9, fontweight="bold", color="#333333",
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#DEE2E6",
                      edgecolor="#ADB5BD", linewidth=1),
        )

    # ── Legend ────────────────────────────────────────────────────────────────
    legend_handles = [
        mpatches.Patch(color=colour, label=label.capitalize())
        for label, colour in COLOURS.items()
    ]
    ax.legend(
        handles=legend_handles,
        loc="lower left",
        fontsize=9,
        framealpha=0.9,
        edgecolor="#CCCCCC",
    )

    ax.set_title(
        "Task Dependency Graph  |  Sprint 5",
        fontsize=14,
        fontweight="bold",
        color="#222222",
        pad=20,
    )
    ax.axis("off")
    plt.tight_layout()
    return fig


def _wrap(text, max_chars):
    """Wrap a string at the nearest space before max_chars."""
    if len(text) <= max_chars:
        return text
    words   = text.split()
    lines   = []
    current = ""
    for word in words:
        if len(current) + len(word) + 1 <= max_chars:
            current = f"{current} {word}".strip()
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return "\n".join(lines)


def main():
    G   = build_graph()
    pos = compute_positions()
    fig = draw_graph(G, pos)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    fig.savefig(OUTPUT_FILE, dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    print(f"Saved -> '{OUTPUT_FILE}'")
    plt.show()


if __name__ == "__main__":
    main()