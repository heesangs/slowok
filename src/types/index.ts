// 공통 타입 정의

export type TaskStatus = "pending" | "in_progress" | "completed";

export type Difficulty = "easy" | "medium" | "hard";

export type SelfLevel = "low" | "medium" | "high";

export interface Profile {
  id: string;
  display_name: string | null;
  grade: string | null;
  subjects: string[] | null;
  self_level: SelfLevel;
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
  parent_subtask_id: string | null;
  depth: number;
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

// AI 응답용 하위 과제 제안 타입
export interface AISubtaskSuggestion {
  title: string;
  difficulty: Difficulty;
  estimated_minutes: number;
}

// 클라이언트 편집용 하위 과제 타입
export interface EditableSubtask {
  temp_id: string;
  parent_temp_id: string | null;
  depth: number;
  title: string;
  difficulty: Difficulty;
  ai_suggested_difficulty: Difficulty;
  estimated_minutes: number;
  ai_suggested_minutes: number;
  sort_order: number;
  is_decomposing: boolean;
}
