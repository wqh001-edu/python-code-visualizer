
import React, { useState, useEffect, useCallback } from 'react';
import CodeEditor from './components/Editor';
import Visualizer from './components/Visualizer';
import Terminal from './components/Terminal';
import HistorySidebar, { HistoryItem } from './components/HistorySidebar';
import { ExecutionTrace, TraceFrame } from './types';
import { TRACER_WRAPPER_PYTHON } from './services/pythonTracer';

const INITIAL_CODE = `def fibonacci(n):
    a, b = 0, 1
    count = 0
    while count < n:
        print(a)
        a, b = b, a + b
        count += 1

fibonacci(6)
`;

const App: React.FC = () => {
  const [code, setCode] = useState(INITIAL_CODE);
  const [pyodide, setPyodide] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trace, setTrace] = useState<ExecutionTrace | null>(null);
  const [stepIndex, setStepIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [inputBuffer, setInputBuffer] = useState<string[]>([]);
  const [isInputRequired, setIsInputRequired] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('pyvisualizer_history');
    if (saved) { try { setHistory(JSON.parse(saved)); } catch (e) {} }
  }, []);

  useEffect(() => {
    localStorage.setItem('pyvisualizer_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const initPyodide = async () => {
      try {
        if (typeof (window as any).loadPyodide === 'function') {
          const py = await (window as any).loadPyodide();
          await py.loadPackage(['micropip']);
          setPyodide(py);
          setIsLoading(false);
        }
      } catch (err: any) {
        setError(`Init Error: ${err?.message}`);
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
      const result = await pyodide.runPythonAsync(`run_with_trace('''${escapedCode}''', '${inputJson}')`);
      const parsed = JSON.parse(result);
      
      if (parsed.status === 'input_required') {
        setIsInputRequired(true);
        setTrace({ steps: parsed.steps });
        setStepIndex(parsed.steps.length - 1);
      } else if (parsed.status === 'error') {
        setError(parsed.error);
        addToHistory(code, 'error');
      } else {
        setTrace({ steps: parsed.steps });
        setStepIndex(0);
        addToHistory(code, 'success');
      }
    } catch (err: any) {
      setError(err?.message || "Execution error");
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
    setHistory(prev => [newItem, ...prev].slice(0, 50));
  };

  const stepForward = () => {
    if (trace && stepIndex < trace.steps.length - 1) setStepIndex(prev => prev + 1);
  };

  const stepBackward = () => {
    if (trace && stepIndex > 0) setStepIndex(prev => prev - 1);
  };

  const stepIteration = () => {
    if (!trace) return;
    const current = trace.steps[stepIndex];
    if (!current?.loopMeta) {
      stepForward();
      return;
    }
    // Find next step with same loop ID and isLoopHeader: true
    const nextIterIdx = trace.steps.findIndex((s, i) => 
      i > stepIndex && 
      s.loopMeta?.id === current.loopMeta?.id && 
      s.loopMeta?.isLoopHeader
    );
    if (nextIterIdx !== -1) setStepIndex(nextIterIdx);
    else setStepIndex(trace.steps.length - 1); // Go to end if no more iterations
  };

  const jumpToEnd = () => {
    if (!trace) return;
    const current = trace.steps[stepIndex];
    if (!current?.loopMeta) {
      setStepIndex(trace.steps.length - 1);
      return;
    }
    // Find the last step that belongs to this specific loop instance
    let lastIdx = stepIndex;
    for (let i = stepIndex; i < trace.steps.length; i++) {
      if (trace.steps[i].loopMeta?.id === current.loopMeta?.id) lastIdx = i;
      else if (trace.steps[i].funcName !== current.funcName) break;
    }
    setStepIndex(Math.min(lastIdx + 1, trace.steps.length - 1));
  };

  const reset = () => {
    setTrace(null);
    setStepIndex(-1);
    setError(null);
    setInputBuffer([]);
    setIsInputRequired(false);
  };

  const currentStep = (trace && stepIndex >= 0) ? trace.steps[stepIndex] : null;

  // Compute loop range for editor highlighting
  const getLoopRange = () => {
    if (!currentStep?.loopMeta || !trace) return null;
    // Heuristic: body starts at loop header line, ends at the highest line number seen in this loop
    const loopId = currentStep.loopMeta.id;
    const sameLoopSteps = trace.steps.filter(s => s.loopMeta?.id === loopId);
    const start = Math.min(...sameLoopSteps.map(s => s.line));
    const end = Math.max(...sameLoopSteps.map(s => s.line));
    return { start, end };
  };

  return (
    <div className="flex flex-col h-screen w-screen text-slate-200 bg-slate-950">
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">Py</div>
          <h1 className="text-xl font-semibold tracking-tight">PyVisualizer <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/30 ml-2">SMART LOOPS</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsHistoryOpen(true)} className="p-2 text-slate-400 hover:text-white rounded-md"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
          <button onClick={() => handleRun()} disabled={isExecuting} className="px-6 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md font-bold text-sm shadow-lg">{isExecuting ? 'Tracing...' : 'Run Code'}</button>
          {trace && <button onClick={reset} className="px-4 py-1.5 bg-slate-800 rounded-md text-sm border border-slate-700">Clear</button>}
        </div>
      </header>

      <HistorySidebar isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} history={history} onSelect={(i) => { setCode(i.code); setIsHistoryOpen(false); reset(); }} onDelete={(id) => setHistory(h => h.filter(x => x.id !== id))} onClear={() => setHistory([])} />

      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        <div className="w-[45%] flex flex-col gap-4">
          <div className="flex-1 rounded-xl overflow-hidden border border-slate-800 bg-[#0f172a] shadow-2xl">
             <CodeEditor code={code} onChange={(val) => setCode(val || '')} currentLine={currentStep?.line} loopRange={getLoopRange()} />
          </div>
          
          <div className="h-28 bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col gap-3 shadow-lg">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setStepIndex(0)} disabled={!trace || stepIndex <= 0} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 disabled:opacity-10"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg></button>
                  <button onClick={stepBackward} disabled={!trace || stepIndex <= 0} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-md text-[10px] font-black border border-slate-700 disabled:opacity-30">PREV</button>
                  <button onClick={stepForward} disabled={!trace || stepIndex >= (trace?.steps.length || 0) - 1} className="px-4 py-1 bg-blue-600 hover:bg-blue-500 rounded-md text-[10px] font-black disabled:opacity-30">STEP</button>
                  
                  {/* New Loop Controls */}
                  <button 
                    onClick={stepIteration} 
                    disabled={!trace || !currentStep?.loopMeta || stepIndex >= (trace?.steps.length || 0) - 1} 
                    className="px-3 py-1 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 border border-yellow-500/30 rounded-md text-[10px] font-black disabled:opacity-10"
                    title="Jump to next iteration"
                  >
                    NEXT ITER
                  </button>
                  <button 
                    onClick={jumpToEnd} 
                    disabled={!trace || stepIndex >= (trace?.steps.length || 0) - 1} 
                    className="px-3 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-500/30 rounded-md text-[10px] font-black disabled:opacity-10"
                    title="Jump to loop end"
                  >
                    JUMP OUT
                  </button>
                </div>
                <div className="text-[10px] font-black text-slate-500 tracking-tighter">PROGRESS {stepIndex + 1}/{trace?.steps.length || 0}</div>
             </div>
             <input type="range" min="-1" max={(trace?.steps.length || 1) - 1} value={stepIndex} onChange={(e) => setStepIndex(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex-[2] min-h-0">
             {currentStep ? <Visualizer frame={currentStep} fullTrace={trace?.steps} /> : (
               <div className="w-full h-full rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/30 flex flex-col items-center justify-center text-slate-500 gap-4">
                  <p className="text-sm font-bold opacity-40">READY TO VISUALIZE</p>
               </div>
             )}
          </div>
          <div className="h-40 shrink-0">
            <Terminal output={currentStep?.stdout || ''} isInputRequired={isInputRequired} onInputSubmit={(v) => handleRun([...inputBuffer, v])} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
