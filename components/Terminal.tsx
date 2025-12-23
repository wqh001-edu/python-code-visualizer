
import React, { useState, useEffect, useRef } from 'react';

interface TerminalProps {
  output: string;
  isInputRequired: boolean;
  onInputSubmit: (val: string) => void;
}

const Terminal: React.FC<TerminalProps> = ({ output, isInputRequired, onInputSubmit }) => {
  const [inputValue, setInputValue] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (isInputRequired) {
      inputRef.current?.focus();
    }
  }, [output, isInputRequired]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() || true) { // Allow empty inputs
      onInputSubmit(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="h-full w-full bg-black text-green-400 p-4 font-mono text-sm overflow-y-auto border border-slate-800 rounded-lg shadow-lg flex flex-col relative group">
      <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-1 shrink-0">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="text-slate-500 ml-2 text-xs uppercase tracking-widest flex-1">Program Output</span>
        {isInputRequired && (
          <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded animate-pulse font-bold">WAITING FOR INPUT</span>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <pre className="whitespace-pre-wrap">{output || 'No output yet...'}</pre>
        
        {isInputRequired && (
          <form onSubmit={handleSubmit} className="mt-2 flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
            <span className="text-blue-400 font-bold">❯</span>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="bg-transparent border-none outline-none flex-1 text-white caret-blue-500"
              placeholder="Type here..."
              autoFocus
            />
          </form>
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Visual background hint */}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none select-none text-4xl font-black">
        STDOUT
      </div>
    </div>
  );
};

export default Terminal;
