import subprocess
from pathlib import Path

import os
os.system("python3 backend/server.py")

"""
list_files = subprocess.run(["ls", "-l"])
print("The exit code was: %d" % list_files.returncode)
"""