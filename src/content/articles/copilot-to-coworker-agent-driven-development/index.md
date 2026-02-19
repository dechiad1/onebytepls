---
title: "From Copilot to Coworker" 
date: 2026-02-19
description: "A Practical Guide to Agent-Driven Development"
tags:
  - claude code
  - AI workflow
---

I’ve spent the last several months building software projects with agents because I believe software engineering is about to change fundamentally.

I began my Claude Code journey in May 2025. Day one saw me coding line by line in the terminal, describing functions with prose longer than the code itself. Today, after months of iteration, I spend my time writing and refining plans and breaking these down into an issue tracker. Claude Code processes implement those issues. I inspect outcomes and systematically correct the mistakes that these short-lived agent sessions inevitably produce.

What follows are a few stages I've moved through, each one building on the last. I'll include some examples and explain how I got results. This shift is about restructuring how work gets done. Over time, people and teams that adapt will move faster than those that don’t.

---

## Stage One: Watch Over the Model and Audit Every Line

This is a great place to start. You install Claude Code, open a terminal, and start typing natural language descriptions of what you want. The agent writes code and you read every line. You accept some, reject others, paste in corrections. It feels like pair programming where your partner is fast but careless.

At this stage, planning and implementation happen simultaneously. You're thinking through the feature as you prompt. The agent generates a function, you realize an edge case, you describe it, and it regenerates. It's a conversation that produces code, not a plan that gets executed.

**What you'll notice**: the agent lacks context. It doesn't know your conventions, your architecture, your domain vocabulary. It writes code that works in isolation but doesn't fit. You spend most of your time correcting course like renaming variables to match your patterns, moving logic to the right layer, fixing imports.

**How to get here**: Install Claude Code and take a branch off main for any project out there. Prompt it through a full feature. Start small and gradually give it larger tasks. Then test the app itself, not just the code. Accept that you'll rewrite half of what it produces. The goal isn't efficiency, it's calibration. You're learning what the agent gets right and what it consistently gets wrong. Those patterns become the foundation for everything that follows.

---

## Stage Two: Upfront Planning

You’ll quickly want to stop planning inline and instead invest in well-written prompts. Instead of describing features conversationally, you write them down in a markdown file or using spec driven development. The agent reads the full spec at the start of a session and executes against it.

This worked well initially, until I found myself losing track of progress on large features across days and  coding sessions. I would find myself coming back to a prompt confused where I left off and the sprawl of markdown files in my workspace offered no hints of what to do next. This required me to refresh my own context, often spending twenty minutes figuring out what I wanted to happen. It became clear I needed a better way to persist state and rebuild context across sessions for both agents and myself. 

