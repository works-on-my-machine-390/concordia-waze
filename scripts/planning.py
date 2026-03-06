import requests
import os
from datetime import datetime, timedelta
from collections import defaultdict

# ─── Configuration ────────────────────────────────────────────────────────────
GITHUB_TOKEN  = os.getenv("GITHUB_TOKEN")
REPO_OWNER    = "works-on-my-machine-390"
REPO_NAME     = "concordia-waze"
MILESTONE     = "sprint-5"
MD_FILE       = r"scripts\sprint5plan.md"

# ─── Sprint Parameters ────────────────────────────────────────────────────────
SPRINT_START  = "2026-03-09"
SPRINT_END    = "2026-03-22"
NUM_PEOPLE    = 11
# ──────────────────────────────────────────────────────────────────────────────

# ─── Per-task deadlines ───────────────────────────────────────────────────────
TASK_DEADLINES = {
    252: "2026-03-11",
    270: "2026-03-11",
    259: "2026-03-11",
    248: "2026-03-11",
    249: "2026-03-11",
    253: "2026-03-13",
    260: "2026-03-13",
    261: "2026-03-13",
    250: "2026-03-13",
    251: "2026-03-13",
    256: "2026-03-13",
    262: "2026-03-15",
    263: "2026-03-15",
    254: "2026-03-15",
    257: "2026-03-15",
    255: "2026-03-17",
    267: "2026-03-17",
    271: "2026-03-17",
    258: "2026-03-17",
    264: "2026-03-17",
    268: "2026-03-17",
    265: "2026-03-19",
    266: "2026-03-19",
    269: "2026-03-19",
    273: "2026-03-22",
}
# ──────────────────────────────────────────────────────────────────────────────


# ─── GitHub helpers ───────────────────────────────────────────────────────────

def get_milestone_number(owner, repo, milestone_title, headers):
    url = f"https://api.github.com/repos/{owner}/{repo}/milestones"
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    for ms in response.json():
        if ms["title"].lower() == milestone_title.lower():
            return ms["number"]
    raise ValueError(f"Milestone '{milestone_title}' not found.")


def get_issues_by_label(owner, repo, label, milestone_number, headers):
    issues, page = [], 1
    while True:
        url = f"https://api.github.com/repos/{owner}/{repo}/issues"
        params = {
            "labels":    label,
            "milestone": milestone_number,
            "state":     "all",
            "per_page":  100,
            "page":      page,
        }
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        if not data:
            break
        issues.extend([i for i in data if "pull_request" not in i])
        page += 1
    return issues


# ─── Assignment helper ────────────────────────────────────────────────────────

def assign_tasks(issues_by_label, num_people, task_deadlines,
                 sprint_start: datetime, sprint_end: datetime):
    ORDER      = ["backend", "frontend", "testing"]
    all_issues = []
    for label in ORDER:
        for issue in issues_by_label.get(label, []):
            all_issues.append((label, issue))

    def sort_key(item):
        _, issue = item
        dl_str   = task_deadlines.get(issue["number"])
        dl       = datetime.strptime(dl_str, "%Y-%m-%d") if dl_str else sprint_end
        return (dl, issue["number"])

    all_issues.sort(key=sort_key)

    result         = []
    person_counter = 1

    for label, issue in all_issues:
        dl_str   = task_deadlines.get(issue["number"])
        deadline = (
            datetime.strptime(dl_str, "%Y-%m-%d").strftime("%b %d")
            if dl_str
            else sprint_end.strftime("%b %d")
        )
        # Store the full YYYY-MM-DD alongside the display string
        deadline_iso = dl_str if dl_str else sprint_end.strftime("%Y-%m-%d")

        result.append({
            "number":       issue["number"],
            "title":        issue["title"],
            "label":        label,
            "person":       f"P{person_counter}",
            "deadline":     deadline,       # "Mar 11"  – display only
            "deadline_iso": deadline_iso,   # "2026-03-11" – for sorting
        })
        person_counter = (person_counter % num_people) + 1

    return result


# ─── Markdown builder ─────────────────────────────────────────────────────────

