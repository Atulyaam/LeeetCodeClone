import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import axiosClient from "../utils/axiosClient";

const languageOptions = [
  { value: "c++", label: "C++" },
  { value: "java", label: "Java" },
  { value: "javascript", label: "JavaScript" },
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

const defaultValues = {
  title: "",
  description: "",
  difficulty: "easy",
  tags: "array",
  visibalTestCases: [{ input: "", output: "", explanation: "" }],
  hiddenTestCases: [{ input: "", output: "" }],
  startCode: languageOptions.map((lang) => ({ language: lang.value, intialCode: "" })),
  referenceSolution: languageOptions.map((lang) => ({ language: lang.value, code: "" })),
};

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

export default function AdminPanel() {
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(problemSchema),
    defaultValues,
  });

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

  const onSubmit = async (formData) => {
    setSubmitError("");
    setSubmitSuccess("");

    try {
      await axiosClient.post("/problem/create", formData);
      setSubmitSuccess("Problem created successfully.");
      reset(defaultValues);
    } catch (error) {
      const message =
        typeof error?.response?.data === "string"
          ? error.response.data
          : error?.response?.data?.message || "Unable to create problem";
      setSubmitError(message);
    }
  };

  const watchedVisibleCases = useWatch({ control, name: "visibalTestCases" }) || [];
  const watchedHiddenCases = useWatch({ control, name: "hiddenTestCases" }) || [];
  const watchedStarterCode = useWatch({ control, name: "startCode" }) || [];
  const watchedReferenceCode = useWatch({ control, name: "referenceSolution" }) || [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-base-200">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-secondary/15 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 md:px-6 md:py-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-6 xl:h-fit">
          <div className="rounded-4xl border border-base-300/70 bg-base-100/90 p-6 shadow-xl shadow-base-content/5 backdrop-blur">
            <span className="badge badge-primary badge-outline mb-4">Admin Workspace</span>
            <h1 className="text-3xl font-black tracking-tight text-base-content">Create a polished coding problem</h1>
            <p className="mt-3 text-sm leading-6 text-base-content/70">
              Use this panel to define the statement, datasets, starter templates, and reference solutions in one pass.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl bg-base-200/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">Visible cases</div>
                <div className="mt-1 text-3xl font-bold text-base-content">{watchedVisibleCases?.length || 0}</div>
              </div>
              <div className="rounded-2xl bg-base-200/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">Hidden cases</div>
                <div className="mt-1 text-3xl font-bold text-base-content">{watchedHiddenCases?.length || 0}</div>
              </div>
              <div className="rounded-2xl bg-base-200/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">Starter snippets</div>
                <div className="mt-1 text-3xl font-bold text-base-content">{watchedStarterCode?.length || 0}</div>
              </div>
              <div className="rounded-2xl bg-base-200/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">Reference solutions</div>
                <div className="mt-1 text-3xl font-bold text-base-content">{watchedReferenceCode?.length || 0}</div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-base-300/70 bg-base-100 p-4">
              <h2 className="text-sm font-semibold text-base-content">Publishing checklist</h2>
              <div className="mt-3 space-y-3 text-sm text-base-content/70">
                <p>Write a clear description with constraints and expected behavior.</p>
                <p>Add visible test cases that help users reason about the problem.</p>
                <p>Keep starter code and reference answers aligned for all languages.</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="rounded-4xl border border-base-300/60 bg-base-100/75 p-3 shadow-2xl shadow-base-content/5 backdrop-blur md:p-4">
          <div className="rounded-3xl bg-base-100 p-4 md:p-6">
            <div className="mb-6 flex flex-col gap-4 rounded-4xl bg-linear-to-r from-base-200 via-base-100 to-base-200 p-5 md:flex-row md:items-end md:justify-between md:p-6">
              <div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="badge badge-neutral">Problem Builder</span>
                  <span className="badge badge-outline">Three languages supported</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-base-content md:text-3xl">Problem setup</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-base-content/65">
                  Complete each section carefully so the problem is ready for both practice and evaluation.
                </p>
              </div>
              <div className="stats stats-vertical border border-base-300/70 bg-base-100 shadow-sm sm:stats-horizontal">
                <div className="stat px-5 py-4">
                  <div className="stat-title">Languages</div>
                  <div className="stat-value text-primary">3</div>
                </div>
                <div className="stat px-5 py-4">
                  <div className="stat-title">Total test cases</div>
                  <div className="stat-value text-secondary">{(watchedVisibleCases?.length || 0) + (watchedHiddenCases?.length || 0)}</div>
                </div>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <SectionCard
                title="Problem basics"
                description="Define the problem title, difficulty, primary tag, and a description that helps users understand the task quickly."
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
                      Pick a primary tag that matches the dominant technique used to solve the problem.
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Visible test cases"
                description="These examples are shown to the user. Keep them readable and representative."
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
                description="These are used for evaluation only. Include edge cases, limits, and tricky transitions."
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
                description="Provide a clean function signature or class skeleton for each supported language."
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
                description="Store the accepted implementation for each language so judging and editorial support stay aligned."
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
                      <input
                        type="hidden"
                        {...register(`referenceSolution.${index}.language`)}
                        defaultValue={lang.value}
                      />
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

                  <button
                    className={`btn btn-primary h-14 min-w-full rounded-full px-8 text-base lg:min-w-56 ${isSubmitting ? "loading" : ""}`}
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creating" : "Create Problem"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
