
import os
import sys
import subprocess

def very_unsafe_function(user_input):
    # Intentional vulnerability for testing CI/CD security scan
    print("Executing very unsafe code...")
    
    # 1. EVAL
    eval(user_input)
    
    # 2. OS SYSTEM
    os.system("echo " + user_input)
    
    # 3. SUBPROCESS
    subprocess.call(user_input, shell=True)
    
    # 4. EXEC
    exec(user_input)

if __name__ == "__main__":
    very_unsafe_function("rm -rf /")
