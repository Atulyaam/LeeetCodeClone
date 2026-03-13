import Editor from "@monaco-editor/react";

export default function CodeEditor({
	language = "javascript",
	value = "",
	onChange,
	height = "60vh",
}) {
	return (
		<div className="rounded-lg overflow-hidden border border-base-300">
			<Editor
				height={height}
				defaultLanguage={language}
				language={language}
				value={value}
				theme="vs-dark"
				onChange={(nextValue) => onChange?.(nextValue || "")}
				options={{
					minimap: { enabled: false },
					fontSize: 14,
					scrollBeyondLastLine: false,
					automaticLayout: true,
				}}
			/>
		</div>
	);
}
