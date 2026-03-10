"use client";

// 온보딩 폼 — 4단계 멀티스텝: 인생시간 체험 → 삶의 장면 선택 → AI 정리 → 첫 실행안 확정

import { Button } from "@/components/ui/button";
import {
  adjustPaceAction,
  analyzeLifeSceneAction,
  generateFirstStepAction,
} from "@/app/(main)/tasks/actions";
import { saveOnboardingV2Action } from "@/app/(auth)/actions";
import { cn, formatMinutes, getDifficultyConfig } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { getDemoScenes, getSceneCategoryOptions } from "@/lib/onboarding/demo-scenes";
import type {
  Difficulty,
  DemoSceneItem,
  Gender,
  HorizonAction,
  LifeSceneAnalysisResult,
  OnboardingSceneCategory,
  PaceAdjustOption,
  PaceType,
  PersonalityType,
  FirstStepPlanResult,
  SelfLevel,
  UserContext,
} from "@/types";

const GENDER_OPTIONS = [
  { value: "male" as Gender, label: "남성" },
  { value: "female" as Gender, label: "여성" },
] as const;

const CLOCK_HAND_ROTATION_CLASSES = [
  "rotate-0",
  "rotate-[15deg]",
  "rotate-[30deg]",
  "rotate-[45deg]",
  "rotate-[60deg]",
  "rotate-[75deg]",
  "rotate-[90deg]",
  "rotate-[105deg]",
  "rotate-[120deg]",
  "rotate-[135deg]",
  "rotate-[150deg]",
  "rotate-[165deg]",
  "rotate-180",
  "rotate-[195deg]",
  "rotate-[210deg]",
  "rotate-[225deg]",
  "rotate-[240deg]",
  "rotate-[255deg]",
  "rotate-[270deg]",
  "rotate-[285deg]",
  "rotate-[300deg]",
  "rotate-[315deg]",
  "rotate-[330deg]",
  "rotate-[345deg]",
] as const;

const PACE_ADJUST_OPTIONS: Array<{
  value: PaceAdjustOption;
  label: string;
}> = [
  { value: "lighter", label: "더 가볍게" },
  { value: "more_specific", label: "더 구체적으로" },
  { value: "once_per_week", label: "주 1회만" },
  { value: "start_this_week", label: "이번 주부터" },
  { value: "start_today", label: "오늘 바로 시작" },
];

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

function deriveDifficultyFromSubtasks(
  subtasks: FirstStepPlanResult["subtasks"]
): Difficulty {
  if (subtasks.length === 0) return "medium";
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const item of subtasks) {
    counts[item.difficulty] += 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (sorted[0]?.[0] as Difficulty) ?? "medium";
}

function applyPaceOptionsToPlan(
  plan: FirstStepPlanResult,
  options: PaceAdjustOption[]
): FirstStepPlanResult {
  let subtasks = [...plan.subtasks];

  if (options.includes("lighter")) {
    subtasks = [...subtasks]
      .sort((a, b) => {
        const rankDiff = DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty];
        if (rankDiff !== 0) return rankDiff;
        return a.estimated_minutes - b.estimated_minutes;
      })
      .slice(0, Math.min(2, subtasks.length));
  }

  if (options.includes("start_today")) {
    subtasks = subtasks.slice(0, 1);
  }

  if (subtasks.length === 0 && plan.subtasks.length > 0) {
    subtasks = [plan.subtasks[0]];
  }

  const estimatedMinutes = subtasks.reduce(
    (sum, subtask) => sum + subtask.estimated_minutes,
    0
  );

  return {
    estimatedMinutes: estimatedMinutes > 0 ? estimatedMinutes : plan.estimatedMinutes,
    difficulty: deriveDifficultyFromSubtasks(subtasks),
    subtasks,
  };
}

function inferPaceType(
  options: PaceAdjustOption[],
  selfLevel: SelfLevel
): PaceType {
  if (options.includes("start_today") || options.includes("more_specific")) {
    return "focused";
  }
  if (options.includes("lighter") && options.includes("once_per_week")) {
    return "recovery";
  }
  if (options.includes("lighter") || options.includes("once_per_week")) {
    return "slow";
  }
  if (selfLevel === "high") {
    return "focused";
  }
  if (selfLevel === "low") {
    return "slow";
  }
  return "balanced";
}

