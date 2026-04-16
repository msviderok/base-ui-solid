# `.kb/_snapshots/`

Verbatim cached copies of upstream guidance sources. **Do not edit by hand.**

Only the "sync KB" procedure (documented in [`../README.md`](../README.md))
rewrites these files.

## Snapshot file format

Every snapshot file begins with a single HTML comment header:

```text
<!-- KB SNAPSHOT — do not edit by hand. Source: <absolute path>. Last synced: YYYY-MM-DD. -->
```

Everything after the header (and the blank line that follows it) is the
verbatim contents of the source file at the time of the last sync.

The header is the only metadata "sync KB" needs: it gives the absolute source
path to diff against and the date the last sync recorded.

## Why snapshots are tracked in git

So that drift history is visible in PRs. Yes, "sync KB" runs produce
repetitive diffs — that's the cost. The benefit is that anyone reviewing a
sync PR can see exactly what changed upstream.

## Tracked sources

| Snapshot | Source path |
|---|---|
| `AGENTS.md` | `/Users/msv/codeforfun/base-ui/AGENTS.md` |
| `CLAUDE.md` | `/Users/msv/codeforfun/base-ui/CLAUDE.md` |
| `cursor-base-ui-solid-port.SKILL.md` | `~/.cursor/projects/Users-msv-codeforfun-base-ui/skills/base-ui-solid-port/SKILL.md` |
| `cursor-solid-rules.AGENTS.md` | `~/.cursor/projects/Users-msv-codeforfun-base-ui/skills/solid-rules/AGENTS.md` |
| `cursor-testing.SKILL.md` | `~/.cursor/projects/Users-msv-codeforfun-base-ui/skills/testing/SKILL.md` |

When a new upstream guidance source appears, add a row here, create the
snapshot file, and update [`../README.md`](../README.md) "Upstream sources".
