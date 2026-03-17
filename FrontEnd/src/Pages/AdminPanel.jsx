import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axiosClient from "../utils/axiosClient";

const languageOptions = [
  { value: "c++", label: "C++" },
  { value: "java", label: "Java" },
  { value: "javascript", label: "JavaScript" },
];

const difficultyOptions = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const tagOptions = [
  { value: "array", label: "Array" },
  { value: "linkedList", label: "Linked List" },
  { value: "graph", label: "Graph" },
  { value: "dp", label: "Dynamic Programming" },
];

const operationCards = [
  {
    value: "create",
    eyebrow: "01",
    title: "Create Problem",
    description: "Add a new coding challenge with visible cases, hidden cases, starter code, and reference solutions.",
  },
  {
    value: "update",
    eyebrow: "02",
    title: "Update Problem",
    description: "Select an existing problem, load its full payload, and edit the content from the same workspace.",
  },
  {
    value: "delete",
    eyebrow: "03",
    title: "Delete Problem",
    description: "Pick an existing problem from the catalogue and remove it with an explicit confirmation.",
  },
  {
    value: "create_mission",
    eyebrow: "04",
    title: "Create Mission",
    description: "Group existing problems into a new mission to reward users with points upon completion.",
  },
];

const problemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.enum(["array", "linkedList", "graph", "dp"]),
  visibalTestCases: z
    .array(
      z.object({
        input: z.string().min(1, "Input is required"),
        output: z.string().min(1, "Output is required"),
        explanation: z.string().min(1, "Explanation is required"),
      })
    )
    .min(1, "At least one visible test case is required"),
  hiddenTestCases: z
    .array(
      z.object({
        input: z.string().min(1, "Input is required"),
        output: z.string().min(1, "Output is required"),
      })
    )
    .min(1, "At least one hidden test case is required"),
  startCode: z
    .array(
      z.object({
        language: z.enum(["c++", "java", "javascript"]),
        intialCode: z.string().min(1, "Initial code is required"),
      })
    )
    .length(3, "All three languages are required"),
  referenceSolution: z
    .array(
      z.object({
        language: z.enum(["c++", "java", "javascript"]),
        code: z.string().min(1, "Reference code is required"),
      })
    )
    .length(3, "All three languages are required"),
});

const missionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  points: z.coerce.number().min(1, "Points must be at least 1"),
  problems: z.array(z.string()).min(1, "At least one problem is required for a mission"),
});

function createDefaultValues() {
  return {
    title: "",
    description: "",
    difficulty: "easy",
    tags: "array",
    visibalTestCases: [{ input: "", output: "", explanation: "" }],
    hiddenTestCases: [{ input: "", output: "" }],
    startCode: languageOptions.map((lang) => ({ language: lang.value, intialCode: "" })),
    referenceSolution: languageOptions.map((lang) => ({ language: lang.value, code: "" })),
  };
}

function buildLanguageEntries(entries, key) {
  return languageOptions.map((lang) => {
    const match = Array.isArray(entries) ? entries.find((item) => item?.language === lang.value) : undefined;

    return {
      language: lang.value,
      [key]: match?.[key] || "",
    };
  });
}

function normalizeProblemValues(problem) {
  return {
    title: problem?.title || "",
    description: problem?.description || "",
    difficulty: problem?.difficulty || "easy",
    tags: problem?.tags || "array",
    visibalTestCases:
      Array.isArray(problem?.visibalTestCases) && problem.visibalTestCases.length > 0
        ? problem.visibalTestCases.map((testCase) => ({
            input: testCase?.input || "",
            output: testCase?.output || "",
            explanation: testCase?.explanation || "",
          }))
        : [{ input: "", output: "", explanation: "" }],
    hiddenTestCases:
      Array.isArray(problem?.hiddenTestCases) && problem.hiddenTestCases.length > 0
        ? problem.hiddenTestCases.map((testCase) => ({
            input: testCase?.input || "",
            output: testCase?.output || "",
          }))
        : [{ input: "", output: "" }],
    startCode: buildLanguageEntries(problem?.startCode, "intialCode"),
    referenceSolution: buildLanguageEntries(problem?.referenceSolution, "code"),
  };
}

