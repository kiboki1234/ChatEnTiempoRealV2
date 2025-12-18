
import os
import subprocess

def legacy_backup(filename):
    # VULNERABILITY 1: OS Injection
    os.system("cp " + filename + " /backups/")
    
    # VULNERABILITY 2: Subprocess with shell=True
    subprocess.call("tar -czf " + filename + ".tar.gz " + filename, shell=True)
    
    print("Backup completed (unsafely)")

def run_legacy_script(script_name):
    # VULNERABILITY 3: Exec usage
    exec(open(script_name).read())
