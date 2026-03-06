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

# ─── Per-task deadlines (issue number -> YYYY-MM-DD) ──────────────────────────
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
    272: "2026-03-22",
    273: "2026-03-22",
}

# ─── Explicit assignments (issue number -> person number) ─────────────────────
#
# Backend (P1-P5):
#   P1 - schedule model (#252) + sync error handling (#263)
#   P2 - favorites model (#270) + next class endpoint (#267)
#   P3 - OAuth setup (#259) + Calendar API (#260) + uniqueness check (#271)
#   P4 - schedule endpoints (#253) + partial updates (#255)
#   P5 - parse events (#261) + store events (#262)
#
# Frontend (P6-P11):
#   P6  - add class form (#248) + persist schedule (#250) + next class btn (#264)
#   P7  - schedule display (#249) + connect UI (#251) + favorites icon (#268)
#   P8  - sync button (#256) + OAuth callback (#257) + transport mode (#266)
#   P9  - edit/delete UI (#254) + missing info prompt (#258)
#   P10 - fetch next class (#265) + E2E tests (#273)
#   P11 - favorites list (#269) + usability test (#272)
#
ASSIGNMENTS = {
    # Backend
    252: 1,
    263: 1,
    270: 2,
    267: 2,
    259: 3,
    260: 3,
    271: 3,
    253: 4,
    255: 4,
    261: 5,
    262: 5,
    # Frontend
    248: 6,
    250: 6,
    264: 6,
    249: 7,
    251: 7,
    268: 7,
    256: 8,
    257: 8,
    266: 8,
    254: 9,
    258: 9,
    265: 10,
    273: 10,
    269: 11,
    272: 11,
}

# ─── Role map ─────────────────────────────────────────────────────────────────
PERSON_ROLES = {
    1:  "Backend",
    2:  "Backend",
    3:  "Backend",
    4:  "Backend",
    5:  "Backend",
    6:  "Frontend",
    7:  "Frontend",
    8:  "Frontend",
    9:  "Frontend",
    10: "Frontend / Testing",
    11: "Frontend / Testing",
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


# ─── Assignment ───────────────────────────────────────────────────────────────

def assign_tasks(issues_by_label, assignments, task_deadlines, sprint_end):
    ORDER      = ["backend", "frontend", "testing"]
    all_issues = []
    seen       = set()

    for label in ORDER:
        for issue in issues_by_label.get(label, []):
            if issue["number"] not in seen:
                all_issues.append((label, issue))
                seen.add(issue["number"])

    def sort_key(item):
        _, issue = item
        dl_str   = task_deadlines.get(issue["number"])
        dl       = datetime.strptime(dl_str, "%Y-%m-%d") if dl_str else sprint_end
        return (dl, issue["number"])

    all_issues.sort(key=sort_key)

    result = []
    for label, issue in all_issues:
        dl_str       = task_deadlines.get(issue["number"])
        deadline     = (
            datetime.strptime(dl_str, "%Y-%m-%d").strftime("%b %d")
            if dl_str else sprint_end.strftime("%b %d")
        )
        deadline_iso = dl_str if dl_str else sprint_end.strftime("%Y-%m-%d")
        person_num   = assignments.get(issue["number"])
        person       = f"P{person_num}" if person_num else "UNASSIGNED"

        result.append({
            "number":       issue["number"],
            "title":        issue["title"],
            "label":        label,
            "person":       person,
            "deadline":     deadline,
            "deadline_iso": deadline_iso,
        })

    return result


# ─── Markdown builder ─────────────────────────────────────────────────────────

def build_markdown(issues_by_label, start, end):
    tasks = assign_tasks(
        issues_by_label, ASSIGNMENTS, TASK_DEADLINES, end
    )

    lines = []

    # Title
    lines.append(
        f"# Sprint Plan  |  "
        f"{start.strftime('%b %d')} - {end.strftime('%b %d, %Y')}"
    )
    lines.append("")
    lines.append(
        f"> Sprint duration: {(end - start).days + 1} days  |  "
        f"Team size: {NUM_PEOPLE} people  |  "
        f"Final deadline: {end.strftime('%b %d')}"
    )
    lines.append("")

    # Main table
    lines.append("## Task Assignment Table")
    lines.append("")
    lines.append("| # | Task | Label | Assigned To | Deadline |")
    lines.append("|---|------|-------|-------------|----------|")

    for t in tasks:
        number   = f"`#{t['number']}`"
        title    = t["title"].replace("|", "\\|")
        label    = f"`{t['label']}`"
        person   = f"**{t['person']}**"
        deadline = f"**{t['deadline']}**"
        lines.append(f"| {number} | {title} | {label} | {person} | {deadline} |")

    lines.append("")

    # Key Deadlines
    lines.append("---")
    lines.append("")
    lines.append("## Key Deadlines")
    lines.append("")
    lines.append("| Deadline | Issues |")
    lines.append("|----------|--------|")

    deadline_map = defaultdict(lambda: {"display": "", "issues": []})
    for t in tasks:
        deadline_map[t["deadline_iso"]]["display"] = t["deadline"]
        deadline_map[t["deadline_iso"]]["issues"].append(f"`#{t['number']}`")

    for iso_date, entry in sorted(deadline_map.items()):
        lines.append(f"| **{entry['display']}** | {', '.join(entry['issues'])} |")

    lines.append("")

    # Person Summary
    lines.append("---")
    lines.append("")
    lines.append("## Person Summary")
    lines.append("")
    lines.append("| Person | Role | Assigned Issues | Count |")
    lines.append("|--------|------|-----------------|-------|")

    person_map = defaultdict(list)
    for t in tasks:
        person_map[t["person"]].append(f"`#{t['number']}`")

    for n in range(1, NUM_PEOPLE + 1):
        person     = f"P{n}"
        role       = PERSON_ROLES.get(n, "-")
        issues_str = ", ".join(person_map.get(person, [])) or "-"
        count      = len(person_map.get(person, []))
        lines.append(f"| **{person}** | {role} | {issues_str} | {count} |")

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

    print(f"Looking up milestone '{MILESTONE}'...")
    milestone_number = get_milestone_number(
        REPO_OWNER, REPO_NAME, MILESTONE, headers
    )
    print(f"Milestone #{milestone_number} found.")

    all_labels      = ["backend", "frontend", "testing"]
    issues_by_label = {}
    for label in all_labels:
        print(f"Fetching '{label}' issues...")
        issues = get_issues_by_label(
            REPO_OWNER, REPO_NAME, label, milestone_number, headers
        )
        issues_by_label[label] = issues
        print(f"-> {len(issues)} issue(s) found.")

    print(
        f"\nBuilding task table "
        f"({sprint_start.strftime('%b %d')} -> "
        f"{sprint_end.strftime('%b %d, %Y')})..."
    )

    md_content = build_markdown(issues_by_label, sprint_start, sprint_end)

    os.makedirs(os.path.dirname(MD_FILE), exist_ok=True)
    with open(MD_FILE, "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"\nSaved -> '{MD_FILE}'")


if __name__ == "__main__":
    main()