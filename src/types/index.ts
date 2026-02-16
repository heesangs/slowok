// 공통 타입 정의

export type TaskStatus = "pending" | "in_progress" | "completed";

export type Difficulty = "easy" | "medium" | "hard";

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  status: TaskStatus;
  total_estimated_minutes: number | null;
  total_actual_minutes: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  difficulty: Difficulty;
  ai_suggested_difficulty: Difficulty | null;
  estimated_minutes: number;
  ai_suggested_minutes: number | null;
  actual_minutes: number | null;
  sort_order: number;
  status: TaskStatus;
  created_at: string;
  completed_at: string | null;
}