function getErrorMessage(error, fallbackMessage) {
  if (typeof error?.response?.data === "string") {
    return error.response.data;
  }

  return error?.response?.data?.message || fallbackMessage;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const totalSeconds = Math.round(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const nextDate = new Date(value);
  if (Number.isNaN(nextDate.getTime())) {
    return "-";
  }

  return nextDate.toLocaleString();
}

function FormField({ label, hint, error, children }) {
  return (
    <label className="form-control gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-base-content">{label}</span>
        {hint ? <span className="text-xs text-base-content/50">{hint}</span> : null}
      </div>
      {children}
      {error ? <span className="text-sm text-error">{error}</span> : null}
    </label>
  );
}

function SectionCard({ title, description, action, children }) {
  return (
    <section className="rounded-4xl border border-base-300/70 bg-base-100/95 p-5 shadow-sm shadow-base-content/5 md:p-7">
      <div className="mb-5 flex flex-col gap-3 border-b border-base-300/70 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-base-content">{title}</h2>
          {description ? <p className="mt-1 max-w-2xl text-sm text-base-content/65">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function OperationCard({ title, description, eyebrow, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-4xl border p-5 text-left transition duration-200 ${
        isActive
          ? "border-primary bg-primary text-primary-content shadow-xl shadow-primary/20"
          : "border-base-300/70 bg-base-100/90 text-base-content shadow-sm shadow-base-content/5 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
      }`}
    >
      <div className="text-xs font-bold uppercase tracking-[0.24em] opacity-70">{eyebrow}</div>
      <h2 className="mt-4 text-2xl font-black tracking-tight">{title}</h2>
      <p className={`mt-3 text-sm leading-6 ${isActive ? "text-primary-content/80" : "text-base-content/65"}`}>{description}</p>
      <div className="mt-5 text-sm font-semibold">{isActive ? "Selected" : "Open workspace"}</div>
    </button>
  );
}

function ProblemList({ title, description, problems, selectedId, loading, emptyMessage, onSelect }) {
  return (
    <SectionCard title={title} description={description}>
      {loading ? (
        <div className="flex min-h-40 items-center justify-center rounded-3xl bg-base-200/70">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : problems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-base-300 bg-base-200/50 p-5 text-sm text-base-content/65">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {problems.map((problem) => {
            const isSelected = selectedId === problem._id;

            return (
              <button
                key={problem._id}
                type="button"
                onClick={() => onSelect(problem._id)}
                className={`rounded-3xl border p-4 text-left transition duration-200 ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                    : "border-base-300/70 bg-base-100 hover:-translate-y-0.5 hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-base-content">{problem.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-base-content/60">{problem.description}</p>
                  </div>
                  <span className={`badge ${isSelected ? "badge-primary" : "badge-outline"}`}>{problem.difficulty}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="badge badge-outline">{problem.tags}</span>
                  <span className="badge badge-outline">{problem.visibalTestCases?.length || 0} visible</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function ProblemEditorForm({
  mode,
  form,
  onSubmit,
  submitLabel,
  submitError,
  submitSuccess,
  secondaryAction,
  headerTitle,
  headerDescription,
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const {
    fields: visibleFields,
    append: appendVisible,
    remove: removeVisible,
  } = useFieldArray({
    control,
    name: "visibalTestCases",
  });

  const {
    fields: hiddenFields,
    append: appendHidden,
    remove: removeHidden,
  } = useFieldArray({
    control,
    name: "hiddenTestCases",
  });

  const watchedVisibleCases = useWatch({ control, name: "visibalTestCases" }) || [];
  const watchedHiddenCases = useWatch({ control, name: "hiddenTestCases" }) || [];
  const watchedStarterCode = useWatch({ control, name: "startCode" }) || [];

  return (
    <div className="rounded-4xl border border-base-300/60 bg-base-100/80 p-3 shadow-2xl shadow-base-content/5 backdrop-blur md:p-4">
      <div className="rounded-3xl bg-base-100 p-4 md:p-6">
        <div className="mb-6 flex flex-col gap-4 rounded-4xl bg-linear-to-r from-base-200 via-base-100 to-base-200 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="badge badge-neutral">Admin Workspace</span>
              <span className="badge badge-outline">{mode === "create" ? "New problem" : "Existing problem"}</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-base-content md:text-3xl">{headerTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-base-content/65">{headerDescription}</p>
          </div>
          <div className="stats stats-vertical border border-base-300/70 bg-base-100 shadow-sm sm:stats-horizontal">
            <div className="stat px-5 py-4">
              <div className="stat-title">Languages</div>
              <div className="stat-value text-primary">{watchedStarterCode.length || 0}</div>
            </div>
            <div className="stat px-5 py-4">
              <div className="stat-title">Total test cases</div>
              <div className="stat-value text-secondary">{watchedVisibleCases.length + watchedHiddenCases.length}</div>
            </div>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <SectionCard
            title="Problem basics"
            description="Define the title, difficulty, primary tag, and problem statement."
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.9fr)]">
              <div className="space-y-4">
                <FormField label="Title" error={errors.title?.message}>
                  <input
                    className="input input-bordered h-12 w-full rounded-2xl border-base-300 bg-base-100 px-4"
                    placeholder="e.g. Longest Increasing Subsequence"
                    {...register("title")}
                  />
                </FormField>

                <FormField label="Description" hint="Markdown is not required" error={errors.description?.message}>
                  <textarea
                    className="textarea textarea-bordered min-h-48 w-full rounded-2xl border-base-300 bg-base-100 px-4 py-3"
                    placeholder="Describe the problem, input format, output format, and important constraints."
                    {...register("description")}
                  />
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-3xl bg-base-200/70 p-4">
                  <FormField label="Difficulty">
                    <select
                      className="select select-bordered h-12 w-full rounded-2xl border-base-300 bg-base-100 px-4"
                      {...register("difficulty")}
                    >
                      {difficultyOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div className="rounded-3xl bg-base-200/70 p-4">
                  <FormField label="Tag">
                    <select
                      className="select select-bordered h-12 w-full rounded-2xl border-base-300 bg-base-100 px-4"
                      {...register("tags")}
                    >
                      {tagOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div className="rounded-3xl border border-dashed border-base-300 bg-base-100 p-4 text-sm text-base-content/65">
                  Keep the primary tag aligned with the dominant technique needed to solve the problem.
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Visible test cases"
            description="These examples are shown to users. Keep them understandable and representative."
            action={
              <button
                type="button"
                className="btn btn-neutral rounded-full px-5"
                onClick={() => appendVisible({ input: "", output: "", explanation: "" })}
              >
                Add visible case
              </button>
            }
          >
            <div className="space-y-4">
              {visibleFields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-3xl border border-base-300/80 bg-base-100 p-4 shadow-sm shadow-base-content/5"
                >
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-base-content/45">Visible case</div>
                      <h3 className="text-lg font-semibold text-base-content">Case {index + 1}</h3>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline btn-error rounded-full"
                      onClick={() => removeVisible(index)}
                      disabled={visibleFields.length === 1}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <FormField label="Input" error={errors.visibalTestCases?.[index]?.input?.message}>
                      <textarea
                        className="textarea textarea-bordered min-h-28 w-full rounded-2xl border-base-300 bg-base-100 px-4 py-3"
                        placeholder="Example input"
                        {...register(`visibalTestCases.${index}.input`)}
                      />
                    </FormField>
                    <FormField label="Output" error={errors.visibalTestCases?.[index]?.output?.message}>
                      <textarea
                        className="textarea textarea-bordered min-h-28 w-full rounded-2xl border-base-300 bg-base-100 px-4 py-3"
                        placeholder="Expected output"
                        {...register(`visibalTestCases.${index}.output`)}
                      />
                    </FormField>
                    <FormField label="Explanation" error={errors.visibalTestCases?.[index]?.explanation?.message}>
                      <textarea
                        className="textarea textarea-bordered min-h-28 w-full rounded-2xl border-base-300 bg-base-100 px-4 py-3"
                        placeholder="Why this case matters"
                        {...register(`visibalTestCases.${index}.explanation`)}
                      />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Hidden test cases"
            description="Use these for evaluation-only coverage, edge cases, and constraints."
            action={
              <button
                type="button"
                className="btn btn-neutral rounded-full px-5"
                onClick={() => appendHidden({ input: "", output: "" })}
              >
                Add hidden case
              </button>
            }
          >
            <div className="space-y-4">
              {hiddenFields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-3xl border border-base-300/80 bg-base-100 p-4 shadow-sm shadow-base-content/5"
                >
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-base-content/45">Hidden case</div>
                      <h3 className="text-lg font-semibold text-base-content">Case {index + 1}</h3>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline btn-error rounded-full"
                      onClick={() => removeHidden(index)}
                      disabled={hiddenFields.length === 1}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <FormField label="Input" error={errors.hiddenTestCases?.[index]?.input?.message}>
                      <textarea
                        className="textarea textarea-bordered min-h-28 w-full rounded-2xl border-base-300 bg-base-100 px-4 py-3"
                        placeholder="Hidden input"
                        {...register(`hiddenTestCases.${index}.input`)}
                      />
                    </FormField>
                    <FormField label="Output" error={errors.hiddenTestCases?.[index]?.output?.message}>
                      <textarea
                        className="textarea textarea-bordered min-h-28 w-full rounded-2xl border-base-300 bg-base-100 px-4 py-3"
                        placeholder="Expected result"
                        {...register(`hiddenTestCases.${index}.output`)}
                      />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Starter code"
            description="Provide a clean starting point for each supported language."
          >
            <div className="grid gap-4 xl:grid-cols-3">
              {languageOptions.map((lang, index) => (
                <div key={lang.value} className="rounded-3xl bg-base-200/70 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-base-content">{lang.label}</h3>
                    <span className="badge badge-outline">Starter</span>
                  </div>
                  <textarea
                    className="textarea textarea-bordered min-h-64 w-full rounded-2xl border-base-300 bg-base-100 px-4 py-3 font-mono text-sm"
                    placeholder={`Write ${lang.label} starter code`}
                    {...register(`startCode.${index}.intialCode`)}
                  />
                  {errors.startCode?.[index]?.intialCode ? (
                    <span className="mt-2 block text-sm text-error">{errors.startCode[index].intialCode.message}</span>
                  ) : null}
                  <input type="hidden" {...register(`startCode.${index}.language`)} defaultValue={lang.value} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Reference solutions"
            description="Keep accepted implementations aligned for judging and editorial work."
          >
            <div className="grid gap-4 xl:grid-cols-3">
              {languageOptions.map((lang, index) => (
                <div key={lang.value} className="rounded-3xl bg-base-200/70 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-base-content">{lang.label}</h3>
                    <span className="badge badge-primary badge-outline">Reference</span>
                  </div>
                  <textarea
                    className="textarea textarea-bordered min-h-64 w-full rounded-2xl border-base-300 bg-base-100 px-4 py-3 font-mono text-sm"
                    placeholder={`Write ${lang.label} reference solution`}
                    {...register(`referenceSolution.${index}.code`)}
                  />
                  {errors.referenceSolution?.[index]?.code ? (
                    <span className="mt-2 block text-sm text-error">{errors.referenceSolution[index].code.message}</span>
                  ) : null}
                  <input type="hidden" {...register(`referenceSolution.${index}.language`)} defaultValue={lang.value} />
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="sticky bottom-4 z-10 rounded-[1.75rem] border border-base-300/70 bg-base-100/95 p-4 shadow-xl shadow-base-content/10 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                {(errors.visibalTestCases || errors.hiddenTestCases || errors.startCode || errors.referenceSolution) && (
                  <div className="alert alert-error rounded-2xl text-sm">
                    Please fill all required test case and code fields correctly.
                  </div>
                )}

                {submitError ? <div className="alert alert-error rounded-2xl">{submitError}</div> : null}
                {submitSuccess ? <div className="alert alert-success rounded-2xl">{submitSuccess}</div> : null}
              </div>

              <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
                {secondaryAction}
                <button
                  className={`btn btn-primary h-14 min-w-full rounded-full px-8 text-base lg:min-w-56 ${isSubmitting ? "loading" : ""}`}
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving" : submitLabel}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [activeAction, setActiveAction] = useState("create");
  const [problems, setProblems] = useState([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState("");
  const [createFeedback, setCreateFeedback] = useState({ error: "", success: "" });
  const [updateFeedback, setUpdateFeedback] = useState({ error: "", success: "" });
  const [deleteFeedback, setDeleteFeedback] = useState({ error: "", success: "" });
  const [createMissionFeedback, setCreateMissionFeedback] = useState({ error: "", success: "" });
  const [selectedUpdateProblemId, setSelectedUpdateProblemId] = useState("");
  const [selectedDeleteProblemId, setSelectedDeleteProblemId] = useState("");
  const [updateProblemLoading, setUpdateProblemLoading] = useState(false);
  const [updateFormReady, setUpdateFormReady] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [editorialVideo, setEditorialVideo] = useState(null);
  const [editorialLoading, setEditorialLoading] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [videoActionLoading, setVideoActionLoading] = useState(false);
  const [videoActionError, setVideoActionError] = useState("");
  const [videoActionSuccess, setVideoActionSuccess] = useState("");
  const [videoInputKey, setVideoInputKey] = useState(0);

  const createForm = useForm({
    resolver: zodResolver(problemSchema),
    defaultValues: createDefaultValues(),
  });

  const updateForm = useForm({
    resolver: zodResolver(problemSchema),
    defaultValues: createDefaultValues(),
  });

  const missionForm = useForm({
    resolver: zodResolver(missionSchema),
    defaultValues: { title: "", description: "", points: 100, problems: [] },
  });

  const loadProblems = async () => {
    setCatalogueLoading(true);
    setCatalogueError("");

    try {
      const response = await axiosClient.get("/problem/allProblem");
      const nextProblems = Array.isArray(response.data) ? response.data : [];
      setProblems(nextProblems);
      return nextProblems;
    } catch (error) {
      if (error?.response?.status === 404) {
        setProblems([]);
        return [];
      }

      setCatalogueError(getErrorMessage(error, "Unable to load problem catalogue"));
      return [];
    } finally {
      setCatalogueLoading(false);
    }
  };

  const loadProblemForUpdate = useCallback(async (problemId) => {
    if (!problemId) {
      updateForm.reset(createDefaultValues());
      setUpdateFormReady(false);
      return;
    }

    setUpdateProblemLoading(true);
    setUpdateFeedback({ error: "", success: "" });

    try {
      const response = await axiosClient.get(`/problem/admin/problemById/${problemId}`);
      updateForm.reset(normalizeProblemValues(response.data));
      setUpdateFormReady(true);
    } catch (error) {
      setUpdateFeedback({ error: getErrorMessage(error, "Unable to load problem details"), success: "" });
      setUpdateFormReady(false);
    } finally {
      setUpdateProblemLoading(false);
    }
  }, [updateForm]);

  const loadEditorialVideo = useCallback(async (problemId) => {
    if (!problemId) {
      setEditorialVideo(null);
      return;
    }

    setEditorialLoading(true);
    setVideoActionError("");

    try {
      const response = await axiosClient.get(`/video/problem/${problemId}`);
      setEditorialVideo(response.data || null);
    } catch (error) {
      if (error?.response?.status === 404) {
        setEditorialVideo(null);
      } else {
        setEditorialVideo(null);
        setVideoActionError(getErrorMessage(error, "Unable to load editorial video"));
      }
    } finally {
      setEditorialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProblems();
  }, []);

  useEffect(() => {
    if (activeAction !== "update") {
      setEditorialVideo(null);
      setVideoFile(null);
      setVideoActionError("");
      setVideoActionSuccess("");
      return;
    }

    if (!selectedUpdateProblemId) {
      updateForm.reset(createDefaultValues());
      setUpdateFormReady(false);
      setEditorialVideo(null);
      setVideoActionError("");
      setVideoActionSuccess("");
      return;
    }

    loadProblemForUpdate(selectedUpdateProblemId);
    loadEditorialVideo(selectedUpdateProblemId);
  }, [activeAction, selectedUpdateProblemId, loadEditorialVideo, loadProblemForUpdate, updateForm]);

  const handleCreate = async (formData) => {
    setCreateFeedback({ error: "", success: "" });

    try {
      await axiosClient.post("/problem/create", formData);
      createForm.reset(createDefaultValues());
      await loadProblems();
      setCreateFeedback({ error: "", success: "Problem created successfully." });
    } catch (error) {
      setCreateFeedback({ error: getErrorMessage(error, "Unable to create problem"), success: "" });
    }
  };

  const handleCreateMission = async (formData) => {
    setCreateMissionFeedback({ error: "", success: "" });
    try {
      // The endpoint is /mission/create according to the new backend missionRoutes!
      await axiosClient.post("/mission/create", formData);
      missionForm.reset({ title: "", description: "", points: 100, problems: [] });
      setCreateMissionFeedback({ error: "", success: "Mission created successfully." });
    } catch (error) {
      setCreateMissionFeedback({ error: getErrorMessage(error, "Unable to create mission"), success: "" });
    }
  };

  const handleUpdate = async (formData) => {
    if (!selectedUpdateProblemId) {
      setUpdateFeedback({ error: "Select a problem to update first.", success: "" });
      return;
    }

    setUpdateFeedback({ error: "", success: "" });

    try {
      await axiosClient.put(`/problem/update/${selectedUpdateProblemId}`, formData);
      await loadProblems();
      await loadProblemForUpdate(selectedUpdateProblemId);
      setUpdateFeedback({ error: "", success: "Problem updated successfully." });
    } catch (error) {
      setUpdateFeedback({ error: getErrorMessage(error, "Unable to update problem"), success: "" });
    }
  };

  const handleDelete = async () => {
    if (!selectedDeleteProblemId) {
      setDeleteFeedback({ error: "Select a problem to delete first.", success: "" });
      return;
    }

    const selectedProblem = problems.find((problem) => problem._id === selectedDeleteProblemId);
    const confirmed = window.confirm(
      `Delete problem${selectedProblem?.title ? ` "${selectedProblem.title}"` : ""}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletePending(true);
    setDeleteFeedback({ error: "", success: "" });

    try {
      await axiosClient.delete(`/problem/delete/${selectedDeleteProblemId}`);
      const nextProblems = await loadProblems();

      if (selectedUpdateProblemId === selectedDeleteProblemId) {
        setSelectedUpdateProblemId("");
        updateForm.reset(createDefaultValues());
        setUpdateFormReady(false);
      }

      setSelectedDeleteProblemId(nextProblems[0]?._id || "");
      setDeleteFeedback({ error: "", success: "Problem deleted successfully." });
    } catch (error) {
      setDeleteFeedback({ error: getErrorMessage(error, "Unable to delete problem"), success: "" });
    } finally {
      setDeletePending(false);
    }
  };

  const handleUploadEditorialVideo = async () => {
    if (!selectedUpdateProblemId) {
      setVideoActionError("Select a problem to manage video first.");
      return;
    }

    if (!videoFile) {
      setVideoActionError("Please choose a video file first.");
      return;
    }

    setVideoActionLoading(true);
    setVideoActionError("");
    setVideoActionSuccess("");

    try {
      const signatureRes = await axiosClient.post("/video/upload-signature", { problemId: selectedUpdateProblemId });
      const signatureData = signatureRes.data;

      const formData = new FormData();
      formData.append("file", videoFile);
      formData.append("signature", signatureData.signature);
      formData.append("timestamp", String(signatureData.timestamp));
      formData.append("public_id", signatureData.public_id);
      formData.append("api_key", signatureData.api_key);

      const cloudinaryRes = await fetch(signatureData.upload_url, {
        method: "POST",
        body: formData,
      });
      const cloudinaryData = await cloudinaryRes.json();
      if (!cloudinaryRes.ok) {
        throw new Error(cloudinaryData?.error?.message || "Cloudinary upload failed");
      }

      await axiosClient.post("/video/save", {
        problemId: selectedUpdateProblemId,
        cloudinaryPublicId: cloudinaryData.public_id,
        secureUrl: cloudinaryData.secure_url,
        duration: cloudinaryData.duration,
      });

      setVideoActionSuccess("Editorial video uploaded successfully.");
      setVideoFile(null);
      setVideoInputKey((prev) => prev + 1);
      await loadEditorialVideo(selectedUpdateProblemId);
    } catch (error) {
      setVideoActionError(getErrorMessage(error, "Unable to upload editorial video"));
    } finally {
      setVideoActionLoading(false);
    }
  };

  const handleDeleteEditorialVideo = async () => {
    if (!selectedUpdateProblemId || !editorialVideo) {
      return;
    }

    const confirmed = window.confirm("Delete editorial video for this problem?");
    if (!confirmed) {
      return;
    }

    setVideoActionLoading(true);
    setVideoActionError("");
    setVideoActionSuccess("");

    try {
      await axiosClient.delete(`/video/problem/${selectedUpdateProblemId}`);
      setEditorialVideo(null);
      setVideoActionSuccess("Editorial video deleted successfully.");
    } catch (error) {
      setVideoActionError(getErrorMessage(error, "Unable to delete editorial video"));
    } finally {
      setVideoActionLoading(false);
    }
  };

  const selectedDeleteProblem = problems.find((problem) => problem._id === selectedDeleteProblemId);

  return (
    <div className="relative min-h-screen overflow-hidden bg-base-200">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-secondary/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="rounded-4xl border border-base-300/70 bg-base-100/90 p-6 shadow-xl shadow-base-content/5 backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <span className="badge badge-primary badge-outline mb-4">Admin Control Panel</span>
              <h1 className="text-4xl font-black tracking-tight text-base-content">Manage coding problems from one workspace</h1>
              <p className="mt-3 text-sm leading-7 text-base-content/70">
                Choose an operation card to create a new problem, update an existing one, or delete a problem from the catalogue.
              </p>
            </div>

            <div className="stats stats-vertical border border-base-300/70 bg-base-100 shadow-sm sm:stats-horizontal">
              <div className="stat px-5 py-4">
                <div className="stat-title">Problems</div>
                <div className="stat-value text-primary">{problems.length}</div>
              </div>
              <div className="stat px-5 py-4">
                <div className="stat-title">Active mode</div>
                <div className="stat-value text-secondary capitalize">{activeAction}</div>
              </div>
            </div>
          </div>

          {catalogueError ? <div className="alert alert-error mt-6 rounded-2xl">{catalogueError}</div> : null}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {operationCards.map((card) => (
            <OperationCard
              key={card.value}
              eyebrow={card.eyebrow}
              title={card.title}
              description={card.description}
              isActive={activeAction === card.value}
              onClick={() => setActiveAction(card.value)}
            />
          ))}
        </div>

        <div className="mt-6 space-y-6">
          {activeAction === "create" ? (
            <ProblemEditorForm
              mode="create"
              form={createForm}
              onSubmit={handleCreate}
              submitLabel="Create Problem"
              submitError={createFeedback.error}
              submitSuccess={createFeedback.success}
              headerTitle="Create a new problem"
              headerDescription="Build the statement, datasets, starter templates, and reference answers in one place."
            />
          ) : null}

          {activeAction === "update" ? (
            <>
              <ProblemList
                title="Choose a problem to update"
                description="Select a problem from the catalogue to load its full editable payload."
                problems={problems}
                selectedId={selectedUpdateProblemId}
                loading={catalogueLoading}
                emptyMessage="No problems are available yet. Create a problem first before using the update workflow."
                onSelect={setSelectedUpdateProblemId}
              />

              {updateProblemLoading ? (
                <div className="flex min-h-56 items-center justify-center rounded-4xl border border-base-300/70 bg-base-100/90 shadow-sm shadow-base-content/5">
                  <span className="loading loading-spinner loading-lg text-primary" />
                </div>
              ) : null}

              {!updateProblemLoading && updateFormReady ? (
                <>
                  <ProblemEditorForm
                    mode="update"
                    form={updateForm}
                    onSubmit={handleUpdate}
                    submitLabel="Update Problem"
                    submitError={updateFeedback.error}
                    submitSuccess={updateFeedback.success}
                    headerTitle="Update problem details"
                    headerDescription="The full problem payload is loaded for editing, including hidden cases and reference solutions."
                    secondaryAction={
                      <button
                        type="button"
                        className="btn btn-outline h-14 rounded-full px-8"
                        onClick={() => loadProblemForUpdate(selectedUpdateProblemId)}
                      >
                        Reset to saved data
                      </button>
                    }
                  />

                  <SectionCard
                    title="Editorial video management"
                    description="Upload or delete the official solution video linked to this problem."
                  >
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
                      <div>
                        {editorialLoading ? (
                          <div className="flex min-h-64 items-center justify-center rounded-3xl bg-base-200/70">
                            <span className="loading loading-spinner loading-lg text-primary" />
                          </div>
                        ) : editorialVideo ? (
                          <div className="space-y-4 rounded-3xl border border-base-300/70 bg-base-100 p-4">
                            <video
                              className="max-h-96 w-full rounded-2xl bg-black"
                              controls
                              poster={editorialVideo.thumbnailUrl || undefined}
                              src={editorialVideo.secureUrl}
                            />
                            <div className="flex flex-wrap gap-2 text-xs text-base-content/60">
                              <span className="badge badge-outline">Duration: {formatDuration(editorialVideo.duration)}</span>
                              <span className="badge badge-outline">Updated: {formatDate(editorialVideo.updatedAt)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-3xl border border-dashed border-base-300 bg-base-200/50 p-6 text-sm text-base-content/65">
                            No editorial video uploaded for this problem yet.
                          </div>
                        )}
                      </div>

                      <div className="rounded-3xl border border-base-300/70 bg-base-100 p-5">
                        <h3 className="text-lg font-semibold text-base-content">Video controls</h3>
                        <p className="mt-1 text-sm text-base-content/65">Choose a video file to upload, or delete the currently linked video.</p>

                        <div className="mt-4 space-y-3">
                          <input
                            key={videoInputKey}
                            type="file"
                            accept="video/*"
                            className="file-input file-input-bordered w-full"
                            onChange={(event) => setVideoFile(event.target.files?.[0] || null)}
                          />

                          <button
                            type="button"
                            className={`btn btn-primary w-full rounded-full ${videoActionLoading ? "loading" : ""}`}
                            onClick={handleUploadEditorialVideo}
                            disabled={videoActionLoading}
                          >
                            {!videoActionLoading && "Upload Video"}
                          </button>

                          <button
                            type="button"
                            className={`btn btn-outline btn-error w-full rounded-full ${videoActionLoading ? "loading" : ""}`}
                            onClick={handleDeleteEditorialVideo}
                            disabled={videoActionLoading || !editorialVideo}
                          >
                            {!videoActionLoading && "Delete Current Video"}
                          </button>
                        </div>

                        {videoActionError ? <div className="alert alert-error mt-4 rounded-2xl text-sm">{videoActionError}</div> : null}
                        {videoActionSuccess ? <div className="alert alert-success mt-4 rounded-2xl text-sm">{videoActionSuccess}</div> : null}
                      </div>
                    </div>
                  </SectionCard>
                </>
              ) : null}

              {!updateProblemLoading && !updateFormReady && problems.length > 0 ? (
                <div className="rounded-4xl border border-dashed border-base-300 bg-base-100/70 p-8 text-center text-sm text-base-content/65">
                  Select one problem card above to begin editing.
                </div>
              ) : null}
            </>
          ) : null}

          {activeAction === "delete" ? (
            <>
              <ProblemList
                title="Choose a problem to delete"
                description="Selecting a problem prepares the delete confirmation panel below."
                problems={problems}
                selectedId={selectedDeleteProblemId}
                loading={catalogueLoading}
                emptyMessage="No problems are available to delete."
                onSelect={setSelectedDeleteProblemId}
              />

              <SectionCard
                title="Delete confirmation"
                description="Review the selected problem before removing it from the catalogue."
              >
                {selectedDeleteProblem ? (
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                    <div className="rounded-3xl bg-base-200/70 p-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-bold text-base-content">{selectedDeleteProblem.title}</h3>
                        <span className="badge badge-outline">{selectedDeleteProblem.difficulty}</span>
                        <span className="badge badge-outline">{selectedDeleteProblem.tags}</span>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-base-content/70">{selectedDeleteProblem.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2 text-sm text-base-content/60">
                        <span className="badge badge-outline">{selectedDeleteProblem.visibalTestCases?.length || 0} visible cases</span>
                        <span className="badge badge-outline">ID: {selectedDeleteProblem._id}</span>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-error/20 bg-error/5 p-5">
                      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-error">Danger zone</div>
                      <p className="mt-3 text-sm leading-6 text-base-content/70">
                        Deleting this problem removes it from the catalogue immediately. This cannot be undone.
                      </p>
                      <button
                        type="button"
                        className={`btn btn-error mt-6 h-12 w-full rounded-full ${deletePending ? "loading" : ""}`}
                        onClick={handleDelete}
                        disabled={deletePending}
                      >
                        {deletePending ? "Deleting" : "Delete Problem"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-base-300 bg-base-200/50 p-5 text-sm text-base-content/65">
                    Select one problem card above to enable deletion.
                  </div>
                )}

                {deleteFeedback.error ? <div className="alert alert-error mt-5 rounded-2xl">{deleteFeedback.error}</div> : null}
                {deleteFeedback.success ? <div className="alert alert-success mt-5 rounded-2xl">{deleteFeedback.success}</div> : null}
              </SectionCard>
            </>
          ) : null}

          {activeAction === "create_mission" ? (
            <div className="rounded-4xl border border-base-300/60 bg-base-100/80 p-3 shadow-2xl shadow-base-content/5 backdrop-blur md:p-4">
              <div className="rounded-3xl bg-base-100 p-4 md:p-6">
                <div className="mb-6 flex flex-col gap-4 rounded-4xl bg-linear-to-r from-base-200 via-base-100 to-base-200 p-5 md:flex-row md:items-end md:justify-between md:p-6">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                       <span className="badge badge-secondary">New Mission Workflow</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-base-content md:text-3xl">Create a New Mission</h2>
                    <p className="mt-2 text-sm leading-6 text-base-content/65">Bundle existing problems into an overarching goal to reward users with points upon completion.</p>
                  </div>
                </div>

                <form onSubmit={missionForm.handleSubmit(handleCreateMission)} className="space-y-6">
                   <SectionCard title="Mission Details" description="Provide basic information about the mission.">
                     <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
                        <div className="space-y-4">
                           <FormField label="Title" error={missionForm.formState.errors.title?.message}>
                              <input placeholder="e.g., Master Dynamic Programming" className="input input-bordered h-12 w-full rounded-2xl bg-base-100 px-4" {...missionForm.register("title")} />
                           </FormField>
                           <FormField label="Description" error={missionForm.formState.errors.description?.message}>
                              <textarea placeholder="Solve these 5 problems to earn the DP Master badge..." className="textarea textarea-bordered min-h-24 w-full rounded-2xl bg-base-100 px-4 py-3" {...missionForm.register("description")} />
                           </FormField>
                        </div>
                        <div className="space-y-4">
                           <FormField label="Points Reward" error={missionForm.formState.errors.points?.message}>
                              <input type="number" className="input input-bordered h-12 w-full rounded-2xl bg-base-100 px-4" {...missionForm.register("points")} />
                           </FormField>
                        </div>
                     </div>
                   </SectionCard>
                   
                   <SectionCard title="Contained Problems" description="Select the problems that must be solved to complete this mission. Hold Ctrl (or Cmd) to select multiple.">
                     <FormField label="Problems" error={missionForm.formState.errors.problems?.message}>
                        {catalogueLoading ? (
                          <div className="flex h-48 items-center justify-center rounded-2xl bg-base-200"><span className="loading loading-spinner text-primary"></span></div>
                        ) : problems.length === 0 ? (
                          <div className="alert alert-warning rounded-2xl">No problems available. Please create some problems first.</div>
                        ) : (
                          <select multiple className="select select-bordered h-64 w-full rounded-2xl bg-base-100 p-4 font-mono text-sm leading-6" {...missionForm.register("problems")}>
                             {problems.map((p) => (
                               <option key={p._id} value={p._id} className="p-2 mb-1 rounded hover:bg-base-200">{p.title} ({p.difficulty})</option>
                             ))}
                          </select>
                        )}
                     </FormField>
                   </SectionCard>

                   <div className="sticky bottom-4 z-10 rounded-[1.75rem] border border-base-300/70 bg-base-100/95 p-4 shadow-xl shadow-base-content/10 backdrop-blur">
                     <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                       <div className="space-y-3">
                         {createMissionFeedback.error && <div className="alert alert-error rounded-2xl text-sm">{createMissionFeedback.error}</div>}
                         {createMissionFeedback.success && <div className="alert alert-success rounded-2xl text-sm">{createMissionFeedback.success}</div>}
                       </div>
                       <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
                         <button className={`btn btn-secondary h-14 min-w-full rounded-full px-8 text-base lg:min-w-56 ${missionForm.formState.isSubmitting ? "loading" : ""}`} type="submit" disabled={missionForm.formState.isSubmitting}>
                           {missionForm.formState.isSubmitting ? "Creating..." : "Create Mission"}
                         </button>
                       </div>
                     </div>
                   </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
