import { useState, useEffect, useCallback } from "react";
import { useParams, NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import axiosClient from "../utils/axiosClient";
import CodeEditor from "./CodeEditor";
import ChatAi from "../Components/ChatAi";

const LANGUAGES = [
  { value: "javascript", label: "JavaScript", monaco: "javascript" },
  { value: "java",       label: "Java",       monaco: "java"       },
  { value: "c++",        label: "C++",        monaco: "cpp"        },
];

const diffBadge = (d) =>
  d === "easy" ? "badge-success" : d === "medium" ? "badge-warning" : d === "hard" ? "badge-error" : "badge-ghost";

const statusConfig = {
  accepted: { label: "Accepted",     cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  wrong:    { label: "Wrong Answer", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  error:    { label: "Error",        cls: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  pending:  { label: "Pending",      cls: "bg-base-300 text-base-content/50 border-base-300" },
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

const fmtRuntime = (v) => (v && v > 0 ? `${Number(v).toFixed(3)}s` : "—");
const fmtMemory  = (v) => (v && v > 0 ? `${v} KB` : "—");
const fmtDuration = (seconds) => {
  if (!seconds || Number(seconds) <= 0) return "—";

  const total = Math.floor(Number(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const GEMINI_API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY ||
  import.meta.env.VITE_GEMINI_API ||
  "";

const GEMINI_MODELS =
  (import.meta.env.VITE_GEMINI_MODELS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) || [];

const DEFAULT_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
];

let discoveredGeminiModelsPromise = null;

const normalizeModelName = (name) => String(name || "").replace(/^models\//, "").trim();

const discoverGeminiModels = async (apiKey) => {
  if (discoveredGeminiModelsPromise) {
    return discoveredGeminiModelsPromise;
  }

  discoveredGeminiModelsPromise = (async () => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const json = await response.json();
      if (!response.ok) {
        return [];
      }

      const models = Array.isArray(json?.models) ? json.models : [];
      return models
        .filter((model) => (model?.supportedGenerationMethods || []).includes("generateContent"))
        .map((model) => normalizeModelName(model?.name))
        .filter(Boolean);
    } catch {
      return [];
    }
  })();

  return discoveredGeminiModelsPromise;
};

const buildFallbackAiReply = ({ question, problem, code, selectedLang }) => {
  const q = question.toLowerCase();
  const title = problem?.title || "this problem";
  const difficulty = problem?.difficulty || "unknown";
  const tag = problem?.tags || "general";
  const codeText = (code || "").trim();
  const codeLines = codeText ? codeText.split("\n").length : 0;

  if (q.includes("hint")) {
    return [
      `Hint for ${title}:`,
      `1. Focus on the ${tag} pattern first and define a clear state/transition before coding.`,
      `2. Build a simple brute-force approach, then reduce repeated work using precomputation or memoization.`,
      `3. Test on the visible examples, then try edge cases like empty input, single element, and max limits.`,
    ].join("\n");
  }

  if (q.includes("complexity") || q.includes("time") || q.includes("space")) {
    return [
      `For a ${difficulty} ${tag} problem, aim to explain complexity in two parts:`,
      `1. Time: count major loops/transitions and write Big-O for worst case.`,
      `2. Space: include auxiliary structures (stack/map/dp table), excluding input unless asked.`,
      `Share your current approach and I can estimate exact time/space for it.`,
    ].join("\n");
  }

  if (q.includes("bug") || q.includes("error") || q.includes("wrong") || q.includes("fix")) {
    if (!codeText) {
      return "Paste your current code and I will help you debug it step by step (edge cases, logic, and complexity).";
    }

    return [
      `I can help debug your ${selectedLang} solution (${codeLines} lines).`,
      `Use this checklist:`,
      `1. Verify base/edge cases (empty input, single item, boundaries).`,
      `2. Track loop/index updates and stop conditions to avoid off-by-one issues.`,
      `3. Compare actual vs expected output on one visible testcase line by line.`,
      `If you want, ask: "find likely bug" and I will guide you through a targeted review flow.`,
    ].join("\n");
  }

  if (q.includes("approach") || q.includes("solution") || q.includes("how")) {
    return [
      `A clean approach for ${title}:`,
      `1. Understand input/output and constraints from the statement and examples.`,
      `2. Draft brute-force logic and identify repeated computations.`,
      `3. Optimize using the primary ${tag} technique.`,
      `4. Validate with visible tests, then stress test edge cases.`,
      `Ask for a "dry run" if you want a worked walkthrough on a sample input.`,
    ].join("\n");
  }

  return [
    `I can help with hints, debugging, dry runs, and complexity for ${title}.`,
    `Try asking one of these:`,
    `- Give me a hint`,
    `- Explain time and space complexity`,
    `- Help me find bug in my code`,
    `- Show step-by-step dry run`,
  ].join("\n");
};

const trimText = (value, max = 4000) => {
  if (!value) return "";
  const text = String(value);
  return text.length > max ? `${text.slice(0, max)}\n...truncated...` : text;
};

const summarizeRunErrors = (runResult) => {
  if (!Array.isArray(runResult) || runResult.length === 0) return "";

  const failed = runResult
    .map((item, index) => {
      const statusId = item?.status_id;
      if (statusId === 3) return "";

      const msg = item?.stderr || item?.compile_output || item?.status?.description || "Unknown failure";
      return `Test ${index + 1}: ${trimText(msg, 500)}`;
    })
    .filter(Boolean);

  return failed.join("\n");
};

const extractLatestCodingError = ({ actionError, submitResult, runResult }) => {
  if (submitResult?.errorMessage) return submitResult.errorMessage;
  if (actionError) return actionError;

  const runError = summarizeRunErrors(runResult);
  if (runError) return runError;

  return "";
};

const generateWithGeminiModel = async ({ model, prompt, apiKey }) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  const json = await response.json();
  if (!response.ok) {
    const message = json?.error?.message || "Gemini request failed";
    const err = new Error(message);
    err.status = response.status;
    err.model = model;
    throw err;
  }

  const text =
    json?.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text)
      .filter(Boolean)
      .join("\n") || "No response generated.";

  return text;
};

const callGemini = async ({ question, problem, code, selectedLang, actionError, submitResult, runResult }) => {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing Gemini API key. Please set VITE_GEMINI_API_KEY in FrontEnd/.env");
  }

  const latestCodingError = extractLatestCodingError({ actionError, submitResult, runResult });
  const prompt = [
    "You are an expert coding interview assistant for a DSA platform.",
    "Use the provided problem context and current code to answer.",
    "If user asks for a complete solution, provide a correct full solution in the currently selected language.",
    "If there is an error in current code/run/submit result, explain that error clearly and suggest fixes.",
    "Keep answers concise but actionable.",
    "",
    `Problem Title: ${problem?.title || "N/A"}`,
    `Difficulty: ${problem?.difficulty || "N/A"}`,
    `Tag: ${problem?.tags || "N/A"}`,
    "Problem Statement:",
    trimText(problem?.description || "", 3200),
    "",
    "Visible Testcases:",
    trimText(
      (problem?.visibalTestCases || [])
        .map((tc, idx) => `Case ${idx + 1} -> Input: ${tc?.input} | Output: ${tc?.output}`)
        .join("\n"),
      1200
    ),
    "",
    `Current Language: ${selectedLang}`,
    "Current User Code:",
    trimText(code || "", 3000),
    "",
    "Latest Coding Error/Failure:",
    trimText(latestCodingError || "None", 2000),
    "",
    `User Question: ${question}`,
  ].join("\n");

  const configuredModels = (GEMINI_MODELS.length ? GEMINI_MODELS : DEFAULT_GEMINI_MODELS).map(normalizeModelName);
  const discoveredModels = await discoverGeminiModels(GEMINI_API_KEY);
  const preferredDiscovered = discoveredModels.filter((model) =>
    ["gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash", "gemma-3-4b-it"].includes(model)
  );
  const modelsToTry = [
    ...new Set([...configuredModels, ...preferredDiscovered, ...discoveredModels.slice(0, 12)]),
  ];
  let lastError;

  for (const model of modelsToTry) {
    try {
      return await generateWithGeminiModel({ model, prompt, apiKey: GEMINI_API_KEY });
    } catch (error) {
      lastError = error;
      const message = String(error?.message || "").toLowerCase();
      const shouldTryNextModel =
        error?.status === 429 ||
        message.includes("quota") ||
        message.includes("rate") ||
        message.includes("exceeded") ||
        message.includes("not found");

      if (!shouldTryNextModel) {
        break;
      }
    }
  }

  if (lastError) {
    const msg = String(lastError?.message || "Gemini request failed");
    if (msg.toLowerCase().includes("quota")) {
      throw new Error(
        "Gemini quota exceeded for this key/project. Update to a key/project with active Gemini quota or billing, then restart frontend."
      );
    }

    throw new Error(msg);
  }

  throw new Error("Gemini request failed");
};

export default function ProblemPage() {
  const { problemId } = useParams();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  const [problem,           setProblem]           = useState(null);
  const [pageLoading,       setPageLoading]       = useState(true);
  const [pageError,         setPageError]         = useState("");
  const [selectedLang,      setSelectedLang]      = useState("javascript");
  const [code,              setCode]              = useState("");
  const [running,           setRunning]           = useState(false);
  const [submitting,        setSubmitting]        = useState(false);
  const [runResult,         setRunResult]         = useState(null);
  const [submitResult,      setSubmitResult]      = useState(null);
  const [actionError,       setActionError]       = useState("");
  const [leftTab,           setLeftTab]           = useState("description");
  const [rightTab,          setRightTab]          = useState("code");
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionError,   setSubmissionError]   = useState("");
  const [viewCodeItem,      setViewCodeItem]      = useState(null);
  const [editorialVideo,    setEditorialVideo]    = useState(null);
  const [editorialLoading,  setEditorialLoading]  = useState(false);
  const [editorialError,    setEditorialError]    = useState("");
  const [videoFile,         setVideoFile]         = useState(null);
  const [videoUploading,    setVideoUploading]    = useState(false);
  const [videoActionError,  setVideoActionError]  = useState("");
  const [videoActionSuccess,setVideoActionSuccess]= useState("");
  const [aiMessages,        setAiMessages]        = useState([
    {
      id: "ai-welcome",
      role: "assistant",
      text: "Hi! I am your AI helper. Ask for hints, complexity, debugging help, or a dry run.",
    },
  ]);
  const [aiInput,           setAiInput]           = useState("");
  const [aiThinking,        setAiThinking]        = useState(false);

  // fetch problem on mount
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axiosClient.get(`/problem/problemById/${problemId}`);
        setProblem(data);
        const starter = data.startCode?.find((s) => s.language === "javascript");
        setCode(starter?.intialCode ?? "");
      } catch (err) {
        setPageError(
          typeof err?.response?.data === "string" ? err.response.data : "Failed to load problem"
        );
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, [problemId]);

  const handleLangChange = (lang) => {
    setSelectedLang(lang);
    const starter = problem?.startCode?.find((s) => s.language === lang);
    setCode(starter?.intialCode ?? "");
    setRunResult(null);
    setSubmitResult(null);
    setActionError("");
  };

  const handleRun = async () => {
    setRunning(true);
    setRunResult(null);
    setSubmitResult(null);
    setActionError("");
    try {
      const { data } = await axiosClient.post(`/submission/run/${problemId}`, { code, language: selectedLang });
      setRunResult(data);
      setRightTab("result");
    } catch (err) {
      setActionError(typeof err?.response?.data === "string" ? err.response.data : "Run failed");
      setRightTab("result");
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setRunResult(null);
    setSubmitResult(null);
    setActionError("");
    try {
      const { data } = await axiosClient.post(`/submission/submit/${problemId}`, { code, language: selectedLang });
      setSubmitResult(data);
      setRightTab("result");
    } catch (err) {
      setActionError(typeof err?.response?.data === "string" ? err.response.data : "Submission failed");
      setRightTab("result");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAskAi = async (questionOverride) => {
    const question = (questionOverride ?? aiInput).trim();
    if (!question || aiThinking) return;

    const userMessage = { id: `u-${Date.now()}`, role: "user", text: question };
    setAiMessages((prev) => [...prev, userMessage]);
    setAiInput("");
    setAiThinking(true);

    try {
      const reply = await callGemini({
        question,
        problem,
        code,
        selectedLang,
        actionError,
        submitResult,
        runResult,
      });
      const aiMessage = { id: `a-${Date.now()}`, role: "assistant", text: reply };
      setAiMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const fallback = buildFallbackAiReply({ question, problem, code, selectedLang });
      const message = [
        `Gemini unavailable: ${error?.message || "request failed"}`,
        "Using local fallback answer:",
        fallback,
      ].join("\n\n");
      const aiMessage = { id: `a-${Date.now()}`, role: "assistant", text: message };
      setAiMessages((prev) => [...prev, aiMessage]);
    } finally {
      setAiThinking(false);
    }
  };

  useEffect(() => {
    if (leftTab !== "submissions") return;
    const fetchSubmissions = async () => {
      try {
        setSubmissionLoading(true);
        setSubmissionError("");
        const { data } = await axiosClient.get(`/problem/submittedProblem/${problemId}`);
        setSubmissionHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        setSubmissionHistory([]);
        setSubmissionError(typeof err?.response?.data === "string" ? err.response.data : "Failed to load submissions");
      } finally {
        setSubmissionLoading(false);
      }
    };
    fetchSubmissions();
  }, [leftTab, problemId]);

  const fetchEditorialVideo = useCallback(async () => {
    try {
      setEditorialLoading(true);
      setEditorialError("");
      const { data } = await axiosClient.get(`/video/problem/${problemId}`);
      setEditorialVideo(data || null);
    } catch (error) {
      if (error?.response?.status === 404) {
        setEditorialVideo(null);
        return;
      }

      setEditorialVideo(null);
      setEditorialError(typeof error?.response?.data === "string" ? error.response.data : "Failed to load editorial video");
    } finally {
      setEditorialLoading(false);
    }
  }, [problemId]);

  useEffect(() => {
    if (leftTab !== "editorial") return;
    fetchEditorialVideo();
  }, [leftTab, problemId, fetchEditorialVideo]);

  const handleUploadEditorialVideo = async () => {
    if (!videoFile) {
      setVideoActionError("Please choose a video file first.");
      return;
    }

    try {
      setVideoUploading(true);
      setVideoActionError("");
      setVideoActionSuccess("");

      const signatureRes = await axiosClient.post("/video/upload-signature", { problemId });
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
        problemId,
        cloudinaryPublicId: cloudinaryData.public_id,
        secureUrl: cloudinaryData.secure_url,
        duration: cloudinaryData.duration,
      });

      setVideoActionSuccess("Editorial video uploaded successfully.");
      setVideoFile(null);
      await fetchEditorialVideo();
    } catch (error) {
      setVideoActionError(typeof error?.response?.data === "string" ? error.response.data : error?.message || "Upload failed");
    } finally {
      setVideoUploading(false);
    }
  };

  const handleDeleteEditorialVideo = async () => {
    if (!editorialVideo) return;

    const confirmed = window.confirm("Delete editorial video for this problem?");
    if (!confirmed) return;

    try {
      setVideoUploading(true);
      setVideoActionError("");
      setVideoActionSuccess("");

      await axiosClient.delete(`/video/problem/${problemId}`);
      setEditorialVideo(null);
      setVideoActionSuccess("Editorial video deleted successfully.");
    } catch (error) {
      setVideoActionError(typeof error?.response?.data === "string" ? error.response.data : "Delete failed");
    } finally {
      setVideoUploading(false);
    }
  };

  const monacoLang = LANGUAGES.find((l) => l.value === selectedLang)?.monaco ?? "javascript";

  // ─── LEFT PANEL ──────────────────────────────────────────────────────────────
  const renderLeftPanel = () => {
    if (leftTab === "description") {
      return (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-base-content">{problem.title}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`badge ${diffBadge(problem.difficulty)}`}>{problem.difficulty}</span>
              <span className="badge badge-outline">{problem.tags}</span>
            </div>
          </div>
          <p className="text-sm text-base-content/85 whitespace-pre-wrap leading-relaxed">
            {problem.description}
          </p>
          {problem.visibalTestCases?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-base-content border-b border-base-300 pb-2">Examples</h2>
              {problem.visibalTestCases.map((tc, i) => (
                <div key={i} className="rounded-xl bg-base-200 p-4 space-y-2 text-sm font-mono">
                  <div>
                    <span className="not-italic font-semibold text-base-content/60 font-sans">Input: </span>
                    {tc.input}
                  </div>
                  <div>
                    <span className="not-italic font-semibold text-base-content/60 font-sans">Output: </span>
                    {tc.output}
                  </div>
                  {tc.explanation && (
                    <div className="font-sans text-base-content/70">
                      <span className="font-semibold">Explanation: </span>
                      {tc.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (leftTab === "editorial") {
      return (
        <div className="space-y-5 text-sm text-base-content/80 leading-6">
          <div>
            <h2 className="text-xl font-semibold text-base-content">Editorial</h2>
            <p className="text-base-content/65 mt-1">Watch the official video walkthrough for this problem.</p>
          </div>

          {editorialLoading ? (
            <div className="flex items-center justify-center rounded-xl bg-base-200 min-h-56">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : editorialVideo ? (
            <div className="space-y-3">
              <div className="rounded-2xl bg-base-200 p-2">
                <video
                  className="w-full rounded-xl max-h-105 bg-black"
                  controls
                  poster={editorialVideo.thumbnailUrl || undefined}
                  src={editorialVideo.secureUrl}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
                <span className="badge badge-outline">Duration: {fmtDuration(editorialVideo.duration)}</span>
                <span className="badge badge-outline">Updated: {fmtDate(editorialVideo.updatedAt)}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-base-300 bg-base-200/60 p-4 text-base-content/70">
              No editorial video uploaded yet for this problem.
            </div>
          )}

          {editorialError ? <div className="alert alert-error rounded-xl">{editorialError}</div> : null}

          {isAdmin ? (
            <div className="rounded-2xl border border-base-300 bg-base-100 p-4 space-y-3">
              <h3 className="font-semibold text-base-content">Admin video controls</h3>
              <input
                type="file"
                accept="video/*"
                className="file-input file-input-bordered w-full"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`btn btn-primary btn-sm ${videoUploading ? "loading" : ""}`}
                  onClick={handleUploadEditorialVideo}
                  disabled={videoUploading}
                >
                  {!videoUploading && "Upload Video"}
                </button>
                {editorialVideo ? (
                  <button
                    type="button"
                    className={`btn btn-outline btn-error btn-sm ${videoUploading ? "loading" : ""}`}
                    onClick={handleDeleteEditorialVideo}
                    disabled={videoUploading}
                  >
                    {!videoUploading && "Delete Current Video"}
                  </button>
                ) : null}
              </div>
              {videoActionError ? <div className="alert alert-error rounded-xl">{videoActionError}</div> : null}
              {videoActionSuccess ? <div className="alert alert-success rounded-xl">{videoActionSuccess}</div> : null}
            </div>
          ) : null}
        </div>
      );
    }

    if (leftTab === "solutions") {
      const starter = problem.startCode?.find((item) => item.language === selectedLang)?.intialCode || "No starter code available.";
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-base-content">Solutions</h2>
          <p className="text-sm text-base-content/70">Starter template for {selectedLang}.</p>
          <pre className="rounded-xl bg-base-200 p-4 text-xs overflow-x-auto whitespace-pre-wrap">{starter}</pre>
        </div>
      );
    }

    if (leftTab === "ai") {
      return (
        <ChatAi
          aiMessages={aiMessages}
          aiInput={aiInput}
          setAiInput={setAiInput}
          aiThinking={aiThinking}
          onAskAi={handleAskAi}
        />
      );
    }

    

    // ── SUBMISSIONS TAB ──────────────────────────────────────────────────────
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-base-content">Submissions</h2>

        {/* Loading */}
        {submissionLoading && (
          <div className="flex items-center gap-3 py-10 justify-center text-base-content/50 text-sm">
            <span className="loading loading-spinner loading-sm" />
            Loading submissions…
          </div>
        )}

        {/* Error */}
        {!submissionLoading && submissionError && (
          <div className="alert alert-error text-sm rounded-xl">{submissionError}</div>
        )}

        {/* Empty state */}
        {!submissionLoading && !submissionError && submissionHistory.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-14 text-base-content/40">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6M4 6h16M4 10h16M4 14h10M4 18h7" />
            </svg>
            <p className="text-sm">No submissions yet for this problem.</p>
            <p className="text-xs opacity-70">Submit your code to see results here.</p>
          </div>
        )}

        {/* Submissions table */}
        {!submissionLoading && !submissionError && submissionHistory.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-base-300">
            <table className="table table-sm w-full text-sm">
              <thead>
                <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-wide">
                  <th className="pl-4">Status</th>
                  <th>Language</th>
                  <th>Runtime</th>
                  <th>Memory</th>
                  <th>Testcases</th>
                  <th>Submitted At</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {[...submissionHistory].reverse().map((item, idx) => {
                  const cfg = statusConfig[item.status] ?? statusConfig.pending;
                  return (
                    <tr
                      key={item._id ?? idx}
                      className="hover:bg-base-200/50 transition-colors border-t border-base-300/50"
                    >
                      {/* Status */}
                      <td className="pl-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === "accepted" ? "bg-emerald-400"
                              : item.status === "error"  ? "bg-orange-400"
                              : item.status === "pending"? "bg-base-content/30"
                              : "bg-red-400"
                            }`}
                          />
                          {cfg.label}
                        </span>
                      </td>
                      {/* Language */}
                      <td className="text-base-content/70 font-mono text-xs py-3">{item.language}</td>
                      {/* Runtime */}
                      <td className="text-base-content/70 py-3">{fmtRuntime(item.runtime)}</td>
                      {/* Memory */}
                      <td className="text-base-content/70 py-3">{fmtMemory(item.memory)}</td>
                      {/* Testcases */}
                      <td className="py-3">
                        <span className="text-base-content/70">
                          {item.testCasesPassed}
                          <span className="text-base-content/30"> / </span>
                          {item.testCasesTotal}
                        </span>
                      </td>
                      {/* Date */}
                      <td className="text-base-content/50 text-xs py-3 whitespace-nowrap">
                        {fmtDate(item.createdAt)}
                      </td>
                      {/* Action */}
                      <td className="text-center py-3">
                        <button
                          onClick={() => setViewCodeItem(item)}
                          className="btn btn-xs btn-ghost border border-base-300 hover:border-primary hover:text-primary gap-1 rounded-lg"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          View Code
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ─── RIGHT PANEL ─────────────────────────────────────────────────────────────
  const renderRightPanel = () => {
    if (rightTab === "code") {
      return (
        <>
          <div className="shrink-0 flex items-center gap-3 bg-base-100 rounded-2xl shadow px-4 py-2">
            <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Language</span>
            <div className="flex gap-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l.value}
                  onClick={() => handleLangChange(l.value)}
                  className={`btn btn-xs rounded-full ${selectedLang === l.value ? "btn-primary" : "btn-ghost"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0 rounded-2xl overflow-hidden shadow">
            <CodeEditor language={monacoLang} value={code} onChange={setCode} height="100%" />
          </div>
        </>
      );
    }

    if (rightTab === "testcase") {
      return (
        <div className="h-full overflow-y-auto rounded-2xl bg-base-100 shadow p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Visible Testcases</h3>
            <button
              className={`btn btn-sm btn-outline ${running ? "loading" : ""}`}
              onClick={handleRun}
              disabled={running || submitting}
            >
              {!running && "Run On Testcases"}
            </button>
          </div>
          {problem.visibalTestCases?.map((tc, idx) => (
            <div key={idx} className="rounded-xl border border-base-300 p-3 text-sm space-y-2">
              <div><span className="font-semibold">Input:</span> {tc.input}</div>
              <div><span className="font-semibold">Output:</span> {tc.output}</div>
              {tc.explanation && <div><span className="font-semibold">Explanation:</span> {tc.explanation}</div>}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="h-full overflow-y-auto rounded-2xl bg-base-100 shadow p-4 space-y-3">
        {actionError && (
          <div className="alert alert-error rounded-xl text-sm">{actionError}</div>
        )}

        {runResult && (
          <div className="space-y-2">
            <h3 className="font-semibold text-base-content text-sm">Run Results</h3>
            {Array.isArray(runResult)
              ? runResult.map((r, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-3 text-sm border ${
                      r.status_id === 3
                        ? "bg-success/10 border-success/30 text-success"
                        : "bg-error/10 border-error/30 text-error"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        Test {i + 1}: {r.status?.description ?? (r.status_id === 3 ? "Accepted" : "Failed")}
                      </span>
                      {r.time && <span className="text-xs opacity-60">{r.time}s</span>}
                    </div>
                    {r.stdout && <pre className="mt-1 text-xs opacity-75 whitespace-pre-wrap">{r.stdout}</pre>}
                    {(r.stderr || r.compile_output) && (
                      <pre className="mt-1 text-xs opacity-75 whitespace-pre-wrap">
                        {r.stderr || r.compile_output}
                      </pre>
                    )}
                  </div>
                ))
              : <pre className="text-xs text-base-content/70">{JSON.stringify(runResult, null, 2)}</pre>
            }
          </div>
        )}

        {submitResult && (
          <div
            className={`rounded-xl p-4 text-sm border ${
              submitResult.status === "accepted"
                ? "bg-success/10 border-success/30"
                : "bg-error/10 border-error/30"
            }`}
          >
            <div className="flex flex-wrap gap-4 items-center">
              <span className={`text-base font-bold ${submitResult.status === "accepted" ? "text-success" : "text-error"}`}>
                {submitResult.status === "accepted" ? "Accepted"
                  : submitResult.status === "wrong"  ? "Wrong Answer"
                  : "Error"}
              </span>
              <span className="text-base-content/60">
                {submitResult.testCasesPassed}/{submitResult.testCasesTotal} test cases passed
              </span>
              {submitResult.runtime > 0 && (
                <span className="text-xs text-base-content/50">{submitResult.runtime.toFixed(3)}s</span>
              )}
              {submitResult.memory > 0 && (
                <span className="text-xs text-base-content/50">{submitResult.memory} KB</span>
              )}
            </div>
            {submitResult.errorMessage && (
              <pre className="mt-2 text-xs text-error/80 whitespace-pre-wrap">{submitResult.errorMessage}</pre>
            )}
          </div>
        )}

        {!actionError && !runResult && !submitResult && (
          <div className="text-sm text-base-content/70">Run or submit your code to see results here.</div>
        )}
      </div>
    );
  };

  // ─── GUARDS ──────────────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }
  if (pageError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="alert alert-error max-w-md">{pageError}</div>
      </div>
    );
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-base-200 overflow-hidden">

      {/* ── View Code Modal ── */}
      {viewCodeItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setViewCodeItem(null)}
        >
          <div
            className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <div>
                  <p className="font-semibold text-base-content text-sm">Submitted Code</p>
                  <p className="text-xs text-base-content/50">
                    {viewCodeItem.language}&nbsp;·&nbsp;{fmtDate(viewCodeItem.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(() => {
                  const cfg = statusConfig[viewCodeItem.status] ?? statusConfig.pending;
                  return (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  );
                })()}
                <button onClick={() => setViewCodeItem(null)} className="btn btn-sm btn-ghost btn-circle">✕</button>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6 px-5 py-3 bg-base-200/60 border-b border-base-300 text-xs text-base-content/60">
              <span>⚡ Runtime: <strong className="text-base-content/80">{fmtRuntime(viewCodeItem.runtime)}</strong></span>
              <span>🧠 Memory: <strong className="text-base-content/80">{fmtMemory(viewCodeItem.memory)}</strong></span>
              <span>✅ Testcases: <strong className="text-base-content/80">{viewCodeItem.testCasesPassed} / {viewCodeItem.testCasesTotal}</strong></span>
            </div>

            {/* Code */}
            <div className="flex-1 overflow-y-auto p-5">
              <pre className="text-xs font-mono text-base-content/85 whitespace-pre-wrap leading-relaxed bg-base-200 rounded-xl p-4 overflow-x-auto">
                {viewCodeItem.code}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="navbar bg-base-100 shadow px-4 shrink-0 z-10">
        <div className="flex-1 gap-3 min-w-0">
          <NavLink to="/" className="btn btn-ghost text-xl shrink-0">DupliCode</NavLink>
          <span className="text-base-content/40 hidden sm:inline">/</span>
          <span className="font-semibold text-sm hidden sm:inline truncate">{problem.title}</span>
        </div>
        <div className="flex-none flex items-center gap-2">
          <span className={`badge ${diffBadge(problem.difficulty)}`}>{problem.difficulty}</span>
          <button
            className={`btn btn-ghost btn-sm rounded-full gap-1 ${running ? "loading" : ""}`}
            onClick={handleRun}
            disabled={running || submitting}
          >
            {!running && (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Run
              </>
            )}
          </button>
          <button
            className={`btn btn-primary btn-sm rounded-full ${submitting ? "loading" : ""}`}
            onClick={handleSubmit}
            disabled={running || submitting}
          >
            {!submitting && "Submit"}
          </button>
        </div>
      </nav>

      {/* Tab bar */}
      <div className="bg-base-100 border-b border-base-300 px-3 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="tabs tabs-boxed bg-base-200">
          <button className={`tab ${leftTab === "description" ? "tab-active" : ""}`} onClick={() => setLeftTab("description")}>Description</button>
          <button className={`tab ${leftTab === "editorial"   ? "tab-active" : ""}`} onClick={() => setLeftTab("editorial")}>Editorial</button>
          <button className={`tab ${leftTab === "solutions"   ? "tab-active" : ""}`} onClick={() => setLeftTab("solutions")}>Solutions</button>
          <button className={`tab ${leftTab === "ai"          ? "tab-active" : ""}`} onClick={() => setLeftTab("ai")}>AI Chat</button>
          <button className={`tab ${leftTab === "submissions" ? "tab-active" : ""}`} onClick={() => setLeftTab("submissions")}>Submissions</button>
        </div>
        <div className="tabs tabs-boxed bg-base-200">
          <button className={`tab ${rightTab === "code"     ? "tab-active" : ""}`} onClick={() => setRightTab("code")}>Code</button>
          <button className={`tab ${rightTab === "testcase" ? "tab-active" : ""}`} onClick={() => setRightTab("testcase")}>Testcase</button>
          <button className={`tab ${rightTab === "result"   ? "tab-active" : ""}`} onClick={() => setRightTab("result")}>Result</button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden gap-2 p-2 lg:p-3">
        {/* Left panel */}
        <div className="w-full lg:w-[42%] overflow-y-auto rounded-2xl bg-base-100 shadow p-5">
          {renderLeftPanel()}
        </div>
        {/* Right panel */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          {renderRightPanel()}
        </div>
      </div>
    </div>
  );
}