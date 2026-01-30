
/**
 * Advanced Python Tracer with Loop Detection.
 */
export const TRACER_WRAPPER_PYTHON = `
import sys
import json
import io
import traceback
import builtins

class TraceLogger:
    def __init__(self, input_buffer=None):
        self.trace_data = []
        self.stdout_capture = io.StringIO()
        self.max_steps = 500
        self.heap = {}
        self.input_buffer = input_buffer or []
        self.input_index = 0
        self.loop_stats = {} # (func_name, line) -> current_iteration
        self.last_lines = {} # stack_depth -> last_line
        
    def is_primitive(self, val):
        return isinstance(val, (int, float, str, bool, type(None)))

    def get_object_info(self, val):
        obj_id = str(id(val))
        if obj_id in self.heap:
            return obj_id
        t_name = type(val).__name__
        if len(self.heap) > 100:
            return obj_id

        if isinstance(val, (list, tuple)):
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
            self.heap[obj_id] = {"id": obj_id, "type": t_name, "value": str(val)}
        return obj_id

    def custom_input(self, prompt=""):
        if prompt: print(prompt, end="")
        if self.input_index < len(self.input_buffer):
            val = self.input_buffer[self.input_index]
            self.input_index += 1
            print(val) 
            return val
        else:
            raise EOFError("INTERACTIVE_INPUT_REQUIRED")

    def capture_frame(self, frame, event, arg):
        if frame.f_code.co_filename != '<string>':
            return
        if len(self.trace_data) >= self.max_steps:
            return

        self.heap = {}
        depth = 0
        curr_f = frame
        while curr_f:
            depth += 1
            curr_f = curr_f.f_back

        # Loop Detection Logic
        line = frame.f_lineno
        func = frame.f_code.co_name
        loop_meta = None
        
        last_line = self.last_lines.get(depth, 0)
        self.last_lines[depth] = line
        
        # If jumping back, it's a loop iteration
        key = (func, line)
        if line <= last_line and event == 'line':
            self.loop_stats[key] = self.loop_stats.get(key, 0) + 1
            loop_meta = {
                "id": f"loop_{line}",
                "iteration": self.loop_stats[key],
                "isLoopHeader": True
            }
        elif key in self.loop_stats:
            # Still in loop but not at header
            loop_meta = {
                "id": f"loop_{line}",
                "iteration": self.loop_stats[key],
                "isLoopHeader": False
            }

        def process_variables(var_dict, prev_vars=None):
            processed = {}
            for k, v in var_dict.items():
                if k.startswith('__'): continue
                t_name = type(v).__name__
                is_ref = not self.is_primitive(v)
                val_str = str(v) if not is_ref else t_name
                
                # Detect change for animation
                has_changed = False
                if prev_vars and k in prev_vars:
                    has_changed = prev_vars[k]["value"] != val_str

                processed[k] = {
                    "name": k,
                    "value": val_str,
                    "type": t_name,
                    "isReference": is_ref,
                    "refId": self.get_object_info(v) if is_ref else None,
                    "changed": has_changed
                }
            return processed

        prev_step = self.trace_data[-1] if self.trace_data else None
        prev_locals = prev_step["locals"] if prev_step else None

        stack = []
        curr = frame
        while curr and curr.f_code.co_filename == '<string>':
            stack.append(curr.f_code.co_name)
            curr = curr.f_back

        step = {
            "line": line,
            "event": event,
            "funcName": func,
            "locals": process_variables(frame.f_locals, prev_locals),
            "globals": process_variables(frame.f_globals),
            "heap": self.heap.copy(),
            "stack": stack[::-1],
            "stdout": self.stdout_capture.getvalue(),
            "loopMeta": loop_meta
        }
        
        if event == 'exception':
            step['exception'] = str(arg[1])

        self.trace_data.append(step)

    def trace_dispatch(self, frame, event, arg):
        self.capture_frame(frame, event, arg)
        return self.trace_dispatch

def run_with_trace(code, input_json="[]"):
    input_buffer = json.loads(input_json)
    logger = TraceLogger(input_buffer=input_buffer)
    original_stdout = sys.stdout
    original_input = builtins.input
    sys.stdout = logger.stdout_capture
    builtins.input = logger.custom_input
    
    status = "success"
    error_msg = None
    
    try:
        exec_globals = {}
        sys.settrace(logger.trace_dispatch)
        exec(code, exec_globals)
    except EOFError as e:
        if str(e) == "INTERACTIVE_INPUT_REQUIRED":
            status = "input_required"
        else:
            status = "error"
            # Format unexpected EOF errors cleanly
            error_msg = traceback.format_exc()
    except Exception:
        status = "error"
        # Capture the full stack trace including the line number
        error_msg = traceback.format_exc()
    finally:
        sys.settrace(None)
        sys.stdout = original_stdout
        builtins.input = original_input
        
    return json.dumps({
        "steps": logger.trace_data, 
        "status": status,
        "error": error_msg,
        "inputIndex": logger.input_index
    })
`;
