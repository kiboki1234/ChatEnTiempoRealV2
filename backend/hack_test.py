import os

# Esto debería ser detectado como vulnerable por el nuevo scanner modular
def run_unsafe_code():
    print("Executing unsafe code...")
    codigo = "print('hacked')"
    
    # VULNERABILITY: eval usage
    eval(codigo)
    
    # VULNERABILITY: os.system usage
    os.system("echo 'deleting files...'")

if __name__ == "__main__":
    run_unsafe_code()
