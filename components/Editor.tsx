
import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  currentLine?: number;
  loopRange?: { start: number; end: number } | null;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, currentLine, loopRange }) => {
  const editorRef = React.useRef<any>(null);
  const monacoRef = React.useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    monaco.editor.defineTheme('pyviz-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0f172a',
      }
    });
    monaco.editor.setTheme('pyviz-dark');
  };

  React.useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const newDecorations = [];

      // Current line highlight
      if (currentLine) {
        newDecorations.push({
          range: new monaco.Range(currentLine, 1, currentLine, 1),
          options: {
            isWholeLine: true,
            className: 'bg-blue-900/40',
            glyphMarginClassName: 'bg-blue-500 shadow-[0_0_10px_#3b82f6] rounded-full',
          }
        });
      }

      // Loop body highlight
      if (loopRange) {
        newDecorations.push({
          range: new monaco.Range(loopRange.start, 1, loopRange.end, 1),
          options: {
            isWholeLine: true,
            className: 'bg-yellow-500/10 border-l-2 border-yellow-500/30',
          }
        });
      }

      const decorations = editor.deltaDecorations([], newDecorations);
      return () => editor.deltaDecorations(decorations, []);
    }
  }, [currentLine, loopRange]);

  return (
    <div className="h-full w-full border-r border-slate-800">
      <Editor
        height="100%"
        defaultLanguage="python"
        value={code}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          glyphMargin: true,
          folding: true,
          lineDecorationsWidth: 10,
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;
