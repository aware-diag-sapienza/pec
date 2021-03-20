import json
from threading import Thread
import traceback
import psutil
from multiprocessing import Queue
from sklearn.utils import Bunch

from ..log import Log
from .jobs import AsyncJob
from ..datasets import Dataset
from .libs.json_websocket_server import JsonWebSocketServer

class PECServer:
    def __init__(self, port, host="0.0.0.0"):
        self.port = port
        self.host = host
        self.partialResultsQueue = Queue()
        self.socketServer = JsonWebSocketServer(self.port, host=self.host, fn_onMessage=self.onMessage, fn_onRequest=self.onRequest)
        self.partialResultListener = Thread(target=self.fn_partialResultListener)
        self.jobs = {}

    def onMessage(self, client, messageId, message):
        try:
            if message.startswith("startJob:"):
                jobId = message.replace("startJob:", "")
                Log.print(f"{Log.GREEN}Starting {jobId}")
                self.jobs[jobId].start() 
            ##
            elif message.startswith("stopJob:"):
                jobId = message.replace("stopJob:", "")
                Log.print(f"{Log.RED}Stopping {jobId}")
                psutil.Process(pid=self.jobs[jobId].pid).terminate()
                del self.jobs[jobId]
            ##
            elif message.startswith("pauseJob:"):
                jobId = message.replace("pauseJob:", "")
                Log.print(f"{Log.YELLOW}Pausing {jobId}")
                psutil.Process(pid=self.jobs[jobId].pid).suspend()
            ##
            elif message.startswith("resumeJob:"):
                jobId = message.replace("resumeJob:", "")
                Log.print(f"{Log.BLUE}Resuming {jobId}")
                psutil.Process(pid=self.jobs[jobId].pid).resume()
            ##
            else:
                raise RuntimeError(f"Undefined message type '{message}'")
            ##
        except Exception:
            traceback.print_exc()
            self.socketServer.sendMessage(client, traceback.format_exc())

    def onRequest(self, client, requestId, request):
        try:
            if request == "datasetsInfo":
                self.socketServer.sendRequestResponse(client, requestId, Dataset.allInfo())
            ##
            elif request.startswith("dataset:"):
                datasetName = request.replace("dataset:", "")
                self.socketServer.sendRequestResponse(client, requestId, Dataset(datasetName).dict)
            ##
            elif request.startswith("createAsyncJob:"):
                d = Bunch(**json.loads(request.replace("createAsyncJob:", "")) )
                jobId = self.createAsyncJob(client, requestId, d)
                self.socketServer.sendRequestResponse(client, requestId, jobId)
            ##
            else:
                raise RuntimeError(f"Undefined request type '{request}'")
            ##
        except Exception:
            traceback.print_exc()
            self.socketServer.sendMessage(client, traceback.format_exc())
    
    def createAsyncJob(self, client, requestId, d):
        job = AsyncJob(d.type, d.dataset, d.k, d.r, d.s, self.partialResultsQueue, client=client)
        self.jobs[job.id] = job
        Log.print(f"{Log.PINK}Created AsyncJob {job.id}")
        return job.id
    
    def fn_partialResultListener(self):
        while True:
            data = self.partialResultsQueue.get()
            if not data.pr.info.is_last: Log.print(f"{Log.GRAY}Sending partial result #{data.pr.info.iteration} of {data.pr.job_id}")
            else: Log.print(f"{Log.GRAY}Sending partial result #{data.pr.info.iteration} of {data.pr.job_id} -- {Log.RED}last{Log.ENDC}")
            self.socketServer.sendMessage(data.client, {
                "type": "partial-result",
                "data": data.pr
            })
    
    def start(self):
        Log.print(f"Starting PEC Server on {Log.BLUE}ws://{self.host}:{self.port}")
        self.partialResultListener.start()
        self.socketServer.start() ##bloccante


    

