
import os
import sys

def unsafe_function(user_input):
    # Intentional vulnerability for testing CI/CD security scan
    print("Executing user input...")
    eval(user_input)  # This should be flagged as DANGEROUS by the ML model
    
    # Another vulnerability
    os.system("echo " + user_input) # Command injection risk

if __name__ == "__main__":
    unsafe_function("print('hello')")
