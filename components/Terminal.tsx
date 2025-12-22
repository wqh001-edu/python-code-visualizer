
import React from 'react';

interface TerminalProps {
  output: string;
}

const Terminal: React.FC<TerminalProps> = ({ output }) => {
  return (
    <div className="h-full w-full bg-black text-green-400 p-4 font-mono text-sm overflow-y-auto border border-slate-800 rounded-lg shadow-lg">
      <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-1">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="text-slate-500 ml-2 text-xs uppercase tracking-widest">Program Output</span>
      </div>
      <pre className="whitespace-pre-wrap">{output || 'No output yet...'}</pre>
    </div>
  );
};

export default Terminal;
