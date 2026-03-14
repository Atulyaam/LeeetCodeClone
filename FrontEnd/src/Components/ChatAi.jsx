const quickPrompts = [
  "Give me a hint",
  "Give full solution in current language",
  "Explain time and space complexity",
  "Help me find bug in my code",
  "Show step-by-step dry run",
];

export default function ChatAi({ aiMessages, aiInput, setAiInput, aiThinking, onAskAi }) {
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-base-content">Chat With AI</h2>
        <p className="text-sm text-base-content/70">
          Ask for hints, debugging, complexity, or dry run help for this problem.
        </p>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              className="btn btn-xs btn-outline rounded-full"
              onClick={() => onAskAi(prompt)}
              disabled={aiThinking}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl bg-base-200 p-3 space-y-3">
        {aiMessages.map((msg) => (
          <div key={msg.id} className={`chat ${msg.role === "user" ? "chat-end" : "chat-start"}`}>
            <div className={`chat-bubble whitespace-pre-wrap ${msg.role === "user" ? "chat-bubble-primary" : ""}`}>
              {msg.text}
            </div>
          </div>
        ))}

        {aiThinking && (
          <div className="chat chat-start">
            <div className="chat-bubble">
              <span className="loading loading-dots loading-sm" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2">
        <textarea
          className="textarea textarea-bordered w-full h-20"
          placeholder="Ask AI about this problem or your code..."
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onAskAi();
            }
          }}
        />
        <button
          className={`btn btn-primary h-20 min-w-24 ${aiThinking ? "loading" : ""}`}
          onClick={() => onAskAi()}
          disabled={aiThinking}
        >
          {!aiThinking && "Send"}
        </button>
      </div>
    </div>
  );
}