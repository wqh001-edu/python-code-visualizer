
/**
 * Advanced Python Tracer with Interactive Input support.
 */
export const TRACER_WRAPPER_PYTHON = `
import sys
import json
import io
import traceback
import types
import builtins

class TraceLogger:
    def __init__(self, input_buffer=None):
        self.trace_data = []
        self.stdout_capture = io.StringIO()
        self.max_steps = 300
        self.heap = {}
        self.input_buffer = input_buffer or []
        self.input_index = 0
        
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
        if prompt:
            print(prompt, end="")
        if self.input_index < len(self.input_buffer):
            val = self.input_buffer[self.input_index]
            self.input_index += 1
            # print is used to echo the input to stdout like a real terminal
            print(val) 
            return val
        else:
            # Signal that more input is needed
            raise EOFError("INTERACTIVE_INPUT_REQUIRED")

    def capture_frame(self, frame, event, arg):
        if frame.f_code.co_filename != '<string>':
            return
        if len(self.trace_data) >= self.max_steps:
            return

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
            error_msg = str(e)
    except Exception as e:
        status = "error"
        error_msg = str(e)
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