def build_markdown(issues_by_label, start: datetime, end: datetime,
                   num_people: int) -> str:

    tasks = assign_tasks(
        issues_by_label, num_people, TASK_DEADLINES, start, end
    )

    lines = []

    # ── Title ────────────────────────────────────────────────────────────────
    lines.append(
        f"# Sprint Gantt Chart  ·  "
        f"{start.strftime('%b %d')} – {end.strftime('%b %d, %Y')}"
    )
    lines.append("")
    lines.append(
        f"> **Sprint duration:** {(end - start).days + 1} days  ·  "
        f"**Team size:** {num_people} people  ·  "
        f"**Final deadline:** {end.strftime('%b %d')}"
    )
    lines.append("")

    # ── Main table ────────────────────────────────────────────────────────────
    lines.append("## Task Assignment Table")
    lines.append("")
    lines.append("| # | Task | Assigned To | Deadline |")
    lines.append("|---|------|-------------|----------|")

    for t in tasks:
        number   = f"`#{t['number']}`"
        title    = t["title"].replace("|", "\\|")
        person   = f"**{t['person']}**"
        deadline = f"**{t['deadline']}**"
        lines.append(f"| {number} | {title} | {person} | {deadline} |")

    lines.append("")

    # ── Key Deadlines summary ─────────────────────────────────────────────────
    lines.append("---")
    lines.append("")
    lines.append("## Key Deadlines")
    lines.append("")
    lines.append("| Deadline | Issues |")
    lines.append("|----------|--------|")

    # Group by ISO date to sort correctly, display the formatted string
    deadline_map: dict[str, dict] = defaultdict(lambda: {"display": "", "issues": []})
    for t in tasks:
        deadline_map[t["deadline_iso"]]["display"] = t["deadline"]
        deadline_map[t["deadline_iso"]]["issues"].append(f"`#{t['number']}`")

    for iso_date, entry in sorted(deadline_map.items()):
        lines.append(
            f"| **{entry['display']}** | {', '.join(entry['issues'])} |"
        )

    lines.append("")

    # ── Person summary ────────────────────────────────────────────────────────
    lines.append("---")
    lines.append("")
    lines.append("## Person Summary")
    lines.append("")
    lines.append("| Person | Assigned Issues | Count |")
    lines.append("|--------|-----------------|-------|")

    person_map: dict[str, list[str]] = defaultdict(list)
    for t in tasks:
        person_map[t["person"]].append(f"`#{t['number']}`")

    for person in [f"P{n}" for n in range(1, num_people + 1)]:
        issues_str = ", ".join(person_map.get(person, [])) or "—"
        count      = len(person_map.get(person, []))
        lines.append(f"| **{person}** | {issues_str} | {count} |")

    lines.append("")

    return "\n".join(lines)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    if not GITHUB_TOKEN:
        raise EnvironmentError(
            "GITHUB_TOKEN not set. Run: $env:GITHUB_TOKEN='your_token'"
        )

    headers = {
        "Authorization":        f"Bearer {GITHUB_TOKEN}",
        "Accept":               "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    sprint_start = datetime.strptime(SPRINT_START, "%Y-%m-%d")
    sprint_end   = datetime.strptime(SPRINT_END,   "%Y-%m-%d")

    if sprint_end <= sprint_start:
        raise ValueError("SPRINT_END must be after SPRINT_START.")

    # ── Milestone ────────────────────────────────────────────────────────────
    print(f"Looking up milestone '{MILESTONE}'...")
    milestone_number = get_milestone_number(
        REPO_OWNER, REPO_NAME, MILESTONE, headers
    )
    print(f"Milestone #{milestone_number} found.")

    # ── Fetch issues ─────────────────────────────────────────────────────────
    all_labels      = ["backend", "frontend", "testing"]
    issues_by_label = {}
    for label in all_labels:
        print(f"Fetching '{label}' issues...")
        issues = get_issues_by_label(
            REPO_OWNER, REPO_NAME, label, milestone_number, headers
        )
        issues_by_label[label] = issues
        print(f"{len(issues)} issue(s) found.")

    # ── Build Markdown ───────────────────────────────────────────────────────
    print(f"\nBuilding task table "
          f"({sprint_start.strftime('%b %d')} → "
          f"{sprint_end.strftime('%b %d, %Y')}, "
          f"{NUM_PEOPLE} people)...")

    md_content = build_markdown(
        issues_by_label, sprint_start, sprint_end, NUM_PEOPLE
    )

    # ── Write file ───────────────────────────────────────────────────────────
    os.makedirs(os.path.dirname(MD_FILE), exist_ok=True)
    with open(MD_FILE, "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"\nSaved → '{MD_FILE}'")


if __name__ == "__main__":
    main()