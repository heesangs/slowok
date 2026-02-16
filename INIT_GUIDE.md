# slowok 프로젝트 초기화 가이드

## 🚀 Claude Code에서 실행할 순서

---

### Step 1: CLAUDE.md 배치

함께 제공된 `CLAUDE.md` 파일을 `slowok/` 폴더 루트에 넣으세요.
Claude Code가 이 파일을 자동으로 읽고 프로젝트 컨텍스트로 활용합니다.

```
cp CLAUDE.md ~/slowok/CLAUDE.md
```

---

### Step 2: 프로젝트 초기화

Claude Code에서 아래 프롬프트를 입력하세요:

```
Read CLAUDE.md and initialize the slowok project.

1. Create Next.js 15 project with pnpm create next-app
   - TypeScript, Tailwind CSS, App Router, src/ directory
   - ESLint enabled

2. Install dependencies:
   - @supabase/supabase-js @supabase/ssr
   - @google/generative-ai

3. Create directory structure as defined in CLAUDE.md

4. Create .env.local template:
   - NEXT_PUBLIC_SUPABASE_URL=
   - NEXT_PUBLIC_SUPABASE_ANON_KEY=
   - SUPABASE_SERVICE_ROLE_KEY=
   - GEMINI_API_KEY=

5. Create Supabase client config files
   (src/lib/supabase/client.ts, server.ts, middleware.ts)

6. Create base layout and landing page
```

---

### Step 3: Supabase 프로젝트 설정

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. Project Settings → API에서 키 복사
3. `.env.local`에 붙여넣기:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
   ```
4. SQL Editor에서 CLAUDE.md의 Data Model 테이블 생성

---

### Step 4: Gemini API 키 설정

1. [aistudio.google.com](https://aistudio.google.com)에서 API 키 발급
2. `.env.local`에 추가:
   ```
   GEMINI_API_KEY=AI...
   ```

---

### Step 5: CLAUDE.md 보완 (첫 기능 개발 전 실행)

첫 기능 개발에 필요한 데이터 모델과 규칙을 CLAUDE.md에 추가합니다.
Claude Code에 아래 프롬프트를 입력하세요:

```
Update CLAUDE.md with the following changes:

1. Add to Data Model - profiles table:
   - grade text (e.g. "고1", "중3")
   - subjects text[] (main subjects)
   - self_level text DEFAULT 'medium' -- low | medium | high

2. Update subtasks table:
   - Add parent_subtask_id uuid FK → subtasks(id) ON DELETE CASCADE (nullable)
   - Add depth int DEFAULT 0 (max 2)

3. Add to Design Principles:
   - Mobile-first responsive design (base styles for mobile, scale up with breakpoints)

4. Add to Rules:
   - Mobile-first: design for 375px base, then md: and lg: breakpoints
   - Toast notifications for user feedback (auto-dismiss 3s)
```

---

### Step 6: 첫 번째 기능 개발

CLAUDE.md 보완이 끝나면, MVP 핵심 기능부터 시작하세요.
Claude Code에 아래 프롬프트를 입력합니다:

```
Create the task creation page. Mobile-first design.

Route: /tasks/new

## Input
- Single text input field (placeholder: "What do you need to do?")
- "Analyze" button

## AI Analysis (Server Action)
- Call Gemini API (gemini-2.0-flash) to decompose the task
- Include user profile context (grade, subjects, self_level) from Supabase
  in the system prompt for personalized difficulty/time estimation
- System prompt:
  "You are a study planner for Korean students.
   Student profile: {grade}, {subjects}, self-assessed level: {self_level}.
   Break down the given task into concrete, actionable subtasks.
   For each subtask, assess difficulty (easy/medium/hard) and estimate
   realistic minutes considering this specific student's level.
   Hard tasks get generous time. Easy tasks stay short.
   Respond in Korean for subtask titles."
- Response JSON format:
  { subtasks: [{ title: string, difficulty: "easy"|"medium"|"hard", estimatedMinutes: number }] }
- Validate and parse JSON safely with error handling

## Result Display
- Card list showing each subtask:
  - Title, difficulty badge (Easy🟢 / Medium🟡 / Hard🔴), estimated minutes
  - Difficulty: clickable toggle cycling easy → medium → hard
  - Time: editable number input with +5/-5 min stepper buttons
  - "Break down further" button on each card → calls AI again to decompose
    that subtask into sub-subtasks (max depth: 2)
  - Sub-subtasks display as indented child cards under parent
- Total estimated time at the bottom (auto-calculated sum of all leaf tasks)

## States
- Loading: skeleton cards with pulse animation while AI processes
- Error: toast message + retry button if API fails
- Empty: guide text with example ("Try: 영어 중간고사 준비")

## Confirm & Save
- "Confirm" button saves task + all subtasks to Supabase
  - Single transaction
  - Store both ai_suggested_difficulty/minutes and user-confirmed values
  - Save parent_subtask_id and depth for nested subtasks
- Redirect to /dashboard with success toast ("저장되었습니다 ✓", auto-dismiss 3s)

## Mobile-First Layout
- Base: single column, full-width cards, large touch targets (min 44px)
- md: (768px+) wider card layout with more horizontal space
- lg: (1024px+) centered max-width container
```

---

### Step 7: 이후 개발 순서 (권장)

| 순서 | 기능 | Claude Code 프롬프트 |
|------|------|---------------------|
| 1 | ✅ 할 일 등록 + AI 분석 | Step 6 참고 |
| 2 | 대시보드 | `Create a mobile-first dashboard showing today's task list with subtask progress and total estimated time` |
| 3 | 세부 할일 체크리스트 | `Create a mobile-first execution view with checkable subtasks, estimated time per item, and elapsed time tracking` |
| 4 | 인증 + 프로필 | `Add Supabase Auth with email/password login/signup. After first login, show onboarding to collect grade, subjects, and self_level for profile` |
| 5 | 회고 | `Create a mobile-first review page comparing estimated vs actual time per subtask with visual charts` |
| 6 | 배포 | `Deploy to Vercel and connect custom domain` |

---

## 💡 Claude Code 사용 팁

- **CLAUDE.md를 항상 최신으로 유지하세요.** 새 기능이나 규칙이 생기면 바로 업데이트.
- **한 번에 하나의 기능만 요청하세요.** 여러 기능을 동시에 요청하면 품질이 떨어집니다.
- **프롬프트는 구체적으로.** "할일 페이지 만들어줘"보다 Step 6처럼 상세하게 작성하세요.
- **에러가 나면 에러 메시지를 그대로 붙여넣기하세요.** Claude Code가 바로 수정합니다.
- **맥락을 활용하세요.** `Based on CLAUDE.md, how should I handle ___?` 형태로 질문하면 효과적입니다.
