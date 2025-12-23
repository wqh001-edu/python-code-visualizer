
export interface TraceVariable {
  name: string;
  value: any;
  type: string;
  isReference: boolean;
  refId?: string;
  changed?: boolean; // For flash animation
}

export interface HeapObject {
  id: string;
  type: string;
  value: any;
}

export interface LoopMetadata {
  id: string;
  iteration: number;
  bodyStart: number;
  bodyEnd: number;
  isLoopHeader: boolean;
}

export interface TraceFrame {
  line: number;
  event: 'line' | 'call' | 'return' | 'exception';
  funcName: string;
  locals: Record<string, TraceVariable>;
  globals: Record<string, TraceVariable>;
  heap: Record<string, HeapObject>;
  stack: string[];
  stdout: string;
  exception?: string;
  loopMeta?: LoopMetadata;
}

export interface ExecutionTrace {
  steps: TraceFrame[];
}
