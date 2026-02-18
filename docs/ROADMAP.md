# KnowTrial — Project Roadmap

> **Goal:** Build a study app that turns learning material into original practice exams (VCP-style), scores attempts, explains results, and tracks progress.

---

## Phase 1 — Foundation *(Estimated: 1 week)*

**Goal:** Auth, database models, and app shell.

- [x] Define MongoDB schemas: `User`, `Source`, `Chunk`, `Exam`, `Question`, `Attempt`
- [x] User registration & login (bcrypt + JWT)
- [x] Auth middleware (`protect`, `adminOnly`)
- [x] App layout shell: sidebar nav, responsive header, theme toggle (dark/light)
- [x] Routing: `/login`, `/register`, `/dashboard`, `/library`, `/exams`, `/admin`
- [x] Zustand auth store (token, user, login/logout)
- [x] Protected route wrapper (redirect unauthenticated users)

**Acceptance:** A user can register, log in, see a skeleton dashboard, and navigate between empty pages.

---

## Phase 2 — Content Intake *(Estimated: 2 weeks)*

**Goal:** Study Material Library — ingest, chunk, and browse source material.

- [ ] **Backend — Source ingestion**
  - [x] `POST /api/sources` — accept URL, file upload (PDF/DOCX/TXT via GridFS), or raw text
  - [x] Text extraction: URL scraping, PDF parsing (`pdf-parse`), DOCX parsing (`mammoth`)
  - [x] Text extraction: URL scraping, PDF parsing (`pdf-parse`), DOCX parsing (`mammoth`)
  - [x] Chunking engine: split extracted text into segments with metadata (`chunk_id`, `source_id`, heading, text, token count, tags)
  - [x] Store chunks in MongoDB; update source status (`Pending → Processed | Failed`)
- [x] **Frontend — Library UI**
  - [x] Study Library page: list sources with title, type icon, tags, date, status badge
  - [x] Add Source modal: tabs for URL / File Upload / Paste Text
  - [ ] Tag management (create, assign, filter)
  - [ ] Source Viewer page: read extracted text & browse chunks
- [ ] **Error handling:** clear messages when URL/file parsing fails, suggest fallback (paste text)

**Acceptance:** I can add material (URL/upload/text), it processes into chunks, and I can browse it.

---

## Phase 3 — Exam Generator *(Estimated: 2 weeks)*

**Goal:** AI-powered exam creation grounded in stored material.

- [ ] **Backend — Question generation**
  - [ ] `POST /api/exams/generate` — accept scope (all/tag/sources), type, count, difficulty, options
  - [ ] Retrieve relevant chunks based on scope & tags
  - [ ] Generate questions via LLM (OpenAI/Gemini) with strict prompt:
    - No copyrighted questions — original only
    - Each question grounded in chunk content with citations
    - Output must conform to Question JSON schema
  - [ ] Schema validation on every generated question
  - [ ] Store exam + questions in DB
- [ ] **Frontend — Exam Builder UI**
  - [ ] Source scope selector (all, by tag, by source)
  - [ ] Exam config: type (MCQ/multi/scenario/short), count, difficulty, time limit, randomize
  - [ ] Generate button with loading state
  - [ ] Preview generated exam before starting

**Question JSON Schema:**
```json
{
  "id": "string",
  "type": "mcq | multi | scenario | short",
  "difficulty": "easy | medium | hard",
  "topic_tags": ["string"],
  "prompt": "string",
  "options": [{ "key": "A", "text": "string" }],
  "correct_answer": "A | ['A','B'] | { rubric }",
  "explanation": "string",
  "citations": [{ "source_id": "string", "chunk_id": "string" }]
}
```

**Acceptance:** I can generate a 20-question exam grounded in selected material with citations.

---

## Phase 4 — Exam Experience *(Estimated: 1 week)*

**Goal:** Clean, functional exam-taking UI.

- [ ] Timer (countdown if time limit set)
- [ ] Question navigation: next/prev buttons, jump list sidebar
- [ ] Flag question for review (toggle)
- [ ] Progress indicator: answered / unanswered / flagged count
- [ ] Auto-save answers to Zustand store (persist to API on interval)
- [ ] Submit confirmation modal
- [ ] `POST /api/attempts` — save completed attempt

**Acceptance:** I can take an exam with timer, navigate questions, flag for review, and submit.

---

## Phase 5 — Scoring & Feedback *(Estimated: 1.5 weeks)*

**Goal:** Accurate scoring with detailed explanations and source references.

- [ ] **Scoring engine**
  - [ ] MCQ / multi-select: deterministic comparison
  - [ ] Scenario-based: deterministic comparison
  - [ ] Short answer: rubric-based scoring (keyword matching + LLM evaluation)
- [ ] **Results screen**
  - [ ] Total score + percentage
  - [ ] Time taken
  - [ ] Performance breakdown by topic/tag (bar chart)
- [ ] **Review mode**
  - [ ] Per-question view: my answer, correct answer, explanation
  - [ ] Clickable citation references → opens source chunk in modal/side panel

**Acceptance:** I can submit, get scored, review each question, and open cited source chunks.

---

## Phase 6 — Progress Tracking & Weakness Mode *(Estimated: 1.5 weeks)*

**Goal:** Analytics and targeted practice from weak areas.

- [ ] **Attempts History page**
  - [ ] List all past attempts: date, score, time, topic breakdown
  - [ ] Click to re-enter review mode
- [ ] **Analytics dashboard**
  - [ ] Scores by topic (radar chart or grouped bar)
  - [ ] Common incorrect topics (top-N list)
  - [ ] Average time per question
  - [ ] Improvement trend line over time
- [ ] **Weakness Practice**
  - [ ] `POST /api/exams/weakness` — auto-generate mini-exam from weakest tags
  - [ ] Dedicated "Practice Weak Areas" button on dashboard

**Acceptance:** Attempt history and topic analytics are visible. Weakness Practice creates a quiz from my weakest topics.

---

## Phase 7 — Polish & Admin *(Estimated: 1 week)*

**Goal:** Admin panel, performance, and final polish.

- [ ] **Admin panel** (simple)
  - [ ] View all sources across users
  - [ ] Retry failed source processing
  - [ ] Manage global tags/topics
- [ ] **Performance**
  - [ ] Cache processed materials (avoid re-chunking)
  - [ ] Reuse chunk index for exam generation
- [ ] **UI polish**
  - [ ] Responsive design audit (mobile + desktop)
  - [ ] Loading skeletons, toast notifications, empty states
  - [ ] Accessibility pass (keyboard nav, ARIA labels)
  - [ ] Error boundaries + fallback UI

**Acceptance:** Admin can manage sources and tags. App feels fast, polished, and handles errors gracefully.

---

## Summary Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| 1 — Foundation | 1 week | Week 1 |
| 2 — Content Intake | 2 weeks | Week 3 |
| 3 — Exam Generator | 2 weeks | Week 5 |
| 4 — Exam Experience | 1 week | Week 6 |
| 5 — Scoring & Feedback | 1.5 weeks | Week 7–8 |
| 6 — Progress & Weakness | 1.5 weeks | Week 9 |
| 7 — Polish & Admin | 1 week | Week 10 |

> **Total estimated:** ~10 weeks for feature-complete MVP.
