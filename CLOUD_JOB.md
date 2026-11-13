# Cloud question-bank upkeep

`.github/workflows/replenish.yml` runs daily on GitHub-hosted Ubuntu at 14:17 UTC (9:17 am New York in winter, 10:17 am in summer). No laptop or open Codex app is required. GitHub schedules may be delayed; the five-day buffer protects the publication horizon. Scheduled workflows in inactive public repositories can be disabled by GitHub after 60 days without activity; successful bank commits normally keep this repository active.

The free bank check counts future dates using America/New_York as requested by the owner. The game still changes sets at midnight Asia/Kolkata. When five or fewer future scheduled days remain, the check job first generates and retains an independent random plan using `node scripts/plan-bank.cjs`. The research job creates 36 question sets for those sampled slots and appends 12 days. Each day has three distinct regions drawn from all 36; all 36 are eligible again tomorrow, including yesterday’s regions. No batch-wide coverage or geographic-group quota applies. Repeated regions require entirely new facts. The publisher checks assignments against the original plan artifact, so research cannot replace random draws with a balanced rotation. It preserves the full historical bank and retired ledger. Generation uses the official Codex Action and an OpenAI API key; API usage is billed to the key's project. No API key is delivered to the public website.

## Finish setup

1. Create a project API key in the OpenAI platform with funded API access.
2. In GitHub repository Settings → Secrets and variables → Actions, add a repository secret named `OPENAI_API_KEY`. Never put the value into a chat, source file or workflow.
3. Run **Replenish Statewise questions** manually with **check_only** checked. This validates the bank, game tests and API authentication without generating content or incurring generation charges.
4. Run without check_only when the bank actually needs replenishment, then verify research, publication, Pages and live-bank checks. Until that passes, retain the old Codex schedule as backup. Disable the old schedule after the replacement is verified to avoid duplicate generation.

The research runner has read-only GitHub access and no persisted checkout credential. A fresh publisher runner uses trusted validation code, enforces a complete append-only batch and report, checks all new source URLs using TLS, runs game tests and rejects concurrent changes to main. Only questions.json is committed. The report is retained in the run artifacts for 30 days. Automated structural and link checks cannot prove factual truth or semantic uniqueness; the research agent must read sources and perform that editorial review.

GitHub token pushes do not automatically trigger Pages or other push workflows. The publisher explicitly requests a branch-based Pages build and waits for its own commit plus an exact live questions.json match. Hosting remains main at the repository root. The same validation/tests run in the publisher even though the separate push CI is not triggered by its bot commit.

Missing credentials, incomplete research, broken sources, concurrent edits or deployment errors fail the workflow without replacing the prior bank (a deployment error after commit leaves the verified commit in main). See the Actions run log and artifacts; enable GitHub Actions failure emails in your GitHub notification settings. Successful publications appear in the run summary. Unchanged daily checks do not post messages or open issues.
