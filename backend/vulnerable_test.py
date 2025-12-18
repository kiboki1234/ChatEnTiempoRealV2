
import os
import sys
import subprocess

def very_vulnerable_test():
    """
    CRITICAL SECURITY VULNERABILITY TEST FILE
    This file contains multiple high-risk patterns to trigger the ML Security Scanner.
    """
    
    # 1. EVAL Injection (High Risk)
    cmd = "print('hacked')"
    eval(cmd)
    
    # 2. OS Command Injection
    user_input = "rm -rf /"
    os.system(f"echo {user_input}")
    
    # 3. Exec usage
    code = "import os; os.getcwd()"
    exec(code)
    
    # 4. Subprocess with shell=True
    subprocess.call("ls -la", shell=True)
    
    # 5. More dangerous patterns for regex matching
    # innerHTML
    # dangerouslySetInnerHTML
    # document.write
    
    return True

if __name__ == "__main__":
    very_vulnerable_test()
