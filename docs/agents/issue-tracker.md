# Issue-Tracker: GitHub

Issues und Specs für dieses Repo liegen als GitHub Issues. Nutze für alle Operationen die `gh`-CLI.

## Konventionen

- **Issue anlegen**: `gh issue create --title "..." --body "..."`. Für mehrzeilige Bodys ein Heredoc verwenden.
- **Issue lesen**: `gh issue view <nummer> --comments`, Kommentare per `jq` filtern und auch die Labels abrufen.
- **Issues auflisten**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` mit passenden `--label`- und `--state`-Filtern.
- **Issue kommentieren**: `gh issue comment <nummer> --body "..."`
- **Labels setzen / entfernen**: `gh issue edit <nummer> --add-label "..."` / `--remove-label "..."`
- **Schließen**: `gh issue close <nummer> --comment "..."`

Das Repo wird aus `git remote -v` abgeleitet; `gh` erledigt das automatisch, wenn es innerhalb eines Clones läuft.

## Pull Requests als Triage-Fläche

**PRs als Anfragefläche: nein.** _(Auf `ja` setzen, wenn dieses Repo externe PRs als Feature-Anfragen behandelt; `/triage` liest dieses Flag.)_

Bei `ja` durchlaufen PRs dieselben Labels und Zustände wie Issues, über die `gh pr`-Entsprechungen:

- **PR lesen**: `gh pr view <nummer> --comments` und `gh pr diff <nummer>` für den Diff.
- **Externe PRs für die Triage auflisten**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`, dann nur `authorAssociation` von `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR` oder `NONE` behalten (`OWNER`/`MEMBER`/`COLLABORATOR` verwerfen).
- **Kommentieren / labeln / schließen**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub teilt sich einen Nummernraum für Issues und PRs, daher kann ein bloßes `#42` beides sein: mit `gh pr view 42` auflösen und auf `gh issue view 42` zurückfallen.

## Wenn ein Skill sagt „im Issue-Tracker veröffentlichen"

Ein GitHub Issue anlegen.

## Wenn ein Skill sagt „das passende Ticket holen"

`gh issue view <nummer> --comments` ausführen.

## Wayfinding-Operationen

Wird von `/wayfinder` genutzt. Die **Map** ist ein einzelnes Issue mit **Kind-Issues** als Tickets.

- **Map**: ein einzelnes Issue mit Label `wayfinder:map`, das den Body aus Notizen / bisherigen Entscheidungen / Fog enthält. `gh issue create --label wayfinder:map`.
- **Kind-Ticket**: ein Issue, das als GitHub-Sub-Issue mit der Map verknüpft ist (`gh api` auf den Sub-Issues-Endpunkt). Wo Sub-Issues nicht aktiviert sind, das Kind zu einer Task-Liste im Map-Body hinzufügen und `Part of #<map>` an den Anfang des Kind-Bodys setzen. Labels: `wayfinder:<typ>` (`research`/`prototype`/`grilling`/`task`). Nach Übernahme wird das Ticket dem umsetzenden Entwickler zugewiesen.
- **Blockierung**: GitHubs **native Issue-Abhängigkeiten**, die kanonische, in der UI sichtbare Darstellung. Eine Kante mit `gh api --method POST repos/<owner>/<repo>/issues/<kind>/dependencies/blocked_by -F issue_id=<blocker-db-id>` hinzufügen, wobei `<blocker-db-id>` die numerische **Datenbank-ID** des Blockers ist (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _nicht_ die `#nummer` oder `node_id`). GitHub meldet `issue_dependencies_summary.blocked_by` (nur offene Blocker, das aktive Gate). Wo Abhängigkeiten nicht verfügbar sind, auf eine Zeile `Blocked by: #<n>, #<n>` am Anfang des Kind-Bodys zurückfallen. Ein Ticket ist entblockt, wenn jeder Blocker geschlossen ist.
- **Frontier-Abfrage**: die offenen Kinder der Map auflisten (`gh issue list --state open`, auf die Sub-Issues / Task-Liste der Map eingegrenzt), alle mit offenem Blocker (`issue_dependencies_summary.blocked_by > 0` oder ein offenes Issue in der `Blocked by`-Zeile) oder mit Zuweisung verwerfen; das erste in Map-Reihenfolge gewinnt.
- **Übernahme (Claim)**: `gh issue edit <n> --add-assignee @me`, der erste Schreibvorgang der Sitzung. Für **Implementierungs-Tickets** (`wayfinder:task`, die Produktionscode liefern) direkt nach dem Claim einen **eigenen Git-Worktree aus aktuellem `main`** anlegen und ausschließlich darin arbeiten (siehe `CLAUDE.md` → Git-Workflow → „Worktree je Implementierungs-Session") — so stören parallele Agenten die Umsetzung nicht.
- **Auflösung**: `gh issue comment <n> --body "<antwort>"`, dann `gh issue close <n>`, dann einen Kontext-Verweis (Gist + Link) an die bisherigen Entscheidungen der Map anhängen.
