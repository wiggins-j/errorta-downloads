# Errorta Downloads

> **Generated — do not edit this repository directly.** These files are published
> from an upstream source by a sync script; any edit made here is overwritten on
> the next publish. To change the site, edit the upstream source and re-run the
> sync.

This repository hosts the public landing page for Errorta at
<https://errorta.app> (served by GitHub Pages from `main`).

## What Errorta is

Errorta is a desktop AI harness that **combines local and cloud models
into one team** to ship real software. It is local-capable, not
local-only: keep everything on your laptop, run models on your own
machine over SSH, or reach for the cloud - you decide where your data
and compute live.

What it does:

- **PM-guided coding team.** Give Errorta a goal; a project-manager
  agent breaks it into a task backlog, assigns each task to a developer,
  reviewer, or tester, and drives the work through branches, pull
  requests, structured review, and real sandboxed test runs.
- **Any model, mixed.** Use Claude, Codex, and Cursor CLI subscriptions,
  local models on Ollama, and Anthropic / OpenAI / Google APIs in a
  single team. The PM assigns the cheapest capable model to each task,
  escalates only when it has to, and learns which models handle which
  work well.
- **The Council.** Convene several models to deliberate in a shared room
  across topologies (parallel answers, round-robin, debate,
  moderator-led, blind review), with per-member visibility policy, a
  finalizer or neutral judge, and byte-level inspectable context.
- **Knowledge & grounding.** Build a corpus from a markdown brief, drag
  in your own documents, or watch a folder. Answers come back with
  citations, a judge's verdict, and corrections that carry forward -
  built in tandem with the open-source
  [AIAR](https://github.com/wiggins-j/aiar) framework (retrieval,
  LLM-as-judge, grounding/correction).
- **Mobile companion.** An iOS app pairs with your desktop over your own
  network to follow runs, approve steps, and steer from your phone.
- **Local service API.** Other apps on your machine can call Errorta as
  their AI backend through a consent-gated local API.

## Status

Errorta is in active development. There is no public installer yet.
The landing page collects alpha-notification and tester signups. When
installer builds are ready they will be published on the
[GitHub Releases page](https://github.com/wiggins-j/errorta-downloads/releases)
with SHA-256 checksums in the release notes.

The one asset published today is the welcome-corpus tarball used by
first-time Errorta users - public onboarding copy, safe to download.

## License

The contents of this downloads repository are licensed under
Apache-2.0. See [LICENSE.md](LICENSE.md).

## Contact

For landing-page problems, alpha access, or joining the testers list,
email <help@errorta.app>.
