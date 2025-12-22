
import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  currentLine?: number;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, currentLine }) => {
  const editorRef = React.useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Customizing theme colors for a darker look
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
    if (editorRef.current && currentLine) {
      const editor = editorRef.current;
      // We could add decorations for the current line
      const decorations = editor.deltaDecorations([], [
        {
          range: new (window as any).monaco.Range(currentLine, 1, currentLine, 1),
          options: {
            isWholeLine: true,
            className: 'bg-blue-900/40',
            glyphMarginClassName: 'bg-blue-500 rounded-full',
          }
        }
      ]);
      return () => editor.deltaDecorations(decorations, []);
    }
  }, [currentLine]);

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
        }}
      />
    </div>
  );
};

export default CodeEditor;
