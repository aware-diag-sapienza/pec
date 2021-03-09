import json
import traceback

from .json_websocket_server import JsonWebSocketServer
from ..datasets import Dataset
#from ..pec_instances import I_PecK, I_PecKPP, MCLA_PecK, MCLA_PecKPP, HGPA_PecK, HGPA_PecKPP
from .jobs import AsyncJob




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
