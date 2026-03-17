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
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-3">{problem.title}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full border ${
                problem.difficulty === 'easy' ? 'bg-success/10 text-success border-success/20' :
                problem.difficulty === 'medium' ? 'bg-warning/10 text-warning border-warning/20' :
                'bg-error/10 text-error border-error/20'
              }`}>{problem.difficulty}</span>
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-base-300 text-gray-300 border border-gray-700">
                {problem.tags}
              </span>
            </div>
          </div>
          
          <div className="prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed font-sans">
            <p className="whitespace-pre-wrap">{problem.description}</p>
          </div>
          
          {problem.visibalTestCases?.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-gray-800">
              <h2 className="text-base font-semibold text-white tracking-wide uppercase">Examples</h2>
              {problem.visibalTestCases.map((tc, i) => (
                <div key={i} className="rounded-xl bg-[#161b22] border border-gray-800 p-5 space-y-3 font-mono text-sm shadow-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-sans font-bold text-gray-500 uppercase tracking-wider">Input</span>
                    <span className="text-gray-300">{tc.input}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-sans font-bold text-gray-500 uppercase tracking-wider">Output</span>
                    <span className="text-white font-bold">{tc.output}</span>
                  </div>
                  {tc.explanation && (
                    <div className="flex flex-col gap-1 pt-2 border-t border-gray-800/50 mt-1">
                      <span className="text-xs font-sans font-bold text-gray-500 uppercase tracking-wider">Explanation</span>
                      <span className="text-gray-400 font-sans">{tc.explanation}</span>
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
        <div className="space-y-5 text-sm text-gray-300">
          <div>
            <h2 className="text-xl font-bold text-white">Editorial Video</h2>
            <p className="text-gray-500 mt-1">Watch the official walkthrough for this problem.</p>
          </div>

          {editorialLoading ? (
            <div className="flex items-center justify-center rounded-xl bg-[#161b22] border border-gray-800 min-h-[200px]">
              <span className="loading loading-spinner text-primary loading-md" />
            </div>
          ) : editorialVideo ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-black border border-gray-800 p-1 shadow-lg overflow-hidden">
                <video
                  className="w-full rounded-xl max-h-[400px]"
                  controls
                  poster={editorialVideo.thumbnailUrl || undefined}
                  src={editorialVideo.secureUrl}
                />
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="px-3 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700">Duration: {fmtDuration(editorialVideo.duration)}</span>
                <span className="px-3 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700">Updated: {fmtDate(editorialVideo.updatedAt)}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-700 bg-[#161b22] p-8 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              No editorial video available yet.
            </div>
          )}

          {editorialError && <div className="alert alert-error rounded-xl shadow-lg">{editorialError}</div>}

          {isAdmin && (
            <div className="rounded-2xl border border-gray-800 bg-[#161b22] p-5 space-y-4 mt-6">
              <h3 className="font-bold text-white flex items-center gap-2">
                 <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 Admin Controls
              </h3>
              <input
                type="file"
                accept="video/*"
                className="file-input file-input-bordered bg-[#0d1117] border-gray-700 w-full text-sm"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  className={`btn btn-primary btn-sm flex-1 ${videoUploading ? "loading" : ""}`}
                  onClick={handleUploadEditorialVideo}
                  disabled={videoUploading}
                >
                  {!videoUploading && "Upload New Video"}
                </button>
                {editorialVideo && (
                  <button
                    type="button"
                    className={`btn btn-outline btn-error btn-sm ${videoUploading ? "loading" : ""}`}
                    onClick={handleDeleteEditorialVideo}
                    disabled={videoUploading}
                  >
                    {!videoUploading && "Delete"}
                  </button>
                )}
              </div>
              {videoActionError && <div className="text-error text-xs">{videoActionError}</div>}
              {videoActionSuccess && <div className="text-success text-xs">{videoActionSuccess}</div>}
            </div>
          )}
        </div>
      );
    }

    if (leftTab === "solutions") {
      const starter = problem.startCode?.find((item) => item.language === selectedLang)?.intialCode || "No starter code available.";
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Starter Template</h2>
          <p className="text-sm text-gray-500">Code scaffold for {selectedLang}.</p>
          <pre className="rounded-xl bg-[#161b22] border border-gray-800 p-5 text-sm font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap shadow-inner">
             {starter}
          </pre>
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
        <h2 className="text-xl font-bold text-white border-b border-gray-800 pb-2">Your Submissions</h2>

        {submissionLoading && (
          <div className="flex items-center gap-3 py-10 justify-center text-gray-500 text-sm">
            <span className="loading loading-spinner loading-sm text-primary" />
            Fetching history...
          </div>
        )}

        {!submissionLoading && submissionError && (
          <div className="alert alert-error text-sm rounded-xl">{submissionError}</div>
        )}

        {!submissionLoading && !submissionError && submissionHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-gray-800 bg-[#161b22]/50 mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-3-3v6M4 6h16M4 10h16M4 14h10M4 18h7" />
            </svg>
            <h3 className="text-white font-semibold mb-1">No submissions yet</h3>
            <p className="text-sm text-gray-500">Run code and submit solutions to see your history here.</p>
          </div>
        )}

        {!submissionLoading && !submissionError && submissionHistory.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-800 shadow-sm mt-4">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-[#161b22] text-gray-500 border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Language</th>
                  <th className="px-4 py-3 font-semibold">Runtime</th>
                  <th className="px-4 py-3 font-semibold">Memory</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {[...submissionHistory].reverse().map((item, idx) => {
                  const cfg = statusConfig[item.status] ?? statusConfig.pending;
                  return (
                    <tr key={item._id ?? idx} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                           <span className={`inline-flex items-center gap-1.5 font-bold ${
                             item.status === 'accepted' ? 'text-success' : 'text-error'
                           }`}>
                             {cfg.label}
                           </span>
                           <span className="text-[10px] text-gray-600 font-medium mt-0.5">{fmtDate(item.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                         <span className="px-2 py-1 bg-gray-800 rounded-md text-xs font-mono text-gray-300">
                            {item.language}
                         </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                         {item.status === 'accepted' ? fmtRuntime(item.runtime) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                         {item.status === 'accepted' ? fmtMemory(item.memory) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setViewCodeItem(item)}
                          className="text-primary hover:text-white bg-primary/10 hover:bg-primary px-3 py-1.5 rounded-lg text-xs font-semibold transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          View
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
    // Note: The 'code' view has been relocated to top pane statically for modern IDE feel.
    if (rightTab === "testcase") {
      return (
        <div className="h-full space-y-4 p-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
               <svg className="w-4 h-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
               Visible Testcases
            </h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {problem.visibalTestCases?.map((tc, idx) => (
              <div key={idx} className="min-w-[280px] rounded-xl border border-gray-800 bg-[#161b22] px-4 py-3 text-sm flex flex-col gap-2 relative group overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 bg-gray-800 text-gray-400 px-2 py-0.5 rounded-bl-lg text-[10px] font-bold">CASE {idx + 1}</div>
                <div className="mt-2"><span className="text-xs font-bold text-gray-500 uppercase">Input:</span> <pre className="font-mono text-gray-300 text-xs mt-1 overflow-x-auto bg-[#0d1117] p-2 rounded">{tc.input}</pre></div>
                <div><span className="text-xs font-bold text-gray-500 uppercase">Output:</span> <pre className="font-mono text-white text-xs mt-1 overflow-x-auto bg-[#0d1117] p-2 rounded">{tc.output}</pre></div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="h-full space-y-4 p-4">
        <h3 className="text-sm font-bold text-white border-b border-gray-800 pb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
            Terminal Output
        </h3>

        {actionError && (
          <div className="alert alert-error rounded-xl text-sm shadow-sm">{actionError}</div>
        )}

        {runResult && (
          <div className="space-y-3">
            {Array.isArray(runResult)
              ? runResult.map((r, i) => {
                  const isAccepted = r.status_id === 3;
                  return (
                    <div
                      key={i}
                      className={`rounded-xl p-4 text-sm border shadow-sm ${
                        isAccepted
                          ? "bg-success/5 border-success/30 text-success"
                          : "bg-error/5 border-error/30 text-error"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-current/10">
                        <span className="font-bold tracking-wide">
                          Test Case {i + 1}: {r.status?.description ?? (isAccepted ? "Accepted" : "Failed")}
                        </span>
                        {r.time && <span className="text-xs font-mono bg-current/10 px-2 py-0.5 rounded-md">{r.time}s</span>}
                      </div>
                      
                      {r.stdout && (
                         <div className="mt-2 text-xs">
                           <span className="font-semibold text-gray-500 uppercase">Stdout:</span>
                           <pre className="font-mono text-gray-300 bg-[#06080a] p-2 mt-1 rounded overflow-x-auto border border-gray-800">{r.stdout}</pre>
                         </div>
                      )}
                      
                      {(r.stderr || r.compile_output) && (
                        <div className="mt-2 text-xs">
                           <span className="font-semibold text-error text-[10px] uppercase">Error Output:</span>
                           <pre className="font-mono text-error/80 bg-error/10 p-2 mt-1 rounded overflow-x-auto border border-error/20 whitespace-pre-wrap">
                             {r.stderr || r.compile_output}
                           </pre>
                        </div>
                      )}
                    </div>
                  );
                })
              : <pre className="text-xs text-gray-500 font-mono bg-[#161b22] border border-gray-800 p-4 rounded-xl shadow-sm">{JSON.stringify(runResult, null, 2)}</pre>
            }
          </div>
        )}

        {submitResult && (
          <div
            className={`rounded-xl p-5 text-sm border shadow-md relative overflow-hidden ${
              submitResult.status === "accepted"
                ? "bg-success/10 border-success/40"
                : "bg-error/10 border-error/40"
            }`}
          >
            {submitResult.status === "accepted" && <div className="absolute top-0 left-0 w-2 h-full bg-success"></div>}
            {submitResult.status !== "accepted" && <div className="absolute top-0 left-0 w-2 h-full bg-error"></div>}
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div>
                  <h3 className={`text-xl font-extrabold tracking-tight ${submitResult.status === "accepted" ? "text-success" : "text-error"}`}>
                    {submitResult.status === "accepted" ? "Accepted!"
                      : submitResult.status === "wrong"  ? "Wrong Answer"
                      : "Execution Error"}
                  </h3>
                  <p className="text-gray-400 font-medium mt-1">
                    <span className="text-white font-bold">{submitResult.testCasesPassed}</span> out of <span className="text-white font-bold">{submitResult.testCasesTotal}</span> testcases passed
                  </p>
               </div>
               
               <div className="flex gap-4">
                 {submitResult.runtime > 0 && (
                   <div className="flex flex-col bg-[#050505]/50 px-3 py-2 rounded-lg border border-gray-800">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Runtime</span>
                      <span className="text-white font-mono">{submitResult.runtime.toFixed(3)}s</span>
                   </div>
                 )}
                 {submitResult.memory > 0 && (
                   <div className="flex flex-col bg-[#050505]/50 px-3 py-2 rounded-lg border border-gray-800">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Memory</span>
                      <span className="text-white font-mono">{submitResult.memory} KB</span>
                   </div>
                 )}
               </div>
            </div>
            
            {submitResult.errorMessage && (
              <div className="mt-4 pt-4 border-t border-error/20">
                 <span className="text-[10px] uppercase font-bold tracking-wider text-error">Compiler Message</span>
                 <pre className="mt-2 p-3 bg-error/10 rounded-lg text-xs font-mono text-error/90 whitespace-pre-wrap border border-error/20">
                    {submitResult.errorMessage}
                 </pre>
              </div>
            )}
          </div>
        )}

        {!actionError && !runResult && !submitResult && (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-gray-800 bg-[#161b22]/50 mt-4">
             <svg className="w-10 h-10 text-gray-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             <p className="text-gray-400 font-medium text-sm">Run your code to view console output here.</p>
          </div>
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
    <div className="h-screen flex flex-col bg-[#0d1117] text-gray-300 overflow-hidden font-sans">
      {/* ── View Code Modal ── */}
      {viewCodeItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setViewCodeItem(null)}
        >
          <div
            className="glass-panel rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#161b22]">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <div>
                  <p className="font-semibold text-white text-sm">Submitted Code</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {viewCodeItem.language}&nbsp;·&nbsp;{fmtDate(viewCodeItem.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(() => {
                  const cfg = statusConfig[viewCodeItem.status] ?? statusConfig.pending;
                  return (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  );
                })()}
                <button onClick={() => setViewCodeItem(null)} className="btn btn-sm btn-ghost btn-circle text-gray-400 hover:text-white">✕</button>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-8 px-6 py-3 bg-[#0d1117] border-b border-gray-800 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Runtime: <strong className="text-white">{fmtRuntime(viewCodeItem.runtime)}</strong></span>
              <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg> Memory: <strong className="text-white">{fmtMemory(viewCodeItem.memory)}</strong></span>
              <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4V5a2 2 0 012-2h4a2 2 0 012 2v14a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4m-12 5H5a2 2 0 01-2-2V7a2 2 0 012-2h4" /></svg> Testcases: <strong className="text-white">{viewCodeItem.testCasesPassed} / {viewCodeItem.testCasesTotal}</strong></span>
            </div>

            {/* Code */}
            <div className="flex-1 overflow-y-auto p-0 bg-[#0d1117]">
              <pre className="text-sm font-mono text-gray-300 p-6 overflow-x-auto m-0">
                {viewCodeItem.code}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Modern Navbar */}
      <nav className="glass-panel border-b border-gray-800 flex items-center justify-between px-4 py-2 shrink-0 z-10 sticky top-0">
        <div className="flex items-center gap-4 min-w-0">
          <NavLink to="/" className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent hover:opacity-80 transition-opacity flex-shrink-0">DupliCode</NavLink>
          <div className="h-5 w-px bg-gray-700 hidden sm:block"></div>
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-semibold text-sm text-white truncate hidden sm:block">{problem.title}</span>
            <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
              problem.difficulty === 'easy' ? 'bg-success/10 text-success border-success/20' :
              problem.difficulty === 'medium' ? 'bg-warning/10 text-warning border-warning/20' :
              'bg-error/10 text-error border-error/20'
            }`}>{problem.difficulty}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className={`btn btn-sm bg-green-500 hover:bg-base-200 text-white border-gray-700 hover:border-gray-500 rounded-lg px-4 gap-2 transition-all ${running ? "loading" : ""}`}
            onClick={handleRun}
            disabled={running || submitting}
          >
            {!running && (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-success" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Run Code
              </>
            )}
          </button>
          <button
            className={`btn btn-sm btn-primary rounded-lg px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all ${submitting ? "loading" : ""}`}
            onClick={handleSubmit}
            disabled={running || submitting}
          >
            {!submitting && "Submit"}
          </button>
          
          <div className="h-6 w-px bg-gray-700 mx-1"></div>
          <div className="avatar placeholder cursor-pointer hover:opacity-80 transition-opacity">
            <div className="bg-primary/20 text-primary w-8 h-8 rounded-full border border-primary/30">
              <span className="text-xs font-bold">{user?.firstName?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Workspace Split Pane */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden p-2 gap-2 bg-[#050505]">
        
        {/* Left Panel - Description/Tabs */}
        <div className="w-full lg:w-[45%] flex flex-col glass-panel rounded-xl overflow-hidden border border-gray-800 shadow-sm">
          {/* Left Panel Tabs */}
          <div className="flex items-center gap-1 bg-[#161b22] px-2 py-1 border-b border-gray-800 overflow-x-auto no-scrollbar">
            {[{id: 'description', label: 'Description', icon: 'M4 6h16M4 12h16M4 18h7'},
              {id: 'editorial', label: 'Editorial', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'},
              {id: 'solutions', label: 'Solutions', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'},
              {id: 'submissions', label: 'Submissions', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'},
              {id: 'ai', label: 'AI Chat', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z'}
            ].map(tab => (
              <button 
                key={tab.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  leftTab === tab.id 
                    ? "bg-gray-800 text-white shadow-sm" 
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                }`} 
                onClick={() => setLeftTab(tab.id)}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Left Panel Content */}
          <div className="flex-1 overflow-y-auto p-5 bg-[#0d1117] custom-scrollbar">
            {renderLeftPanel()}
          </div>
        </div>

        {/* Right Panel - Editor/Terminal */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          
          {/* Editor Section */}
          <div className="flex-1 flex flex-col glass-panel rounded-xl overflow-hidden border border-gray-800 shadow-sm relative">
            <div className="flex justify-between items-center bg-[#161b22] px-4 py-1.5 border-b border-gray-800">
               <div className="flex items-center gap-2">
                 <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                 <span className="text-xs font-semibold text-gray-400">Code Editor</span>
               </div>
               
               <select 
                  className="select select-xs bg-[#0d1117] border-gray-700 text-gray-300 hover:border-gray-500 focus:border-primary rounded-lg pr-8"
                  value={selectedLang}
                  onChange={(e) => handleLangChange(e.target.value)}
                >
                  {LANGUAGES.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
               </select>
            </div>
            <div className="flex-1 overflow-hidden bg-[#0d1117]">
              <CodeEditor language={monacoLang} value={code} onChange={setCode} height="100%" />
            </div>
          </div>

          {/* Testcase/Result Terminal Section */}
          <div className="h-[30%] min-h-[200px] flex flex-col glass-panel rounded-xl overflow-hidden border border-gray-800 shadow-sm">
            <div className="flex items-center gap-1 bg-[#161b22] px-2 py-1 border-b border-gray-800">
               {[{id: 'testcase', label: 'Testcases', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'},
                 {id: 'result', label: 'Test Result', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z'}
               ].map(tab => (
                 <button 
                  key={tab.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors ${
                    rightTab === tab.id 
                      ? "text-primary bg-primary/10" 
                      : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                  }`} 
                  onClick={() => setRightTab(tab.id)}
                 >
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
                   {tab.label}
                 </button>
               ))}
            </div>
            <div className="flex-1 overflow-y-auto p-0 bg-[#0d1117] custom-scrollbar">
              {renderRightPanel()}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}