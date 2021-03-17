import psutil
import time
import traceback
import datetime
from sklearn.utils import Bunch
from threading import Thread
from multiprocessing import Process, Queue, Lock

from .pec_event import PECEvent
from ..datasets import Dataset
from ..pec_instances import I_PecK, I_PecKPP, MCLA_PecK, MCLA_PecKPP, HGPA_PecK, HGPA_PecKPP
from ..pec_instances import TEPMLATE_ID_PLACEHOLDER
from ..log import Log



class JobsManager(Process):
    def __init__(self, commandQueue, eventQueue, **kwargs):
        super().__init__(**kwargs)
        self.commandQueue = commandQueue
        self.eventQueue = eventQueue
        self.partialResultsQueue = Queue()

        self.jobs = {}


    def run(self):
        Log.print(f"{Log.GRAY}Starting JobsManager")
        commandListenerThread = Thread(target=self.commandListener)
        partialResultsListenerThread = Thread(target=self.partialResultsListener)
        
        commandListenerThread.start()
        partialResultsListenerThread.start()
        commandListenerThread.join()
        partialResultsListenerThread.join()

    def partialResultsListener(self):
        while True:
            try:
                e = self.partialResultsQueue.get()
                if e.name == "PartialResult":
                    self.eventQueue.put(e)
                else:
                    raise RuntimeError(f"Undefined event name '{e.name}'")
            except Exception:
                traceback.print_exc()

    def commandListener(self):
        while True:
            try:
                e = self.commandQueue.get()
                if e.name == "startJob":
                    jobId = e.data.jobId
                    Log.print(f"{Log.GREEN}Starting {jobId}")
                    self.jobs[jobId].start()

                elif e.name == "pauseJob":
                    jobId = e.data.jobId
                    Log.print(f"{Log.YELLOW}Pausing {jobId}")
                    psutil.Process(pid=self.jobs[jobId].pid).suspend()

                elif e.name == "resumeJob":
                    jobId = e.data.jobId
                    Log.print(f"{Log.BLUE}Resuming {jobId}")
                    psutil.Process(pid=self.jobs[jobId].pid).resume()

                elif e.name == "stopJob":
                    jobId = e.data.jobId
                    Log.print(f"{Log.RED}Stopping {jobId}")
                    psutil.Process(pid=self.jobs[jobId].pid).terminate()
                    del self.jobs[jobId]

                elif e.name == "createAsyncJob":
                    job = AsyncJob(e.data.type, e.data.dataset, e.data.k, e.data.r, e.data.s, self.partialResultsQueue, client_id=e.data.client)
                    self.jobs[job.id] = job
                    self.eventQueue.put(PECEvent("AsyncJob", Bunch(client=e.data.client, requestId=e.data.requestId, jobId=job.id)))
                    Log.print(f"{Log.PINK}Created AsyncJob {job.id}")
                    
                else:
                    raise RuntimeError(f"Undefined command name '{e.name}'")
            except Exception:
                traceback.print_exc()




class AsyncJob(Process):
    def __init__(self, type, dataset, n_clusters, n_runs, random_state, partialResultsQueue, client_id=None, **kwargs):
        super().__init__(**kwargs)
        template_id = f"AsyncJob:{TEPMLATE_ID_PLACEHOLDER}:{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        if client_id is not None: template_id += f"-{client_id}"

        self.type = type
        self.dataset = dataset
        self.n_clusters = n_clusters
        self.n_runs = n_runs
        self.random_state = random_state
        self.partialResultsQueue = partialResultsQueue


        self.pec = self.instantiatePec(self.partialResultCallback, template_id)
        self.id = self.pec.job_id
        self.client = client_id

    
    def instantiatePec(self, callback, template_id):
        data = Dataset(self.dataset).data()
        pec = None
        if self.type == "I-PecK":
            pec = I_PecK(data, n_clusters=self.n_clusters, n_runs=self.n_runs, random_state=self.random_state, dataset_name=self.dataset, results_callback=callback, template_id=template_id)
        elif self.type == "I-PecK++":
            pec = I_PecKPP(data, n_clusters=self.n_clusters, n_runs=self.n_runs, random_state=self.random_state, dataset_name=self.dataset, results_callback=callback, template_id=template_id)
        elif self.type == "HGPA-PecK":
            pec = HGPA_PecK(data, n_clusters=self.n_clusters, n_runs=self.n_runs, random_state=self.random_state, dataset_name=self.dataset, results_callback=callback, template_id=template_id)
        elif self.type == "HGPA-PecK++":
            pec = HGPA_PecKPP(data, n_clusters=self.n_clusters, n_runs=self.n_runs, random_state=self.random_state, dataset_name=self.dataset, results_callback=callback, template_id=template_id)
        elif self.type == "MCLA-PecK":
            pec = MCLA_PecK(data, n_clusters=self.n_clusters, n_runs=self.n_runs, random_state=self.random_state, dataset_name=self.dataset, results_callback=callback, template_id=template_id)
        elif self.type == "MCLA-PecK++":
            pec = MCLA_PecKPP(data, n_clusters=self.n_clusters, n_runs=self.n_runs, random_state=self.random_state, dataset_name=self.dataset, results_callback=callback, template_id=template_id)
        else:
            raise RuntimeError(f"Undefined pec type '{self.type}'")
        return pec

    def partialResultCallback(self, pr):
        self.partialResultsQueue.put(PECEvent("PartialResult", Bunch(client=self.client, jobId=self.id, pr=pr)))

    
    def run(self):
        self.pec.start()