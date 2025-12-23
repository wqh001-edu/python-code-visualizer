
import React, { useState, useEffect } from 'react';
import { TraceFrame, TraceVariable, HeapObject } from '../types';

interface VisualizerProps {
  frame: TraceFrame;
  fullTrace?: TraceFrame[];
}

const Visualizer: React.FC<VisualizerProps> = ({ frame, fullTrace = [] }) => {
  const [hoveredRef, setHoveredRef] = useState<string | null>(null);

  const renderValue = (v: any, isRef: boolean, refId?: string, changed?: boolean) => {
    if (isRef && refId) {
      return (
        <span 
          onMouseEnter={() => setHoveredRef(refId)}
          onMouseLeave={() => setHoveredRef(null)}
          className={`px-2 py-0.5 rounded cursor-help font-bold text-xs transition-all ${
            hoveredRef === refId ? 'bg-yellow-500 text-black shadow-lg scale-110' : 'bg-emerald-600 text-white'
          } ${changed ? 'animate-[pulse_1s_ease-in-out]' : ''}`}
        >
          REF: {refId.slice(-4)}
        </span>
      );
    }
    return (
      <span className={`transition-colors duration-500 px-1 rounded ${changed ? 'bg-yellow-500/40 text-yellow-200' : 'text-blue-300'}`}>
        {String(v)}
      </span>
    );
  };

  // Find all iterations of the current loop if we are in one
  const getIterations = () => {
    if (!frame.loopMeta) return [];
    return fullTrace.filter(f => 
      f.loopMeta?.id === frame.loopMeta?.id && 
      f.loopMeta?.isLoopHeader &&
      f.funcName === frame.funcName
    );
  };

  const iterations = getIterations();

  const renderHeapObject = (obj: HeapObject) => {
    const isHovered = hoveredRef === obj.id;
    return (
      <div 
        key={obj.id} 
        className={`min-w-[120px] rounded-lg border-2 transition-all ${
          isHovered ? 'border-yellow-400 bg-slate-800 scale-105 z-10' : 'border-emerald-800 bg-slate-900'
        } shadow-lg`}
      >
        <div className="bg-emerald-900/50 px-2 py-1 border-b border-emerald-800 flex justify-between items-center">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">{obj.type}</span>
          <span className="text-[10px] text-slate-500">ID: {obj.id.slice(-4)}</span>
        </div>
        <div className="p-2 overflow-hidden">
          {Array.isArray(obj.value) ? (
            <div className="flex gap-1 overflow-x-auto pb-1">
              {obj.value.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="text-[9px] text-slate-500 mb-0.5">{idx}</div>
                  <div className="border border-emerald-700/50 bg-slate-950 px-2 py-1 rounded min-w-[30px] text-center text-sm">
                    {renderValue(item.val, item.isRef, item.isRef ? item.val : undefined)}
                  </div>
                </div>
              ))}
            </div>
          ) : typeof obj.value === 'object' ? (
            <div className="space-y-1">
              {(Object.entries(obj.value) as [string, any][]).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center text-xs gap-3">
                  <span className="text-slate-400">{k}:</span>
                  <div className="bg-slate-950 px-1.5 py-0.5 rounded border border-emerald-700/30">
                    {renderValue(v.val, v.isRef, v.isRef ? v.val : undefined)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm font-mono text-center py-2 text-emerald-100">{String(obj.value)}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex bg-slate-950/50 rounded-lg overflow-hidden border border-slate-800">
      {/* Frames Panel */}
      <div className="w-1/3 border-r border-slate-800 flex flex-col min-w-[220px]">
        <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 flex justify-between items-center">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px]">Frames</h4>
          {frame.loopMeta && (
            <div className="flex items-center gap-1.5 animate-bounce">
               <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
               <span className="text-[10px] font-bold text-yellow-500">LOOPING</span>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-4 flex flex-col-reverse justify-start">
          <div className="rounded-lg border border-slate-700 bg-slate-900 shadow-lg overflow-hidden">
            <div className="bg-indigo-950/50 px-3 py-1.5 border-b border-slate-700">
              <span className="text-xs font-bold text-indigo-400">Global Frame</span>
            </div>
            <div className="p-2 space-y-1">
              {(Object.entries(frame.globals) as [string, TraceVariable][]).map(([name, v]) => (
                <div key={name} className="flex justify-between items-center text-xs border-b border-slate-800/50 py-1 last:border-0">
                  <span className="font-mono text-slate-400">{name}</span>
                  <span className="font-mono">{renderValue(v.value, v.isReference, v.refId, v.changed)}</span>
                </div>
              ))}
            </div>
          </div>

          {frame.funcName !== '<module>' && (
            <div className={`rounded-lg border-2 bg-slate-900 shadow-lg overflow-hidden transition-all duration-300 ${frame.loopMeta ? 'border-yellow-600/50' : 'border-blue-600/50'}`}>
              <div className={`px-3 py-1.5 border-b flex justify-between items-center ${frame.loopMeta ? 'bg-yellow-900/30 border-yellow-600/20' : 'bg-blue-900/40 border-blue-600/30'}`}>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${frame.loopMeta ? 'text-yellow-400' : 'text-blue-300'}`}>{frame.funcName}()</span>
                  {frame.loopMeta && <span className="text-[8px] font-black uppercase text-yellow-600">Iteration #{frame.loopMeta.iteration}</span>}
                </div>
                <span className={`text-[9px] px-1.5 rounded font-bold text-white ${frame.loopMeta ? 'bg-yellow-600' : 'bg-blue-600'}`}>ACTIVE</span>
              </div>
              <div className="p-2 space-y-1">
                {(Object.entries(frame.locals) as [string, TraceVariable][]).map(([name, v]) => (
                  <div key={name} className="flex justify-between items-center text-xs border-b border-slate-800/50 py-1 last:border-0">
                    <span className="font-mono text-slate-400">{name}</span>
                    <span className="font-mono">{renderValue(v.value, v.isReference, v.refId, v.changed)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Iteration History Panel */}
        {iterations.length > 1 && (
          <div className="h-24 bg-slate-900/80 border-t border-slate-800 p-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <h5 className="text-[8px] font-black text-slate-500 uppercase mb-2 tracking-widest px-1">Iteration Timeline</h5>
            <div className="flex gap-2">
              {iterations.map((it, idx) => (
                <div 
                  key={idx} 
                  className={`inline-block min-w-[50px] p-1.5 rounded border text-center transition-all cursor-pointer ${
                    it.loopMeta?.iteration === frame.loopMeta?.iteration 
                      ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 scale-105 ring-2 ring-yellow-500/20' 
                      : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'
                  }`}
                >
                  <div className="text-[8px] font-bold"># {it.loopMeta?.iteration}</div>
                  {/* Fixed: Added explicit type cast to TraceVariable[] for Object.values(it.locals) */}
                  <div className="text-[9px] font-mono truncate">{(Object.values(it.locals) as TraceVariable[])[0]?.value || '...'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Heap Panel */}
      <div className="flex-1 flex flex-col">
        <div className="bg-slate-900 px-3 py-2 border-b border-slate-800">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px]">Heap / Objects</h4>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
          <div className="flex flex-wrap gap-6 items-start">
            {(Object.values(frame.heap) as HeapObject[]).map(obj => renderHeapObject(obj))}
            {Object.keys(frame.heap).length === 0 && (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-slate-600 italic text-sm">Heap is empty</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
