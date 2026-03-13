import Editor from "@monaco-editor/react";

export default function CodeEditor({
	language = "javascript",
	value = "",
	onChange,
	height = "60vh",
}) {
	return (
		<div className="h-full rounded-lg overflow-hidden border border-base-300 bg-neutral">
			<Editor
				height={height}
				defaultLanguage={language}
				language={language}
				value={value}
				theme="vs-dark"
				loading={<div className="h-full w-full flex items-center justify-center text-white/70">Loading editor...</div>}
				onChange={(nextValue) => onChange?.(nextValue || "")}
				options={{
					minimap: { enabled: false },
					fontSize: 14,
					scrollBeyondLastLine: false,
					automaticLayout: true,
					padding: { top: 12 },
				}}
			/>
		</div>
	);
}
