
import React, { useState, useEffect, useCallback, useRef } from 'react';
import CodeEditor from './components/Editor';
import Visualizer from './components/Visualizer';
import Terminal from './components/Terminal';
import HistorySidebar, { HistoryItem } from './components/HistorySidebar';
import { ExecutionTrace, TraceFrame } from './types';
import { TRACER_WRAPPER_PYTHON } from './services/pythonTracer';

// Initial Python code
const INITIAL_CODE = `name = input("Enter your name: ")
age = input("Enter your age: ")
print(f"Hello {name}, you are {age} years old!")

my_list = [name, int(age)]
print(f"List check: {my_list}")
`;

const App: React.FC = () => {
  const [code, setCode] = useState(INITIAL_CODE);
  const [pyodide, setPyodide] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trace, setTrace] = useState<ExecutionTrace | null>(null);
  const [stepIndex, setStepIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Interactive Input state
  const [inputBuffer, setInputBuffer] = useState<string[]>([]);
  const [isInputRequired, setIsInputRequired] = useState(false);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('pyvisualizer_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history");
      }
    }
  }, []);

  // Save history whenever it changes
  useEffect(() => {
    localStorage.setItem('pyvisualizer_history', JSON.stringify(history));
  }, [history]);

  // Initialize Pyodide on mount
  useEffect(() => {
    const initPyodide = async () => {
      try {
        if (typeof (window as any).loadPyodide === 'function') {
          const py = await (window as any).loadPyodide();
          await py.loadPackage(['micropip']);
          setPyodide(py);
          setIsLoading(false);
        } else {
          throw new Error("Pyodide script not loaded correctly.");
        }
      } catch (err: any) {
        console.error("Pyodide Init Error:", err);
        setError(`Failed to initialize Python runtime: ${err?.message || 'Unknown error'}`);
        setIsLoading(false);
      }
    };
    initPyodide();
  }, []);

  const handleRun = useCallback(async (currentInputBuffer: string[] = inputBuffer) => {
    if (!pyodide) return;
    setIsExecuting(true);
    setError(null);
    setIsInputRequired(false);

    try {
      await pyodide.runPythonAsync(TRACER_WRAPPER_PYTHON);
      
      const escapedCode = code.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
      const inputJson = JSON.stringify(currentInputBuffer);
      const traceResultJson = await pyodide.runPythonAsync(`run_with_trace('''${escapedCode}''', '${inputJson}')`);
      
      const parsed = JSON.parse(traceResultJson);
      
      if (parsed.status === 'input_required') {
        // We found an input() call but the buffer is empty
        setIsInputRequired(true);
        // Show what was generated so far
        setTrace({ steps: parsed.steps });
        setStepIndex(parsed.steps.length - 1);
      } else if (parsed.status === 'error') {
        setError(parsed.error);
        addToHistory(code, 'error');
      } else {
        // Success
        setTrace({ steps: parsed.steps });
        setStepIndex(0);
        addToHistory(code, 'success');
      }
    } catch (err: any) {
      console.error("Execution Error:", err);
      setError(err?.message || String(err) || "An error occurred during execution.");
      addToHistory(code, 'error');
    } finally {
      setIsExecuting(false);
    }
  }, [pyodide, code, inputBuffer]);

  const addToHistory = (codeContent: string, status: 'success' | 'error') => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      code: codeContent,
      timestamp: Date.now(),
      status
    };
    // Keep only last 50 items
    setHistory(prev => [newItem, ...prev].slice(0, 50));
  };

  const handleInputSubmit = (val: string) => {
    const newBuffer = [...inputBuffer, val];
    setInputBuffer(newBuffer);
    // Automatically re-run with the expanded buffer
    handleRun(newBuffer);
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all history?")) {
      setHistory([]);
    }
  };

  const selectHistoryItem = (item: HistoryItem) => {
    setCode(item.code);
    setIsHistoryOpen(false);
    reset();
  };

  const stepForward = () => {
    if (trace && stepIndex < trace.steps.length - 1) {
      setStepIndex(prev => prev + 1);
    }
  };

  const stepBackward = () => {
    if (trace && stepIndex > 0) {
      setStepIndex(prev => prev - 1);
    }
  };

  const reset = () => {
    setTrace(null);
    setStepIndex(-1);
    setError(null);
    setInputBuffer([]);
    setIsInputRequired(false);
  };

  const currentStep: TraceFrame | null = (trace && stepIndex >= 0) ? trace.steps[stepIndex] : null;

  return (
    <div className="flex flex-col h-screen w-screen text-slate-200 bg-slate-950">
      {/* Header */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">Py</div>
          <h1 className="text-xl font-semibold tracking-tight">PyVisualizer <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 ml-2 border border-slate-700">INTERACTIVE</span></h1>
        </div>
        
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm animate-pulse">
               <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
               Initializing WASM...
            </div>
          ) : (
            <>
              <button 
                onClick={() => setIsHistoryOpen(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors relative"
                title="View History"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {history.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </button>

              <button 
                onClick={() => handleRun()}
                disabled={isExecuting}
                className="px-6 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-md font-bold text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 active:scale-95"
              >
                {isExecuting ? 'Tracing...' : 'Run & Visualize'}
              </button>
              {trace && (
                <button 
                  onClick={reset}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md font-medium text-sm transition-all border border-slate-700"
                >
                  Clear
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* History Sidebar */}
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={selectHistoryItem}
        onDelete={deleteHistoryItem}
        onClear={clearHistory}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left: Editor */}
        <div className="w-[45%] flex flex-col gap-4">
          <div className="flex-1 rounded-xl overflow-hidden border border-slate-800 bg-[#0f172a] shadow-2xl">
             <CodeEditor 
                code={code} 
                onChange={(val) => setCode(val || '')} 
                currentLine={currentStep?.line}
             />
          </div>
          
          {/* Controls Area */}
          <div className="h-24 bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col gap-2 shadow-lg">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    disabled={!trace || stepIndex <= 0}
                    onClick={() => setStepIndex(0)}
                    title="Start"
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 disabled:opacity-20"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                  </button>
                  <button 
                    disabled={!trace || stepIndex <= 0}
                    onClick={stepBackward}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-md text-xs font-bold disabled:opacity-30 transition-all border border-slate-700"
                  >
                    Prev
                  </button>
                  <button 
                    disabled={!trace || stepIndex >= (trace?.steps.length || 0) - 1}
                    onClick={stepForward}
                    className="flex items-center gap-1 px-6 py-1 bg-blue-600 hover:bg-blue-500 rounded-md text-xs font-bold disabled:opacity-30 transition-all shadow-md shadow-blue-900/20"
                  >
                    Next Step
                  </button>
                  <button 
                    disabled={!trace || stepIndex >= (trace?.steps.length || 0) - 1}
                    onClick={() => setStepIndex(trace!.steps.length - 1)}
                    title="End"
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 disabled:opacity-20"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                  </button>
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Step {stepIndex + 1} of {trace?.steps.length || 0}
                </div>
             </div>
             
             <div className="flex items-center gap-4">
               <input 
                 type="range" 
                 min="-1" 
                 max={(trace?.steps.length || 1) - 1} 
                 value={stepIndex}
                 onChange={(e) => setStepIndex(parseInt(e.target.value))}
                 className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
               />
             </div>
          </div>
        </div>

        {/* Right: Visualization */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Top Section: Visualization Panel */}
          <div className="flex-[2] min-h-0">
             {currentStep ? (
               <Visualizer frame={currentStep} />
             ) : (
               <div className="w-full h-full rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center text-slate-500 gap-4 border-dashed">
                  <div className="p-4 bg-slate-900 rounded-full border border-slate-800 shadow-xl">
                    <svg className="w-12 h-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium tracking-wide">Write some code and click <span className="text-blue-500">Run</span></p>
               </div>
             )}
          </div>

          {/* Bottom Section: Output Terminal */}
          <div className="h-48 shrink-0">
            <Terminal 
              output={currentStep?.stdout || ''} 
              isInputRequired={isInputRequired}
              onInputSubmit={handleInputSubmit}
            />
          </div>
        </div>
      </main>

      {/* Status Bar */}
      <footer className="h-8 bg-slate-900 border-t border-slate-800 flex items-center px-4 text-[10px] font-bold justify-between text-slate-500">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></div>
             <span>{isLoading ? 'Booting...' : 'Ready'}</span>
           </div>
           <span>History: {history.length} items</span>
        </div>
        <div className="flex items-center gap-4">
           {error && <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30">Error: {error}</span>}
           <span className="text-slate-600">Pyodide WASM v0.26.1</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
