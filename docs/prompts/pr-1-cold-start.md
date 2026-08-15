# PR #1 — cold-start task prompt

Gives a model the PR #1 merge question with no prior context, so it works the
problem from scratch. Use this to get an independent read, or to compare how
different models handle it.

## Setting up a clean environment

The prompt only works if the model cannot find the answers lying around. This
branch carries [`pr-1-handoff.md`](pr-1-handoff.md), which spells everything out,
and the port commit's message summarises the findings — so clone `master` alone:

```bash
git clone --branch master --single-branch /Users/rob/Developer/experiment/slido-clone slido-cold
```

`--single-branch` matters. A plain clone of the local repo copies every local
branch, including the port, and the run is contaminated before it starts.

Point the model at `slido-cold`, then paste the prompt below with the path
adjusted.

## Reproducing the original two-turn shape

Ask part 1 on its own and judge the answer before giving part 2. That shows
whether a model investigates properly when it has no idea more work is coming —
which is the more interesting question than whether it can follow instructions it
has already read.

## The prompt

```
You have access to a git repository at <PATH> (GitHub: augmentable/project-slido).
It has an open pull request:
https://github.com/augmentable/project-slido/pull/1

Two things, in order.

1. Answer this question: "What merge strategy should I use to merge PR #1 into main?"

   Investigate the repo before answering, and check the question's premises against
   what you actually find. Base the recommendation on the real state of this PR and
   the branch it targets, not on general best practice.

2. Then carry out whatever rework your answer implies, on a local branch.

   The PR author is unavailable and cannot be asked to change anything or to help,
   so any work the PR needs is yours to do. Preserve their authorship where git
   allows it.

Constraints:

- Work on a local branch. Do not push, do not modify master or main, do not touch
  the remote or the PR itself. Ask before any outward-facing action.
- Finish the whole job. The branch should end up genuinely mergeable, with the PR's
  features actually working — not merely compiling.
- Verify what you produce: typecheck, lint, build, the test suite, and the app
  actually running. Report results honestly. If something is broken, determine
  whether it was already broken before your changes and say which. Never describe
  something as verified if you did not run it.
- Tell me what you decided and why, particularly anywhere you had to resolve an
  ambiguity in the PR author's intent.
```

## Judging the result

Deliberately not listed here, so this file stays safe to leave in a clone. The
findings are in [`pr-1-handoff.md`](pr-1-handoff.md); read that to mark the work.
