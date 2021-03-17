from datetime import datetime

class Log:
    GRAY = '\033[90m'
    ENDC = '\033[0m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    PINK = '\033[95m'

    @staticmethod
    def print(s):
        time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"{Log.GRAY}{time}{Log.ENDC} {s}{Log.ENDC}")