How do I solve this problem as a professional? I use an issue tracker. I thought the same strategy would work well for vibe coding and I landed on [Beads](https://github.com/steveyegge/beads): a CLI interface that stores issues as JSON. The key breakthroughs came from instructing the agent to interact with the issue tracker and designing the implementation workflow around issue scope.

Instead of providing the full plan at the beginning of a session and trying to pass to-do lists through to sub-agents or follow-up sessions, I create a chain of dependent tasks and have a new session tackle each one. This "smaller loop" takes the pain and repetitive tasks out of manually rebuilding context as you work your way through a large feature. Here's a sample of a spec created from spec driven development and then its conversion into issues. The topic is cloud deployment. 

```
## Why

The application runs locally and needs to be deployed to the cloud so users can access it remotely. The hexagonal architecture isolates all infrastructure behind ports, making the cloud service provider swap (AWS to GCP) and the addition of auth straightforward -- new adapters, same domain.

## What Changes

- **Static frontend hosting**: Serve built frontend assets from Cloudflare (Pages or R2 + CDN)
- **API hosting**: Deploy the FastAPI backend to Google Cloud Run
- **Request routing**: Cloudflare Worker sits in front, routing `/v1/api/*` to Cloud Run and serving static assets for everything else. Single domain, unified entry point.
- **Authentication**: Auth0 (free tier) with Google and Apple social providers. Single Auth0 tenant shared across all cloud environments (dev, staging, prod). API validates Auth0 JWTs on protected routes.
- **User management & gating**: New `user` table in the application database. When a user authenticates for the first time, an entry is created with `enabled=false`. Unapproved users see a static "thanks for signing up, someone will reach out" page. Admins manually flip `enabled=true` in the database to grant access. Permissions and roles stored in the user table, not in Auth0 token claims.
- **Object storage**: **BREAKING** -- Replace AWS S3 adapter with Google Cloud Storage adapter behind the existing storage port.
- **Database**: Migrate from local Postgres to Google Cloud SQL (Postgres). No schema changes, just connection config.
- **Environment configuration**: Add cloud environment configs (`config-dev.yml`, `config-prod.yml`) with GCP connection strings, Auth0 settings, and Cloudflare endpoints.

## Capabilities

### New Capabilities

- `cloud-infra`: IaC and configuration for GCP services (Cloud Run, Cloud SQL, Cloud Storage), Cloudflare (Pages/R2, Worker, DNS), and environment-specific config files
- `user-auth`: Auth0 integration (JWT validation middleware, social provider config), user table (schema, model, repository), signup gating flow (enabled flag, approval page), and role/permission model
- `cloudflare-routing`: Cloudflare Worker that routes requests between static assets and the Cloud Run API under a single domain

### Modified Capabilities

_(none -- the existing domain ports remain unchanged; only new adapter implementations are added)_

## Impact

- **Adapters**: New GCP adapters for Cloud Storage (object store), replacing AWS S3 implementations. Wired via `dependencies.py` based on environment config.
- **API layer**: New auth middleware for JWT validation. New user-related endpoints (or at minimum, a post-login hook). Error handler additions for 401/403.
- **Domain**: New `User` model, `UserService`, and `UserRepositoryPort`. No changes to existing domain models or services.
- **Frontend**: Auth0 SDK integration (login/logout/callback). Conditional rendering based on user approval status. Build output deployed as static assets.
- **Dependencies**: Auth0 SDK (frontend), `python-jose` or equivalent JWT library (backend), Google Cloud client libraries (`google-cloud-storage`), Cloudflare Wrangler (worker dev/deploy).
- **Infrastructure**: New GCP project setup, Cloud SQL instance, Cloud Run service, Cloud Storage bucket, Cloudflare zone/worker. CI/CD pipeline for deploying backend to Cloud Run and frontend to Cloudflare.

```

And a summary of the generated issues:
```
○ [EPIC] · Cloud Deployment

DESCRIPTION
  
Deploy the application to cloud so users can access it remotely. Frontend on Cloudflare, API on GCloud Cloud Run, DB on Cloud SQL, auth via Auth0 with manual user approval gating. The hexagonal architecture makes CSP swaps straightforward -- new adapters, same domain.                                                                                         
OpenSpec Change: openspec/changes/cloud-deployment/                              See proposal.md for full context and design.md for technical details.            

CHILDREN
  ↳ ✓ issue-r43.1: Port Cleanup and Object storage Adapter
  ↳ ✓ issue-r43.2: User Domain Model and Database
  ↳ ✓ issue-r43.3: Auth0 Backend Integration
  ↳ ✓ issue-r43.4: Auth0 Frontend Integration
  ↳ ✓ issue-r43.5: Terraform: Cloud SQL and Cloud Run
  ↳ ◐ issue-r43.6: Cloudflare Worker
  ↳ ✓ issue-r43.7: Environment Config and Cleanup
```

Each of these issues has explicit acceptance criteria and was implemented in its own Claude Code session. Each session had a clean context window focused on one scoped task, which resulted in a consumable PR to review. 

**How to get here**: Think through the feature you'd like and write it in a markdown file. Install or pick an issue tracker that the agent can interact with, then start up your agent and ask it to break the feature into issues with the issue tracker's API. This works with spec driven development, interactive plan mode or a combination of the two. Then try to use a simple prompt, maybe even the same one, to have Claude complete each issue in order.

---

## Stage Three: Refine and Optimize Context

After you've implemented a few issues from your tracker, you notice patterns as the agent gets the same things wrong each time. It puts business logic in the API router instead of the domain service and uses "customer" when your domain calls them "prospects." 

These recurring mistakes are violations of standards and conventions that we need to define for our projects. If we can then inject our definitions into every session so that fresh agent processes have relevant information, we should, in theory, see improvements. The `CLAUDE.md` file, the first thing Claude reads when it starts a session in your project, is the best place to start here.

My `CLAUDE.md` is concise but dense. It touches on domain model, package structure, tests and executing tasks. It doesn't try to teach Claude everything, but it does point to deeper reference documents.

Those reference documents are where the real leverage is for enforcing SWE standards and patterns. I maintain two critical documents per project, so far.

**`domain-driven-design.md`** establishes the ubiquitous language of the project's domain. It provides the 'business intelligence' to each agent session, describing what each entity is responsible for and what it can and can't do. It defines aggregate boundaries, service layer patterns, and the anti-corruption layer that maps input data to domain entities. I return to [this resource](https://www.dddcommunity.org/library/vernon_2011/) to refresh my DDD knowledge most often.

**`application-architecture.md`** defines the application package structure (hexagonal architecture), which enforces how code is written. Each layer of the package structure has its own role, imports can only go a single way and dependency injection adds convention. This additional boilerplate is now costless when the agent is writing the code and the consistency pays for itself in readability. This borrows heavily from the [clean code](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882) concepts. 

The effect is dramatic. With these files in context, Claude sessions produce code that fits. It's not perfect, I still review, but I can now rely on agent summaries and separate review processes to do a lot of the heavy lifting and quickly find what's in need of human attention. These references try to give the agent the same vocabulary that a seasoned team member would internalize over months. The result is that each fresh session behaves less like a new hire and more like a returning contractor who read the onboarding docs.

**How to get here**: After you've implemented a few issues, catalog the mistakes. Write a `CLAUDE.md` file at your project root. Write reference markdown files for your architecture and domain, and point to them from `CLAUDE.md`. I've had the most success with a coding standards file defining package structure, conventions, and tool usage, and a domain-driven design document describing each entity's key business rules.

---

## Current State: Mimic a Professional Workflow

Stages one through three are about improving the quality of individual agent sessions. My effort now focuses on chaining sessions into a workflow that resembles professional software development. 

Think about what happens when a feature ships at a well-run company. Someone writes the spec capturing the problem statement, the requirements, the user experience and the acceptance criteria. A developer implements it and team members review it. Ideally, the code is merged and a set of quality gates, including a battery of tests, are run. Someone checks it in a staging environment. If everything passes, it is deployed to production. Each step has completion criteria, is performed by someone (or something) with the right expertise, and is auditable.

My goal is to encode this into a set of Claude Code skills. Each skill is invoked programatically. Here are three core processes that form my pipeline:

### `/implement-issue`

This skill takes an issue ID and runs the implementation workflow. It reads the issue details (title, description, acceptance criteria, type, priority). It creates a branch following the naming convention and marks the issue as in-progress. Then it implements the changes: reading acceptance criteria one by one, understanding what needs to change, reading existing code where necessary, and implementing the change following established conventions.

After implementation, it runs the test suite and architecture linting. If either fails, it reads the failure output, fixes the issue, and re-runs. This loop continues until clean. Then it creates a PR and posts a structured implementation summary as a comment.

The guardrails are critical: always read the full issue before implementing. Never skip tests or architecture lint. If implementation is unclear, pause and ask the user; please do not guess! Do not modify files unrelated to the issue scope. Keep changes minimal and focused on acceptance criteria. And whenever the session does stop to ask a question, this is valuable feedback to the operator: what is unclear and how can I ensure that class of question does not reappear? 

### `/review-issue`

This skill takes a PR and runs a multi-part review. 

First, we run a generic code quality review you would want on any PR. There are [many](https://github.com/anthropics/claude-code/blob/b757fc9ecdf77e450442e3ca9f9093a9da35952b/plugins/code-review/commands/code-review.md?plain=1#L3) [great skills](https://github.com/anthropics/claude-plugins-official/blob/8deab8460a9d4df5a01315ef722a5ca6b061c074/plugins/pr-review-toolkit/commands/review-pr.md) [out there](https://github.com/awesome-skills/code-review-skill) you can adopt immediately. 

I then want the implementation reviewed by something that knows my project. I'll lean back on the reference documents again to tackle this job. An agent will evaluate the changes with respect to hexagonal architecture compliance: import direction, port usage, layer placement, schema isolation, adapter independence. 

Then another agent performs a domain specific review: ubiquitous language, bounded context alignment, aggregate integrity, domain model purity, anti-corruption layer correctness, service layer patterns.

Finally, I run an infrastructure aware review that checks for configuration and security concerns in each layer of the stack. This is, again, project dependent, ensuring that Terraform resources are in the right workspaces and services have the right permissions. To perform a review well, the agent needs to know what your code is supposed to be doing and accessing. 

Each finding gets categorized as BLOCK (must fix), WARN (should fix), or NOTE (suggestion). The skill auto-fixes BLOCK and WARN issues when the fix is straightforward and re-runs tests to confirm no regressions. If a fix is too large or risky, it flags it as "manual fix recommended." Finally, it posts the full review as a PR comment with a recommendation: APPROVE or CHANGES REQUESTED.

### `/e2e-feature-test`

This skill verifies that a feature works against the full system, by running the system in an ephemeral environment. It starts containers, launches the services, and runs through a test checklist: happy path works end-to-end, data persists correctly, API returns expected response codes, frontend displays data, error cases are handled, no console errors.

For backend features, it uses curl against the running API. For frontend features, it uses Playwright MCP tools to navigate the UI, interact with elements, and check for errors.

### The Pipeline

Currently I simply chain these three skills together. A simple script (Taskfile) includes a `pipeline` task that demonstrates this:

```yaml
pipeline:
  desc: "Do work"
  cmds:
    - claude -p "/implement-issue {{.CLI_ARGS}}"
    - claude -p "/review-issue {{.CLI_ARGS}}"
    - claude -p "/e2e-feature-test {{.CLI_ARGS}}"
```

This runs implementation in one Claude Code session, then review in a fresh session with clean context. The reviewer has no memory of the implementation and it evaluates the code on its own merits, ideally like a real code review. Each session is short-lived and focused: the implementer has the issue context and coding standards; the reviewer has the architecture rules and the diff.

**How to get here**: Channel your inner engineering lead, responsible for completing a known scope of story points in a two-week sprint. What processes does your team use? What are your definitions of done? Convert these into skills by giving Claude useful context to perform specific bits of the workflow: implementation, code review, feature verification in a lower environment, updating documentation, adding newly identified issues to the tracker, performing a security review, and providing analysis on readiness for shipping. Chain them together, pivoting on your issue tracker. Determine where you want to be in the loop, my current preference is to be involved at PR review and making the decision to merge.

---

## What's next? Run in Parallel

The next step is running multiple features through the pipeline simultaneously. The end goal is to spend most of my time here: deep thinking about what should be created and how. 

I have more requirements for my workflow before this is achievable. I would like full isolation of pipelines by running them in virtual machines, ensuring these agents don't have access to things they shouldn't. I need monitoring that will reveal time, tokens and resources needed to complete features. I need to capture my judgement of each implementation so I can see progress of pipeline quality over time. I need independent agents and pipelines to be aware of each other, so that dependencies can be addressed.

Tools like [Gas Town](https://github.com/steveyegge/gastown) and [The Flywheel](https://agent-flywheel.com/) are built for this: spin up multiple agent sessions, each working on a different issue, with coordination and conflict resolution built in. I currently find these tools too complex to just jump into and instead am solving one problem at a time.

I plan to adopt one of these, or a system I do not yet know about. They're significantly further ahead than I am!

But my plan is to build toward it incrementally by making my existing pipeline robust enough that the jump to parallelism is just a scheduling change.

## What I've Learned

A few things that don't fit neatly into the stages but matter a lot:

**The issue description is the prompt.** When I write an issue with detailed acceptance criteria, database migration SQL, method signatures, and file locations, it's really the prompt. The better the issue, the better the implementation. I spend my most productive hours writing detailed issues and working in plan mode. 

**Fresh context is better than long context.** Early on I tried to keep a single Claude session running across an entire feature and saw obvious degraded results. The session would miss conventions from 20 messages ago, or try to re-implement something it had already built. Scoping each session to a single issue produces better results.

**Context has a sweet spot.** These models are surprisingly capable on an unfamiliar codebase. But front-loading the right context with a `CLAUDE.md`, reference files and skills turns "surprisingly capable" into "fits our patterns." Inject just enough to orient the session, then point it at a single scoped issue. That's where the performance curve bends.

**Well defined tollgates are more important than ever.** Giving each agentic session the ability to ask questions like "Should this thing work this way?" is best done with tools, scripts and automation. This allows me to focus on designing, reviewing and deploying. 

---

## Getting Started

If I were starting today, I would do this:

1. **Install Claude Code** and use it immediately for everything. Don't optimize yet, just notice what goes wrong.
2. **Install an issue tracker** (Beads, Linear, GitHub Issues, etc) and break your next feature into 3-5 scoped issues with acceptance criteria.
3. **Write a `CLAUDE.md`** at your project root that explains your architecture, conventions, and domain vocabulary. Keep it under a page.
4. **Create one skill** that encodes something you've found yourself doing over and over again. It can be super simple: read the diff of your change, write a commit message and create a PR - for example. Use the skill a few times and see what you need to change for it to perform as if you completed it to your own standards. 
5. **Focus your next longer session on automating a guardrail** that completes a part of the workflow that you spend your time on. Even a basic one that checks import directions and naming conventions will catch real issues.

The above is not straightforward and took me months. The compound returns come from each layer making the next one possible. Writing better issues so the agent needs less correction is a long term time saver. Writing better reference docs allows the issues to be shorter if the focus is still present. Writing better skills so the pipeline runs with less intervention enables me to spend more time on the design and big picture problem solving. Each improvement feeds forward.

The gap between "I use AI to write code" and "I use AI to ship features" is entirely bridgeable. It just takes the same thing that's always made software engineering work: good process, clear communication, and relentless iteration on the systems that produce the output.
