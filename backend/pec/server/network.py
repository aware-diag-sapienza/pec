import json
import traceback
from sklearn.utils import Bunch
from threading import Thread
from multiprocessing import Process

from .pec_event import PECEvent
from .libs.json_websocket_server import JsonWebSocketServer
from ..datasets import Dataset
from ..log import Log


class NetworkManager(Process):
    def __init__(self, port, host, commandQueue, eventQueue, **kwargs):
        super().__init__(**kwargs)
        self.port = port
        self.host = host
        
        self.commandQueue = commandQueue
        self.eventQueue = eventQueue
        
        self.socket = None
        self.clients = {}

    def run(self):
        Log.print(f"{Log.GRAY}Starting NetworkManager")
        self.socket = JsonWebSocketServer(self.port, host=self.host, fn_onMessage=self.onMessage, fn_onRequest=self.onRequest)
        serverThread = Thread(target=self.socket.run)
        listenerThread = Thread(target=self.eventListener)
        serverThread.start()
        listenerThread.start()
        serverThread.join()
        listenerThread.join()

        

    def eventListener(self):
        while True:
            try:
                e = self.eventQueue.get()
                if e.name == "PartialResult":
                    client = e.data.client
                    #jobId = e.data.jobId
                    pr = e.data.pr
                    self.socket.sendMessage(client, {
                        "type": "partial-result",
                        "data": pr
                    })
                elif e.name == "AsyncJob":
                    self.socket.sendRequestResponse(e.data.client, e.data.requestId, e.data.jobId)
                else:
                    raise RuntimeError(f"Undefined event name '{e.name}'")
            except Exception:
                traceback.print_exc()

        
    def onMessage(self, client, messageId, message):
        try:
            if message.startswith("startJob:"):
                job_id = message.replace("startJob:", "")
                self.sendEvent_startJob(job_id)
            elif message.startswith("stopJob:"):
                job_id = message.replace("stopJob:", "")
                self.sendEvent_stopJob(job_id)
            elif message.startswith("pauseJob:"):
                job_id = message.replace("pauseJob:", "")
                self.sendEvent_pauseJob(job_id)
            elif message.startswith("resumeJob:"):
                job_id = message.replace("resumeJob:", "")
                self.sendEvent_resumeJob(job_id)
            else:
                raise RuntimeError(f"Undefined message type '{message}'")
            ##
        except Exception:
            traceback.print_exc()
            self.socket.sendMessage(client, traceback.format_exc())

    def onRequest(self, client, requestId, request):
        try:
            if request == "datasetsInfo":
                self.socket.sendRequestResponse(client, requestId, Dataset.allInfo())
            elif request.startswith("dataset:"):
                datasetName = request.replace("dataset:", "")
                self.socket.sendRequestResponse(client, requestId, Dataset(datasetName).dict)
            elif request.startswith("createAsyncJob:"):
                obj = json.loads(request.replace("createAsyncJob:", ""))
                self.sendEvent_createAsyncJob(client, requestId, obj["type"], obj["dataset"],  obj["k"], obj["r"], obj["s"])
            else:
                raise RuntimeError(f"Undefined request type '{request}'")
            ##
        except Exception:
            traceback.print_exc()
            self.socket.sendMessage(client, traceback.format_exc())

    
    def sendEvent_startJob(self, jobId):
        e = PECEvent("startJob", Bunch(jobId=jobId))
        self.commandQueue.put(e)
        
    def sendEvent_stopJob(self, jobId):
        e = PECEvent("stopJob", Bunch(jobId=jobId))
        self.commandQueue.put(e)
    
    def sendEvent_pauseJob(self, jobId):
        e = PECEvent("pauseJob", Bunch(jobId=jobId))
        self.commandQueue.put(e)

    def sendEvent_resumeJob(self, jobId):
        e = PECEvent("resumeJob", Bunch(jobId=jobId))
        self.commandQueue.put(e)

    def sendEvent_createAsyncJob(self, client, requestId,  type, dataset, k, r, s):
        e = PECEvent("createAsyncJob", Bunch(client=client, requestId=requestId, type=type, dataset=dataset, k=k, r=r, s=s))
        self.commandQueue.put(e)
        