
import React, { useState } from 'react';
import { TraceFrame, TraceVariable, HeapObject } from '../types';

interface VisualizerProps {
  frame: TraceFrame;
}

const Visualizer: React.FC<VisualizerProps> = ({ frame }) => {
  const [hoveredRef, setHoveredRef] = useState<string | null>(null);

  const renderValue = (v: any, isRef: boolean, refId?: string) => {
    if (isRef && refId) {
      return (
        <span 
          onMouseEnter={() => setHoveredRef(refId)}
          onMouseLeave={() => setHoveredRef(null)}
          className={`px-2 py-0.5 rounded cursor-help font-bold text-xs transition-colors ${
            hoveredRef === refId ? 'bg-yellow-500 text-black shadow-lg scale-110' : 'bg-emerald-600 text-white'
          }`}
        >
          REF: {refId.slice(-4)}
        </span>
      );
    }
    return <span className="text-blue-300">{String(v)}</span>;
  };

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
              {Object.entries(obj.value).map(([k, v]: [string, any]) => (
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
      <div className="w-1/3 border-r border-slate-800 flex flex-col min-w-[200px]">
        <div className="bg-slate-900 px-3 py-2 border-b border-slate-800">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px]">Call Stack / Frames</h4>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-4 flex flex-col-reverse justify-start">
          {/* Global Frame */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 shadow-lg overflow-hidden">
            <div className="bg-indigo-950/50 px-3 py-1.5 border-b border-slate-700">
              <span className="text-xs font-bold text-indigo-400">Global Frame</span>
            </div>
            <div className="p-2 space-y-1">
              {/* Fix: Explicitly cast to [string, TraceVariable][] to resolve unknown type inference */}
              {(Object.entries(frame.globals) as [string, TraceVariable][]).map(([name, v]) => (
                <div key={name} className="flex justify-between items-center text-xs border-b border-slate-800/50 py-1 last:border-0">
                  <span className="font-mono text-slate-400">{name}</span>
                  <span className="font-mono">{renderValue(v.value, v.isReference, v.refId)}</span>
                </div>
              ))}
              {Object.keys(frame.globals).length === 0 && <div className="text-[10px] text-slate-600 italic">No global variables</div>}
            </div>
          </div>

          {/* Local Frames */}
          {frame.funcName !== '<module>' && (
            <div className="rounded-lg border-2 border-blue-600/50 bg-slate-900 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-blue-900/40 px-3 py-1.5 border-b border-blue-600/30 flex justify-between items-center">
                <span className="text-xs font-bold text-blue-300">{frame.funcName}()</span>
                <span className="text-[10px] bg-blue-600 px-1.5 rounded text-white font-bold">ACTIVE</span>
              </div>
              <div className="p-2 space-y-1">
                {/* Fix: Explicitly cast to [string, TraceVariable][] to resolve unknown type inference */}
                {(Object.entries(frame.locals) as [string, TraceVariable][]).map(([name, v]) => (
                  <div key={name} className="flex justify-between items-center text-xs border-b border-slate-800/50 py-1 last:border-0">
                    <span className="font-mono text-slate-400">{name}</span>
                    <span className="font-mono">{renderValue(v.value, v.isReference, v.refId)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Heap Panel */}
      <div className="flex-1 flex flex-col">
        <div className="bg-slate-900 px-3 py-2 border-b border-slate-800">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px]">Heap / Objects</h4>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
          <div className="flex flex-wrap gap-6 items-start">
            {/* Fix: Explicitly cast to HeapObject[] to resolve unknown type inference */}
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
