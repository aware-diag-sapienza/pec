from sklearn.utils import Bunch
from multiprocessing import Queue


from .network import NetworkManager
from .jobs import JobsManager
from ..log import Log

class PECServer:
    def __init__(self, port, host="0.0.0.0"):
        self.port = port
        self.host = host
        self.commandQueue = Queue()
        self.eventQueue = Queue()
        
        self.networkManager = NetworkManager(self.port, self.host, self.commandQueue, self.eventQueue)
        self.jobsManager = JobsManager(self.commandQueue, self.eventQueue)

    
    def start(self):
        self.networkManager.start()
        self.jobsManager.start()
        Log.print(f"Starting PEC Server on {Log.BLUE}ws://{self.host}:{self.port}")
        self.networkManager.join()
        self.jobsManager.join()




