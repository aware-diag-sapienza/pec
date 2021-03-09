import numpy as np
from pathlib import Path
from pec import I_PecK
import time

from pec.server.jobs import AsyncJob, SyncJob

def fn(result, ack=None):
    print(result.job_id)
    time.sleep(2)
    ack()

if __name__ == "__main__":
    job = SyncJob("I-PecK", "glass", 4, 4, 0, fn)
    job.start()
    
    