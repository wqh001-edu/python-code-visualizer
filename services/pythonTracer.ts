
/**
 * Advanced Python Tracer for PythonTutor-style visualization.
 * It recursively builds a heap of non-primitive objects.
 */
export const TRACER_WRAPPER_PYTHON = `
import sys
import json
import io
import traceback
import types

class TraceLogger:
    def __init__(self):
        self.trace_data = []
        self.stdout_capture = io.StringIO()
        self.max_steps = 300
        self.heap = {}
        
    def is_primitive(self, val):
        return isinstance(val, (int, float, str, bool, type(None)))

    def get_object_info(self, val):
        obj_id = str(id(val))
        if obj_id in self.heap:
            return obj_id
            
        t_name = type(val).__name__
        
        # Avoid recursion or massive objects
        if len(self.heap) > 100:
            return obj_id

        if isinstance(val, (list, tuple)):
            # Store list as indices or refIds
            elements = []
            self.heap[obj_id] = {"id": obj_id, "type": t_name, "value": elements}
            for item in val:
                if self.is_primitive(item):
                    elements.append({"isRef": False, "val": item})
                else:
                    ref = self.get_object_info(item)
                    elements.append({"isRef": True, "val": ref})
        elif isinstance(val, dict):
            items = {}
            self.heap[obj_id] = {"id": obj_id, "type": t_name, "value": items}
            for k, v in val.items():
                k_str = str(k)
                if self.is_primitive(v):
                    items[k_str] = {"isRef": False, "val": v}
                else:
                    ref = self.get_object_info(v)
                    items[k_str] = {"isRef": True, "val": ref}
        else:
            # Fallback for other objects
            self.heap[obj_id] = {"id": obj_id, "type": t_name, "value": str(val)}
            
        return obj_id

    def capture_frame(self, frame, event, arg):
        if frame.f_code.co_filename != '<string>':
            return
        if len(self.trace_data) >= self.max_steps:
            return

        # Clear heap per step to avoid cross-step contamination 
        # (Simplified approach: capture full state per step)
        self.heap = {}

        def process_variables(var_dict):
            processed = {}
            for k, v in var_dict.items():
                if k.startswith('__'): continue
                t_name = type(v).__name__
                if self.is_primitive(v):
                    processed[k] = {
                        "name": k,
                        "value": str(v) if v is not None else "None",
                        "type": t_name,
                        "isReference": False
                    }
                else:
                    ref_id = self.get_object_info(v)
                    processed[k] = {
                        "name": k,
                        "value": t_name,
                        "type": t_name,
                        "isReference": True,
                        "refId": ref_id
                    }
            return processed

        # Build stack trace
        stack = []
        curr = frame
        while curr and curr.f_code.co_filename == '<string>':
            stack.append(curr.f_code.co_name)
            curr = curr.f_back

        step = {
            "line": frame.f_lineno,
            "event": event,
            "funcName": frame.f_code.co_name,
            "locals": process_variables(frame.f_locals),
            "globals": process_variables(frame.f_globals),
            "heap": self.heap.copy(),
            "stack": stack[::-1],
            "stdout": self.stdout_capture.getvalue()
        }
        
        if event == 'exception':
            step['exception'] = str(arg[1])

        self.trace_data.append(step)

    def trace_dispatch(self, frame, event, arg):
        self.capture_frame(frame, event, arg)
        return self.trace_dispatch

def run_with_trace(code):
    logger = TraceLogger()
    original_stdout = sys.stdout
    sys.stdout = logger.stdout_capture
    
    try:
        exec_globals = {}
        sys.settrace(logger.trace_dispatch)
        exec(code, exec_globals)
    except Exception as e:
        # Final capture on failure
        pass
    finally:
        sys.settrace(None)
        sys.stdout = original_stdout
        
    return json.dumps({"steps": logger.trace_data})
`;