export function OnboardingForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1 (v2)
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [energyType, setEnergyType] = useState<"I" | "E" | null>(null);
  const [judgmentType, setJudgmentType] = useState<"T" | "F" | null>(null);
  const [personalityType, setPersonalityType] = useState<PersonalityType | null>(null);
  // 기존 saveProfileAction 호환을 위한 임시 값
  const [displayName, setDisplayName] = useState("slowgoes 사용자");

  // Step 2
  const [sceneCategory, setSceneCategory] =
    useState<OnboardingSceneCategory["key"]>("must_do");
  const [selectedDemoScene, setSelectedDemoScene] = useState<DemoSceneItem | null>(null);
  const [customSceneInput, setCustomSceneInput] = useState("");
  const [userContext, setUserContext] = useState<UserContext[]>([]);

  // Step 3 (AI 통합 분석)
  const [lifeSceneAnalysis, setLifeSceneAnalysis] = useState<LifeSceneAnalysisResult | null>(null);
  const [selectedWeeklyAction, setSelectedWeeklyAction] = useState("");
  const [step3AnalysisKey, setStep3AnalysisKey] = useState<string | null>(null);
  const [isAnalyzingLifeScene, setIsAnalyzingLifeScene] = useState(false);

  // Step 4 (첫 실행안 생성)
  const [firstStepPlan, setFirstStepPlan] = useState<FirstStepPlanResult | null>(null);
  const [isGeneratingFirstStep, setIsGeneratingFirstStep] = useState(false);
  const [step4PlanKey, setStep4PlanKey] = useState<string | null>(null);
  const [selectedPaceOptions, setSelectedPaceOptions] = useState<PaceAdjustOption[]>([]);
  const [specificPacePlan, setSpecificPacePlan] = useState<FirstStepPlanResult | null>(null);
  const [isAdjustingPace, setIsAdjustingPace] = useState(false);

  // Step 4
  const [selfLevel, setSelfLevel] = useState<SelfLevel>("medium");

  const isStep1Complete = age !== null && !!gender && !!personalityType;
  const isSceneFromCustomInput = customSceneInput.trim().length > 0;
  const selectedSceneText = isSceneFromCustomInput
    ? customSceneInput.trim()
    : selectedDemoScene?.text ?? "";
  const selectedLifeArea = lifeSceneAnalysis?.lifeArea ?? "";
  const selectedSeasonAction =
    lifeSceneAnalysis?.horizons.find((item) => item.level === "this_season")?.action ?? "";
  const step3RequestKey =
    age !== null && gender && personalityType && selectedSceneText
      ? `${selectedSceneText}|${age}|${gender}|${personalityType}`
      : null;
  const step4RequestKey =
    age !== null && gender && personalityType && selectedSceneText && selectedLifeArea && selectedWeeklyAction
      ? `${selectedSceneText}|${selectedLifeArea}|${selectedWeeklyAction}|${age}|${gender}|${personalityType}`
      : null;

  const orderedHorizons = lifeSceneAnalysis
    ? [
        ...lifeSceneAnalysis.horizons.filter((item) => item.level === "someday").slice(0, 1),
        ...lifeSceneAnalysis.horizons.filter((item) => item.level === "this_year").slice(0, 1),
        ...lifeSceneAnalysis.horizons.filter((item) => item.level === "this_season").slice(0, 1),
        ...lifeSceneAnalysis.horizons.filter((item) => item.level === "this_week"),
      ]
    : [];

  const effectiveBasePlan =
    selectedPaceOptions.includes("more_specific") && specificPacePlan
      ? specificPacePlan
      : firstStepPlan;
  const displayedStepPlan = effectiveBasePlan
    ? applyPaceOptionsToPlan(effectiveBasePlan, selectedPaceOptions)
    : null;
  const paceMetaLabels = [
    selectedPaceOptions.includes("once_per_week") ? "매주 1회 페이스" : null,
    selectedPaceOptions.includes("start_this_week") ? "이번 주부터 시작" : null,
    selectedPaceOptions.includes("start_today") ? "오늘 바로 시작" : null,
  ].filter((label): label is string => Boolean(label));

  const lifeClock = (() => {
    if (age === null || age < 0 || age > 100) return null;
    const totalHours = (age / 100) * 24;
    const hour24 = Math.floor(totalHours);
    const minute = Math.floor((totalHours - hour24) * 60);
    const meridiem = hour24 < 12 ? "오전" : "오후";
    const hour12Raw = hour24 % 12;
    const hour12 = hour12Raw === 0 ? 12 : hour12Raw;
    const label = `${meridiem} ${hour12}:${String(minute).padStart(2, "0")}`;
    const handIndex = Math.max(
      0,
      Math.min(
        CLOCK_HAND_ROTATION_CLASSES.length - 1,
        Math.floor((hour24 / 24) * CLOCK_HAND_ROTATION_CLASSES.length)
      )
    );

    return { label, handClassName: CLOCK_HAND_ROTATION_CLASSES[handIndex] };
  })();

  function handleAgeChange(value: string) {
    if (!value) {
      setAge(null);
      return;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      setAge(null);
      return;
    }

    setAge(Math.max(0, Math.min(100, parsed)));
  }

  function handleEnergySelect(value: "I" | "E") {
    setEnergyType(value);
    if (judgmentType) {
      setPersonalityType(`${value}${judgmentType}` as PersonalityType);
    } else {
      setPersonalityType(null);
    }
  }

  function handleJudgmentSelect(value: "T" | "F") {
    setJudgmentType(value);
    if (energyType) {
      setPersonalityType(`${energyType}${value}` as PersonalityType);
    } else {
      setPersonalityType(null);
    }
  }

  function handleSceneCategoryChange(nextCategory: OnboardingSceneCategory["key"]) {
    setSceneCategory(nextCategory);
    setSelectedDemoScene(null);
    setCustomSceneInput("");
  }

  function handleSelectDemoScene(item: DemoSceneItem) {
    if (item.text.includes("직접 입력")) {
      setSelectedDemoScene(null);
      return;
    }
    setSelectedDemoScene(item);
    setCustomSceneInput("");
  }

  function getHorizonTone(level: HorizonAction["level"]) {
    if (level === "someday") return "border-foreground/10 bg-foreground/[0.02]";
    if (level === "this_year") return "border-foreground/15 bg-foreground/[0.04]";
    if (level === "this_season") return "border-foreground/20 bg-foreground/[0.07]";
    return "border-foreground/25 bg-foreground/[0.1]";
  }

  function resetStep3State() {
    setLifeSceneAnalysis(null);
    setSelectedWeeklyAction("");
    setStep3AnalysisKey(null);
  }

  function resetStep4State() {
    setFirstStepPlan(null);
    setStep4PlanKey(null);
    setSelectedPaceOptions([]);
    setSpecificPacePlan(null);
    setIsAdjustingPace(false);
  }

  const runLifeSceneAnalysis = useCallback(
    async (force = false) => {
      if (!step3RequestKey || age === null || !gender || !personalityType) {
        return;
      }
      if (!force && step3AnalysisKey === step3RequestKey && lifeSceneAnalysis) {
        return;
      }

      setIsAnalyzingLifeScene(true);
      setError(null);
      if (force) {
        setLifeSceneAnalysis(null);
        setSelectedWeeklyAction("");
      }

      const result = await analyzeLifeSceneAction({
        sceneText: selectedSceneText,
        age,
        gender,
        personalityType,
      });

      if (!result.success || !result.data) {
        setError(result.error ?? "삶의 장면 분석 중 오류가 발생했습니다.");
        setIsAnalyzingLifeScene(false);
        return;
      }

      setLifeSceneAnalysis(result.data);
      setStep3AnalysisKey(step3RequestKey);

      const firstWeekly = result.data.horizons.find((item) => item.level === "this_week");
      setSelectedWeeklyAction(firstWeekly?.action ?? "");
      setIsAnalyzingLifeScene(false);
    },
    [
      age,
      gender,
      lifeSceneAnalysis,
      personalityType,
      selectedSceneText,
      step3AnalysisKey,
      step3RequestKey,
    ]
  );

  const runFirstStepGeneration = useCallback(
    async (force = false) => {
      if (!step4RequestKey || age === null || !gender || !personalityType || !selectedLifeArea) {
        return;
      }
      if (!force && step4PlanKey === step4RequestKey && firstStepPlan) {
        return;
      }

      setIsGeneratingFirstStep(true);
      setError(null);
      if (force) {
        setFirstStepPlan(null);
      }

      const result = await generateFirstStepAction({
        weeklyAction: selectedWeeklyAction,
        sceneText: selectedSceneText,
        lifeArea: selectedLifeArea,
        age,
        gender,
        personalityType,
      });

      if (!result.success || !result.data) {
        setError(result.error ?? "첫 실행안 생성 중 오류가 발생했습니다.");
        setIsGeneratingFirstStep(false);
        return;
      }

      setFirstStepPlan(result.data);
      setStep4PlanKey(step4RequestKey);
      setIsGeneratingFirstStep(false);
    },
    [
      age,
      firstStepPlan,
      gender,
      personalityType,
      selectedLifeArea,
      selectedSceneText,
      selectedWeeklyAction,
      step4PlanKey,
      step4RequestKey,
    ]
  );

  const handleTogglePaceOption = useCallback(
    async (option: PaceAdjustOption) => {
      const isSelected = selectedPaceOptions.includes(option);
      if (isSelected) {
        setSelectedPaceOptions((prev) => prev.filter((item) => item !== option));
        if (option === "more_specific") {
          setSpecificPacePlan(null);
          setIsAdjustingPace(false);
        }
        return;
      }

      setSelectedPaceOptions((prev) => [...prev, option]);
      if (option !== "more_specific") return;

      if (
        !firstStepPlan ||
        age === null ||
        !gender ||
        !personalityType ||
        !selectedLifeArea
      ) {
        setError("기본 실행안이 준비된 뒤에 더 구체적으로 조정할 수 있어요.");
        setSelectedPaceOptions((prev) =>
          prev.filter((item) => item !== "more_specific")
        );
        return;
      }

      setIsAdjustingPace(true);
      setError(null);

      const result = await adjustPaceAction({
        option: "more_specific",
        weeklyAction: selectedWeeklyAction,
        sceneText: selectedSceneText,
        lifeArea: selectedLifeArea,
        age,
        gender,
        personalityType,
        currentPlan: firstStepPlan,
      });

      if (!result.success || !result.data) {
        setError(result.error ?? "페이스 조정 중 오류가 발생했습니다.");
        setSelectedPaceOptions((prev) =>
          prev.filter((item) => item !== "more_specific")
        );
        setIsAdjustingPace(false);
        return;
      }

      setSpecificPacePlan(result.data);
      setIsAdjustingPace(false);
    },
    [
      age,
      firstStepPlan,
      gender,
      personalityType,
      selectedLifeArea,
      selectedPaceOptions,
      selectedSceneText,
      selectedWeeklyAction,
    ]
  );

  // legacy 필드 호환을 위한 최소 payload
  function computeGradeAndSubjects(): { grade: string; subjects: string[] } {
    return { grade: "", subjects: [] };
  }

  useEffect(() => {
    if (step !== 3) return;
    if (!step3RequestKey) return;
    void runLifeSceneAnalysis(false);
  }, [step, step3RequestKey, runLifeSceneAnalysis]);

  useEffect(() => {
    if (step !== 4) return;
    if (!step4RequestKey) return;
    void runFirstStepGeneration(false);
  }, [step, step4RequestKey, runFirstStepGeneration]);

  useEffect(() => {
    if (
      selectedPaceOptions.includes("lighter") ||
      selectedPaceOptions.includes("once_per_week")
    ) {
      setSelfLevel("low");
      return;
    }
    if (
      selectedPaceOptions.includes("more_specific") ||
      selectedPaceOptions.includes("start_today")
    ) {
      setSelfLevel("high");
      return;
    }
    setSelfLevel("medium");
  }, [selectedPaceOptions]);

  function handleNext() {
    setError(null);
    if (step === 1) {
      if (age === null || age < 0 || age > 100) {
        setError("나이를 입력해주세요.");
        return;
      }
      if (!gender) {
        setError("성별을 선택해주세요.");
        return;
      }
      if (!personalityType) {
        setError("성향을 선택해주세요.");
        return;
      }
      // 기존 저장 액션 호환: 닉네임 입력이 없으므로 기본값 사용
      if (!displayName.trim()) {
        setDisplayName("slowgoes 사용자");
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedSceneText) {
        setError("삶의 장면을 하나 선택하거나 직접 입력해주세요.");
        return;
      }
      // Step 3~4 기존 로직 호환을 위한 기본 컨텍스트
      if (userContext.length === 0) {
        setUserContext(["personal"]);
      }
      resetStep3State();
      setStep(3);
    } else if (step === 3) {
      if (!lifeSceneAnalysis) {
        setError("아직 분석이 완료되지 않았어요. 잠시만 기다려주세요.");
        return;
      }
      if (!selectedWeeklyAction) {
        setError("이번 주에 시작할 한 걸음을 선택해주세요.");
        return;
      }
      resetStep4State();
      setStep(4);
    }
  }

  function handleBack() {
    setError(null);
    setStep((prev) => prev - 1);
  }

  async function handleSubmit() {
    setError(null);
    if (isGeneratingFirstStep || isAdjustingPace) {
      setError("실행안을 준비하는 중이에요. 잠시만 기다려주세요.");
      return;
    }
    if (!displayedStepPlan) {
      setError("첫 실행안이 아직 준비되지 않았어요.");
      return;
    }
    if (age === null || !gender || !personalityType) {
      setError("기본 프로필 정보가 비어 있어요. Step 1부터 다시 확인해주세요.");
      return;
    }
    if (!selectedSceneText || !selectedLifeArea || !selectedWeeklyAction) {
      setError("삶의 장면 또는 실행 정보가 비어 있어요. Step 2~3을 다시 확인해주세요.");
      return;
    }
    setIsLoading(true);

    try {
      const { grade, subjects } = computeGradeAndSubjects();
      const paceType = inferPaceType(selectedPaceOptions, selfLevel);

      const result = await saveOnboardingV2Action({
        displayName: displayName.trim(),
        selfLevel,
        userContext: userContext.length > 0 ? userContext : ["personal"],
        grade,
        subjects,
        sceneText: selectedSceneText,
        selectedWeeklyAction,
        lifeArea: selectedLifeArea,
        age,
        gender,
        personalityType,
        paceType,
        chapterTitle: selectedSeasonAction || `${selectedSceneText} 이번 시즌 실행`,
        plan: displayedStepPlan,
      });
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // redirect는 에러로 throw되므로 무시
    } finally {
      setIsLoading(false);
    }
  }

  const stepIndicator = (
    <div className="flex items-center gap-1.5 mb-6">
      {[1, 2, 3, 4].map((s) => (
        <div
          key={s}
          className={cn(
            "h-1.5 rounded-full transition-all",
            s === step ? "w-6 bg-foreground" : "w-3 bg-foreground/20"
          )}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {stepIndicator}

      {/* Step 1: 인생시간 체험 */}
      {step === 1 && (
        <div className="flex flex-col gap-6">
          {/* 상단 인생시계 영역 */}
          <div className="rounded-2xl border border-foreground/15 bg-foreground/[0.03] p-5">
            <p className="text-sm text-foreground/60 mb-4">당신의 시간을 알려주세요</p>

            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 rounded-full border-2 border-foreground/20 bg-background">
                <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/60" />
                <div
                  className={cn(
                    "absolute left-1/2 top-1/2 h-8 w-0.5 -translate-x-1/2 -translate-y-[95%] origin-bottom rounded-full bg-foreground transition-transform duration-300",
                    lifeClock?.handClassName ?? "rotate-0"
                  )}
                />
              </div>

              <div className="min-h-[48px]">
                {lifeClock ? (
                  <p className="text-base font-semibold">당신의 인생 시계는 {lifeClock.label}이에요.</p>
                ) : (
                  <p className="text-sm text-foreground/50">나이를 입력하면 인생시계가 시작돼요.</p>
                )}
                {personalityType && (
                  <p className="text-xs text-foreground/50 mt-1">현재 성향: {personalityType}</p>
                )}
              </div>
            </div>
          </div>

          {/* 입력 영역 */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="life_clock_age" className="text-sm font-medium text-foreground/70">
                나이
              </label>
              <input
                id="life_clock_age"
                inputMode="numeric"
                type="number"
                min={0}
                max={100}
                placeholder="예: 27"
                value={age ?? ""}
                onChange={(e) => handleAgeChange(e.target.value)}
                autoFocus
                className="w-full rounded-lg border border-foreground/20 bg-transparent px-4 py-3 text-base min-h-[44px] placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground/70">성별</p>
              <div className="grid grid-cols-2 gap-2">
                {GENDER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGender(option.value)}
                    className={cn(
                      "rounded-lg border px-4 py-2.5 min-h-[44px] text-sm font-medium transition-colors cursor-pointer",
                      gender === option.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-foreground/20 hover:bg-foreground/5"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground/70">에너지 방향</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleEnergySelect("I")}
                  className={cn(
                    "rounded-lg border px-4 py-2.5 min-h-[44px] text-sm font-medium transition-colors cursor-pointer",
                    energyType === "I"
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground/20 hover:bg-foreground/5"
                  )}
                >
                  혼자가 편한 (I)
                </button>
                <button
                  type="button"
                  onClick={() => handleEnergySelect("E")}
                  className={cn(
                    "rounded-lg border px-4 py-2.5 min-h-[44px] text-sm font-medium transition-colors cursor-pointer",
                    energyType === "E"
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground/20 hover:bg-foreground/5"
                  )}
                >
                  사람과 함께가 좋은 (E)
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground/70">판단 방식</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleJudgmentSelect("T")}
                  className={cn(
                    "rounded-lg border px-4 py-2.5 min-h-[44px] text-sm font-medium transition-colors cursor-pointer",
                    judgmentType === "T"
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground/20 hover:bg-foreground/5"
                  )}
                >
                  논리적으로 따지는 (T)
                </button>
                <button
                  type="button"
                  onClick={() => handleJudgmentSelect("F")}
                  className={cn(
                    "rounded-lg border px-4 py-2.5 min-h-[44px] text-sm font-medium transition-colors cursor-pointer",
                    judgmentType === "F"
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground/20 hover:bg-foreground/5"
                  )}
                >
                  감정과 공감 중심 (F)
                </button>
              </div>
            </div>
          </div>

          {isStep1Complete && (
            <div className="rounded-lg border border-foreground/10 bg-foreground/[0.03] px-4 py-3">
              <p className="text-sm text-foreground/70">지금은 탐색의 시간이에요.</p>
              <p className="text-sm text-foreground/70">앞으로 어떤 장면을 그리며 살고 싶은지, 같이 찾아볼까요?</p>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="button" onClick={handleNext} className="w-full">
            시작하기
          </Button>
        </div>
      )}

      {/* Step 2: 삶의 장면 선택 */}
      {step === 2 && (
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3">
            <p className="text-sm text-foreground/60">인생시계</p>
            <p className="text-base font-semibold">
              {lifeClock ? `당신의 인생 시계는 ${lifeClock.label}이에요.` : "당신의 시간을 알려주세요"}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-1">어떤 것을 만들고, 그리고 살고 싶나요?</h2>
            <p className="text-sm text-foreground/60">삶의 장면을 하나 골라볼게요</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="scene_category" className="text-sm font-medium text-foreground/70">
              카테고리
            </label>
            <select
              id="scene_category"
              value={sceneCategory}
              onChange={(e) =>
                handleSceneCategoryChange(e.target.value as OnboardingSceneCategory["key"])
              }
              className="w-full rounded-lg border border-foreground/20 bg-transparent px-4 py-3 text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
            >
              {getSceneCategoryOptions().map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            {gender && personalityType && age !== null ? (
              getDemoScenes({
                category: sceneCategory,
                age,
                gender,
                personalityType,
              }).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectDemoScene(item)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left text-sm font-medium min-h-[44px] transition-colors cursor-pointer",
                    selectedDemoScene?.id === item.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground/20 hover:bg-foreground/5"
                  )}
                >
                  {item.text}
                </button>
              ))
            ) : (
              <p className="text-sm text-foreground/60">Step 1 정보를 먼저 입력해주세요.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="custom_scene" className="text-sm font-medium text-foreground/70">
              직접 입력 ✏️
            </label>
            <textarea
              id="custom_scene"
              value={customSceneInput}
              onChange={(e) => {
                setCustomSceneInput(e.target.value);
                if (e.target.value.trim().length > 0) {
                  setSelectedDemoScene(null);
                }
              }}
              placeholder="예: 부모님과 여행 가기"
              rows={3}
              className="w-full rounded-lg border border-foreground/20 bg-transparent px-4 py-3 text-sm min-h-[88px] placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          {selectedSceneText && (
            <div className="rounded-lg border border-foreground/10 bg-foreground/[0.03] px-4 py-3">
              <p className="text-xs text-foreground/50 mb-1">선택한 삶의 장면</p>
              <p className="text-sm font-medium">{selectedSceneText}</p>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={handleBack} className="flex-1">
              이전
            </Button>
            <Button type="button" onClick={handleNext} className="flex-1">
              다음
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: AI 정리 — 영역 분류 + 시간 지평 + 첫 한 걸음 선택 */}
      {step === 3 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">삶의 장면을 시간으로 정리하고 있어요</h2>
            <p className="text-sm text-foreground/60">시간 지평으로 나눠서 지금 시작할 한 걸음을 찾아볼게요</p>
          </div>

          {isAnalyzingLifeScene && (
            <div className="flex flex-col gap-3 animate-pulse">
              <div className="h-8 w-24 rounded-full bg-foreground/10" />
              <div className="h-5 w-2/3 rounded bg-foreground/10" />
              <div className="h-20 rounded-xl border border-foreground/10 bg-foreground/[0.03]" />
              <div className="h-20 rounded-xl border border-foreground/10 bg-foreground/[0.05]" />
              <div className="h-20 rounded-xl border border-foreground/10 bg-foreground/[0.08]" />
              <div className="h-20 rounded-xl border border-foreground/10 bg-foreground/[0.1]" />
            </div>
          )}

          {!isAnalyzingLifeScene && lifeSceneAnalysis && (
            <>
              <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-4">
                <span className="inline-flex rounded-full border border-foreground/20 px-3 py-1 text-xs font-medium">
                  {lifeSceneAnalysis.lifeArea}
                </span>
                <p className="text-sm text-foreground/70 mt-3">{lifeSceneAnalysis.empathyMessage}</p>
                <p className="text-xs text-foreground/50 mt-1">시간 지평으로 나눠볼게요.</p>
              </div>

              <div className="flex flex-col gap-3">
                {orderedHorizons.map((item, index) => {
                  const isWeekly = item.level === "this_week";
                  const isSelected = selectedWeeklyAction === item.action;
                  return (
                    <button
                      key={`${item.level}-${index}-${item.action}`}
                      type="button"
                      onClick={() => {
                        if (!isWeekly) return;
                        setSelectedWeeklyAction(item.action);
                        setError(null);
                      }}
                      className={cn(
                        "w-full rounded-xl border px-4 py-4 text-left transition-colors",
                        getHorizonTone(item.level),
                        isWeekly ? "cursor-pointer" : "cursor-default",
                        isSelected && "border-foreground bg-foreground text-background",
                        isWeekly && !isSelected && "hover:bg-foreground/[0.14]"
                      )}
                    >
                      <p
                        className={cn(
                          "text-xs font-medium mb-1",
                          isSelected ? "text-background/80" : "text-foreground/60"
                        )}
                      >
                        {item.label}
                      </p>
                      <p className="text-sm font-medium">{item.action}</p>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-lg border border-foreground/10 bg-foreground/[0.03] px-4 py-3">
                <p className="text-sm text-foreground/70">가장 먼저 움직여볼 한 걸음을 골라주세요.</p>
              </div>
            </>
          )}

          {!isAnalyzingLifeScene && !lifeSceneAnalysis && error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
              <p className="text-sm text-red-500">{error}</p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 w-full"
                onClick={() => {
                  void runLifeSceneAnalysis(true);
                }}
              >
                다시 시도
              </Button>
            </div>
          )}

          {error && lifeSceneAnalysis && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={handleBack} className="flex-1">
              이전
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              className="flex-1"
              disabled={isAnalyzingLifeScene || !selectedWeeklyAction}
            >
              이걸로 시작할게요
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: 첫 실행안 + 나의 속도 */}
      {step === 4 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">이번 주의 한 걸음</h2>
            <p className="text-sm text-foreground/60">지금 시작하기 쉬운 실행안으로 다듬었어요</p>
          </div>

          <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-4">
            <p className="text-xs text-foreground/50 mb-1">선택한 한 걸음</p>
            <p className="text-sm font-medium">{selectedWeeklyAction || "선택된 한 걸음이 없어요."}</p>
            {selectedLifeArea && (
              <p className="text-xs text-foreground/50 mt-1">→ {selectedLifeArea}</p>
            )}
          </div>

          {isGeneratingFirstStep && (
            <div className="flex flex-col gap-3 animate-pulse">
              <div className="h-5 w-40 rounded bg-foreground/10" />
              <div className="h-16 rounded-xl border border-foreground/10 bg-foreground/[0.05]" />
              <div className="h-12 rounded-lg border border-foreground/10 bg-foreground/[0.04]" />
              <div className="h-12 rounded-lg border border-foreground/10 bg-foreground/[0.04]" />
              <div className="h-12 rounded-lg border border-foreground/10 bg-foreground/[0.04]" />
            </div>
          )}

          {!isGeneratingFirstStep && displayedStepPlan && (
            <div className="rounded-xl border border-foreground/15 px-4 py-4">
              <p className="text-sm font-semibold">
                예상 {formatMinutes(displayedStepPlan.estimatedMinutes)} ·{" "}
                {getDifficultyConfig(displayedStepPlan.difficulty).label}
              </p>
              {paceMetaLabels.length > 0 && (
                <p className="text-xs text-foreground/60 mt-1">{paceMetaLabels.join(" · ")}</p>
              )}
              <div className="mt-3 flex flex-col gap-2">
                {displayedStepPlan.subtasks.map((subtask, index) => (
                  <div
                    key={`${subtask.title}-${index}`}
                    className="rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-3"
                  >
                    <p className="text-sm font-medium">{subtask.title}</p>
                    <p className="text-xs text-foreground/60 mt-1">
                      {formatMinutes(subtask.estimated_minutes)} ·{" "}
                      {getDifficultyConfig(subtask.difficulty).label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isGeneratingFirstStep && !displayedStepPlan && error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
              <p className="text-sm text-red-500">{error}</p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 w-full"
                onClick={() => {
                  void runFirstStepGeneration(true);
                }}
              >
                실행안 다시 만들기
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground/70">나의 페이스 조정</label>
            <div className="grid grid-cols-2 gap-2">
              {PACE_ADJUST_OPTIONS.map((option) => {
                const active = selectedPaceOptions.includes(option.value);
                const loading = option.value === "more_specific" && isAdjustingPace;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      void handleTogglePaceOption(option.value);
                    }}
                    disabled={isGeneratingFirstStep || (isAdjustingPace && option.value !== "more_specific")}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-sm font-medium min-h-[44px] transition-colors",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-foreground/20 hover:bg-foreground/5"
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      {loading && (
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      )}
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {isAdjustingPace && (
            <p className="text-xs text-foreground/60 text-center">더 구체적으로 실행안을 다듬고 있어요...</p>
          )}

          {error && (isGeneratingFirstStep || displayedStepPlan || isAdjustingPace) && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={handleBack} className="flex-1">
              이전
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              isLoading={isLoading}
              className="flex-1"
              disabled={isGeneratingFirstStep || isAdjustingPace || !displayedStepPlan}
            >
              시작하기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
