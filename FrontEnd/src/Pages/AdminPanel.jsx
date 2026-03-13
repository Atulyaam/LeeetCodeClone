import { useFieldArray, useForm } from "react-hook-form";
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

  return (
    <div className="min-h-screen bg-base-200 p-4 md:p-8">
      <div className="max-w-5xl mx-auto card bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="text-2xl md:text-3xl font-semibold">Create Problem</h1>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Title</span>
                </label>
                <input className="input input-bordered" {...register("title")} />
                {errors.title && <span className="text-error text-sm mt-1">{errors.title.message}</span>}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Difficulty</span>
                </label>
                <select className="select select-bordered" {...register("difficulty")}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea className="textarea textarea-bordered min-h-32" {...register("description")} />
              {errors.description && <span className="text-error text-sm mt-1">{errors.description.message}</span>}
            </div>

            <div className="form-control max-w-xs">
              <label className="label">
                <span className="label-text">Tag</span>
              </label>
              <select className="select select-bordered" {...register("tags")}>
                <option value="array">Array</option>
                <option value="linkedList">Linked List</option>
                <option value="graph">Graph</option>
                <option value="dp">DP</option>
              </select>
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium">Visible Test Cases</h2>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => appendVisible({ input: "", output: "", explanation: "" })}
                >
                  Add Visible Case
                </button>
              </div>

              {visibleFields.map((field, index) => (
                <div key={field.id} className="grid gap-3 md:grid-cols-3 p-3 rounded-lg border border-base-300">
                  <input
                    className="input input-bordered"
                    placeholder="Input"
                    {...register(`visibalTestCases.${index}.input`)}
                  />
                  <input
                    className="input input-bordered"
                    placeholder="Output"
                    {...register(`visibalTestCases.${index}.output`)}
                  />
                  <div className="flex gap-2">
                    <input
                      className="input input-bordered w-full"
                      placeholder="Explanation"
                      {...register(`visibalTestCases.${index}.explanation`)}
                    />
                    <button
                      type="button"
                      className="btn btn-error btn-outline"
                      onClick={() => removeVisible(index)}
                      disabled={visibleFields.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium">Hidden Test Cases</h2>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => appendHidden({ input: "", output: "" })}
                >
                  Add Hidden Case
                </button>
              </div>

              {hiddenFields.map((field, index) => (
                <div key={field.id} className="grid gap-3 md:grid-cols-2 p-3 rounded-lg border border-base-300">
                  <input
                    className="input input-bordered"
                    placeholder="Input"
                    {...register(`hiddenTestCases.${index}.input`)}
                  />
                  <div className="flex gap-2">
                    <input
                      className="input input-bordered w-full"
                      placeholder="Output"
                      {...register(`hiddenTestCases.${index}.output`)}
                    />
                    <button
                      type="button"
                      className="btn btn-error btn-outline"
                      onClick={() => removeHidden(index)}
                      disabled={hiddenFields.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-medium">Starter Code</h2>
              {languageOptions.map((lang, index) => (
                <div key={lang.value} className="form-control">
                  <label className="label">
                    <span className="label-text">{lang.label}</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered min-h-32"
                    {...register(`startCode.${index}.intialCode`)}
                  />
                  <input type="hidden" {...register(`startCode.${index}.language`)} value={lang.value} />
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-medium">Reference Solutions</h2>
              {languageOptions.map((lang, index) => (
                <div key={lang.value} className="form-control">
                  <label className="label">
                    <span className="label-text">{lang.label}</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered min-h-32"
                    {...register(`referenceSolution.${index}.code`)}
                  />
                  <input
                    type="hidden"
                    {...register(`referenceSolution.${index}.language`)}
                    value={lang.value}
                  />
                </div>
              ))}
            </section>

            {(errors.visibalTestCases || errors.hiddenTestCases || errors.startCode || errors.referenceSolution) && (
              <div className="alert alert-error text-sm">
                Please fill all required test case and code fields correctly.
              </div>
            )}

            {submitError && <div className="alert alert-error">{submitError}</div>}
            {submitSuccess && <div className="alert alert-success">{submitSuccess}</div>}

            <button className={`btn btn-primary w-full ${isSubmitting ? "loading" : ""}`} type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating" : "Create Problem"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
