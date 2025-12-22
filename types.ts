
export interface TraceVariable {
  name: string;
  value: any;
  type: string;
  isReference: boolean;
  refId?: string;
}

export interface HeapObject {
  id: string;
  type: string;
  value: any; // Can be a primitive, a list of refIds, or a dict of refIds
}

export interface TraceFrame {
  line: number;
  event: 'line' | 'call' | 'return' | 'exception';
  funcName: string;
  locals: Record<string, TraceVariable>;
  globals: Record<string, TraceVariable>;
  heap: Record<string, HeapObject>; // Global heap state at this step
  stack: string[]; // List of function names currently in the call stack
  stdout: string;
  exception?: string;
}

export interface ExecutionTrace {
  steps: TraceFrame[];
}
