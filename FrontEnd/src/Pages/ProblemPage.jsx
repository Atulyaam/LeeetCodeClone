import { useState, useEffect } from "react";
import { useParams, NavLink } from "react-router-dom";
import axiosClient from "../utils/axiosClient";
import CodeEditor from "./CodeEditor";

const LANGUAGES = [
  { value: "javascript", label: "JavaScript", monaco: "javascript" },
  { value: "java",       label: "Java",       monaco: "java"       },
  { value: "c++",        label: "C++",        monaco: "cpp"        },
];

const diffBadge = (d) =>
  d === "easy" ? "badge-success" : d === "medium" ? "badge-warning" : d === "hard" ? "badge-error" : "badge-ghost";

export default function ProblemPage() {
  const { problemId } = useParams();

  const [problem,      setProblem]      = useState(null);
  const [pageLoading,  setPageLoading]  = useState(true);
  const [pageError,    setPageError]    = useState("");

  const [selectedLang, setSelectedLang] = useState("javascript");
  const [code,         setCode]         = useState("");

  const [running,      setRunning]      = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [runResult,    setRunResult]    = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [actionError,  setActionError]  = useState("");
  const [leftTab,      setLeftTab]      = useState("description");
  const [rightTab,     setRightTab]     = useState("code");
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

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

  useEffect(() => {
    if (leftTab !== "submissions") return;

    const fetchSubmissions = async () => {
      try {
        setSubmissionLoading(true);
        setSubmissionError("");
        const { data } = await axiosClient.get(`/problem/submittedProblem/${problemId}`);
        if (Array.isArray(data)) {
          setSubmissionHistory(data);
        } else {
          setSubmissionHistory([]);
        }
      } catch (err) {
        setSubmissionHistory([]);
        setSubmissionError(typeof err?.response?.data === "string" ? err.response.data : "Failed to load submissions");
      } finally {
        setSubmissionLoading(false);
      }
    };

    fetchSubmissions();
  }, [leftTab, problemId]);

  const monacoLang = LANGUAGES.find((l) => l.value === selectedLang)?.monaco ?? "javascript";

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
        <div className="space-y-4 text-sm text-base-content/80 leading-6">
          <h2 className="text-xl font-semibold text-base-content">Editorial</h2>
          <p>
            Start by identifying the core pattern for this problem and breaking the solution into smaller steps.
            Build a brute-force idea first, then optimize it based on constraints.
          </p>
          <p>
            Since editorial content is not yet provided by backend, this section is prepared for future integration.
            You can later store editorial data in the problem schema and render it here.
          </p>
        </div>
      );
    }

    if (leftTab === "solutions") {
      const starter = problem.startCode?.find((item) => item.language === selectedLang)?.intialCode || "No starter code available.";
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-base-content">Solutions</h2>
          <p className="text-sm text-base-content/70">
            Starter template for {selectedLang}.
          </p>
          <pre className="rounded-xl bg-base-200 p-4 text-xs overflow-x-auto whitespace-pre-wrap">
            {starter}
          </pre>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-base-content">Submissions</h2>

        {submissionLoading && <div className="text-sm text-base-content/70">Loading submissions...</div>}
        {submissionError && <div className="alert alert-error text-sm">{submissionError}</div>}
        {!submissionLoading && !submissionError && submissionHistory.length === 0 && (
          <div className="text-sm text-base-content/70">No submissions found for this problem.</div>
        )}

        <div className="space-y-2">
          {submissionHistory.map((item) => (
            <div key={item._id} className="rounded-xl border border-base-300 bg-base-200/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`badge ${item.status === "accepted" ? "badge-success" : "badge-error"}`}>
                  {item.status}
                </span>
                <span className="text-xs text-base-content/60">{item.language}</span>
              </div>
              <div className="mt-2 text-xs text-base-content/70">
                {item.testCasesPassed}/{item.testCasesTotal} testcases passed
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
            <CodeEditor
              language={monacoLang}
              value={code}
              onChange={setCode}
              height="100%"
            />
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
              {tc.explanation ? <div><span className="font-semibold">Explanation:</span> {tc.explanation}</div> : null}
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
              <span
                className={`text-base font-bold ${
                  submitResult.status === "accepted" ? "text-success" : "text-error"
                }`}
              >
                {submitResult.status === "accepted"
                  ? "Accepted"
                  : submitResult.status === "wrong"
                  ? "Wrong Answer"
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
              <pre className="mt-2 text-xs text-error/80 whitespace-pre-wrap">
                {submitResult.errorMessage}
              </pre>
            )}
          </div>
        )}

        {!actionError && !runResult && !submitResult && (
          <div className="text-sm text-base-content/70">Run or submit your code to see results here.</div>
        )}
      </div>
    );
  };

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

  return (
    <div className="h-screen flex flex-col bg-base-200 overflow-hidden">

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

      <div className="bg-base-100 border-b border-base-300 px-3 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="tabs tabs-boxed bg-base-200">
          <button className={`tab ${leftTab === "description" ? "tab-active" : ""}`} onClick={() => setLeftTab("description")}>Description</button>
          <button className={`tab ${leftTab === "editorial" ? "tab-active" : ""}`} onClick={() => setLeftTab("editorial")}>Editorial</button>
          <button className={`tab ${leftTab === "solutions" ? "tab-active" : ""}`} onClick={() => setLeftTab("solutions")}>Solutions</button>
          <button className={`tab ${leftTab === "submissions" ? "tab-active" : ""}`} onClick={() => setLeftTab("submissions")}>Submissions</button>
        </div>

        <div className="tabs tabs-boxed bg-base-200">
          <button className={`tab ${rightTab === "code" ? "tab-active" : ""}`} onClick={() => setRightTab("code")}>Code</button>
          <button className={`tab ${rightTab === "testcase" ? "tab-active" : ""}`} onClick={() => setRightTab("testcase")}>Testcase</button>
          <button className={`tab ${rightTab === "result" ? "tab-active" : ""}`} onClick={() => setRightTab("result")}>Result</button>
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