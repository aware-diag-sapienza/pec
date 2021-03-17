from multiprocessing import Process, Queue
from threading import Thread
from sklearn.utils import Bunch


import json
import traceback
from .json_websocket_server import JsonWebSocketServer
from ..datasets import Dataset
from .jobs import AsyncJob

"""
class PECServer(JsonWebSocketServer):
    def __init__(self, port, host="0.0.0.0"):
        super().__init__(port, host=host)
        self.jobs = {}


    def onMessage(self, client, messageId, message):
        try:
            if message.startswith("startJob:"):
                job_id = message.replace("startJob:", "")
                self.jobs[job_id].start()
                print(f"Starting {job_id}")
            elif message.startswith("stopJob:"):
                job_id = message.replace("stopJob:", "")
                print(f"Stopping {job_id}")
                self.jobs[job_id].stop()
            else:
                raise RuntimeError(f"Undefined message type '{message}'")
            ##
        except Exception as e:
            traceback.print_exc()
            self.sendMessage(client, traceback.format_exc())
    
    def onRequest(self, client, requestId, request):
        try:
            if request == "datasetsInfo":
                self.sendRequestResponse(client, requestId, Dataset.allInfo())
            # --- #
            elif request.startswith("dataset:"):
                datasetName = request.replace("dataset:", "")
                self.sendRequestResponse(client, requestId, Dataset(datasetName).dict)
            # --- #
            elif request.startswith("createAsyncJob:"):
                obj = json.loads(request.replace("createAsyncJob:", ""))
                job = self.createAsyncJob(client, obj["type"], obj["dataset"],  obj["k"], obj["r"], obj["s"])
                self.jobs[job.id] = job
                self.sendRequestResponse(client, requestId, job.id)
            # --- #
            else:
                raise RuntimeError(f"Undefined request type '{request}'")
            # --- #
        except Exception as e:
            print(e)
            self.sendRequestResponse(client, requestId, str(e))

    '''
    def createSyncJob(self, client, type, dataset, k, r, s):
        def callback(result, ack):
            self.sendMessage(client, {
                "type": "partial-result",
                "data": result
            })
        client_id = str(client["address"][0]) + ":" + str(client["address"][1])
        job = SyncJob(type, dataset, k, r, s, callback, client_id=client_id)
        return job
    '''

    def createAsyncJob(self, client, type, dataset, k, r, s):
        def callback(result): 
            self.sendMessage(client, {
                "type": "partial-result",
                "data": result
            })
        client_id = str(client["address"][0]) + ":" + str(client["address"][1])
        job = AsyncJob(type, dataset, k, r, s, callback, client_id=client_id)
        return job

"""



class NetworkProcess(Process):
    def __init__(self, port, host="0.0.0.0", **kwargs):
        super().__init__(**kwargs)
        self.port = port
        self.host = host
        self.queue = Queue()
        self.networkManager = None
        self.jobsManager = None

    def run(self):
        self.networkManager = NetworkManager(self.port, self.host, self.queue)
        self.jobsManager = JobsManager(self.networkManager.server, self.queue)

        self.networkManager.start()
        self.jobsManager.start()

####
####
####
####
####

class NetworkManager(Thread):
    def __init__(self, port, host, queue, **kwargs):
        super().__init__(**kwargs)
        self.port = port
        self.host = host
        self.queue = queue
        self.server = JsonWebSocketServer(self.port, host=self.host, fn_onMessage=self.onMessage, fn_onRequest=self.onRequest)

    
    def onMessage(self, client, messageId, message):
        try:
            if message.startswith("startJob:"):
                job_id = message.replace("startJob:", "")
                self.task_startJob(job_id)
            elif message.startswith("stopJob:"):
                job_id = message.replace("stopJob:", "")
                self.task_stopJob(job_id)
            elif message.startswith("pauseJob:"):
                job_id = message.replace("pauseJob:", "")
                self.task_pauseJob(job_id)
            else:
                raise RuntimeError(f"Undefined message type '{message}'")
            ##
        except Exception:
            traceback.print_exc()
            self.server.sendMessage(client, traceback.format_exc())

    def onRequest(self, client, requestId, request):
        try:
            if request == "datasetsInfo":
                self.server.sendRequestResponse(client, requestId, Dataset.allInfo())
            elif request.startswith("dataset:"):
                datasetName = request.replace("dataset:", "")
                self.server.sendRequestResponse(client, requestId, Dataset(datasetName).dict)
            elif request.startswith("createAsyncJob:"):
                obj = json.loads(request.replace("createAsyncJob:", ""))
                self.task_createAsyncJob(client, requestId, obj["type"], obj["dataset"],  obj["k"], obj["r"], obj["s"])
                ##self.server.sendRequestResponse(client, requestId, job_id)
            else:
                raise RuntimeError(f"Undefined request type '{request}'")
            ##
        except Exception:
            traceback.print_exc()
            self.server.sendMessage(client, traceback.format_exc())

    def run(self):
        self.server.run()
    
    def task_startJob(self, jobId):
        print(f"Starting {jobId}")
        self.queue.put({
            "event": "startJob",
            "data": Bunch(jobId=jobId)
        })
        
    def task_stopJob(self, jobId):
        print(f"Stopping {jobId}")
        self.queue.put({
            "event": "stopJob",
            "data": Bunch(jobId=jobId)
        })
    
    def task_pauseJob(self, jobId):
        print(f"Pausing {jobId}")
        self.queue.put({
            "event": "pauseJob",
            "data": Bunch(jobId=jobId)
        })

    def task_createAsyncJob(self, client, requestId,  type, dataset, k, r, s):
        self.queue.put({
            "event": "createAsyncJob",
            "data": Bunch(client=client, requestId=requestId, type=type, dataset=dataset, k=k, r=r, s=s)
        })

####
####
####
####
####

class JobsManager(Thread):
    def __init__(self, server, queue, **kwargs):
        super().__init__(**kwargs)
        self.server = server
        self.queue = queue
        self.jobs = {}

    def run(self):
        while True:
            e = self.queue.get()
            self.manageEvent(e)
    
    def manageEvent(self, e):
        if e["event"] == "startJob":
            pass
        elif e["event"] == "pauseJob":
            pass
        elif e["event"] == "stopJob":
            pass
        elif e["event"] == "createAsyncJob":
            pass
        elif e["event"] == "partialResult":
            pass
        else:
            raise RuntimeError(f"Undefined event type '{e['event']}'")









