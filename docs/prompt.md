Build a web app that helps me study by turning learning material into original practice exams (VCP-style: scenario-based MCQs, multi-select, short answers) and then scores my attempts, explains results, and tracks progress.

Core Goal

I should be able to provide learning material (links + uploads), select topics and difficulty, generate an exam, write it, submit it, get scored, and see detailed feedback with references back to the source material used.

Key Constraints (must-follow)

No copyrighted exam dumps or real vendor exam questions. Only generate original questions derived from the materials I provide.

Every generated question must be grounded in the stored material and include evidence references (source + section/chunk IDs).

The system must avoid hallucinations: answers and explanations must be supported by referenced material.

Main Features
1) Content Intake (Study Material Library)

Create a “Study Library” where I can add material in these ways:

Paste a URL (web page / docs link)

Upload files (PDF, DOCX, TXT)

Paste text directly

For each item, store:

Title (auto + editable)

Source type (URL / PDF / Text)

Tags (topic labels I can manage)

Date added

Status (Processed / Failed / Pending)

Processing requirements:

Extract clean text from source.

Split into chunks (manageable segments) and store chunk metadata:

chunk_id, source_id, heading/section (if available), text, token length, tags.

2) Exam Generator (Practice Exams)

Create an “Exam Builder” that lets me choose:

Study material scope (all, tag-based, or selected sources)

Exam type:

MCQ (single choice)

Multi-select

Scenario-based MCQ

Short answer (optional)

Number of questions (e.g., 10/20/40)

Difficulty (Easy / Medium / Hard)

Time limit (optional)

Randomization toggle

Exam generation rules:

Questions must be unique and not copied verbatim from the source.

Each question must include:

Question text

Options (if MCQ/multi)

Correct answer(s)

Explanation

Difficulty

Topic tag(s)

Citations: chunk_ids used as evidence

Output must be in a strict JSON schema so the UI can render it reliably.

3) Exam Taking Experience

Create a clean exam UI:

Timer (if enabled)

Question navigation (next/prev, jump list)

Flag question for review

Progress indicator (answered/unanswered)

Submit exam confirmation

Auto-save answers during the attempt

4) Scoring + Feedback

On submit:

Score MCQ and multi-select deterministically.

For short answers, score using a rubric and show what concepts were missing.

Provide a results screen with:

Total score + percentage

Time taken

Performance by topic/tag

Review mode per question showing:

My answer

Correct answer

Explanation

The cited chunk references (clickable to open the source snippet)

5) Progress Tracking + Weakness Mode

Track over time:

Attempts history

Scores by topic

Common incorrect topics

Time per question

Improvement trend

Add “Weakness Practice”:

Generate a focused mini-exam based on my weakest tags/topics using my past attempts.

Data & Admin Controls

User accounts (basic auth).

Each user has their own library, exams, attempts, and analytics.

Admin panel (simple) for:

Viewing all sources

Retrying failed processing

Managing tags/topics

Non-Functional Requirements

Clean, modern UI using Tailwind v4 + shadcn/ui.

Backend must be reliable and validate all inputs.

All generated question objects must pass schema validation.

Clear error messages when link parsing fails (and suggest upload/paste-text fallback).

Make it fast: cache processed materials and reuse chunk index for exam generation.

Required Screens

Dashboard (stats + quick actions)

Study Library (sources list + add new + tags)

Source Viewer (read extracted text + chunk view)

Exam Builder

Exam Taking UI

Results + Review

Attempts History

Weakness Practice

Admin (minimal)

Question JSON Schema (must follow)

Each question must be stored like:

id

type: "mcq" | "multi" | "scenario" | "short"

difficulty: "easy" | "medium" | "hard"

topic_tags: string[]

prompt: string

options: { key: "A"|"B"|"C"|"D"|"E", text: string }[] (empty for short answer)

correct_answer:

for mcq/scenario: "A" | "B" | ...

for multi: string[] of keys

for short: rubric object (expected points + keywords)

explanation: string

citations: { source_id, chunk_id }[]

Acceptance Criteria (what “done” means)

I can add material (URL/upload/text), it processes into chunks, and I can browse it.

I can generate a 20-question exam grounded in selected material with citations.

I can take the exam, submit, and get accurate scoring + explanations.

I can review each question and open the cited source chunk.

Attempt history and topic analytics are saved and visible.

Weakness Practice creates a quiz from my weakest topics.