from pec.server.jobs import ElbowJob
from multiprocessing import Queue
import pandas as pd

TECH = "I-PecK"
DATASET = "s1"
MIN_K = 2
MAX_K = 50
RUNS = 16
SEED = 0

if __name__ == "__main__":
    for et in ["fast", "slow", None]:
    
        queue = Queue()
        job = ElbowJob(TECH, DATASET, MIN_K, MAX_K, RUNS, SEED, queue, earlyTermination=et)
        job.start()

        data = []
        while True:
            e = queue.get()
            pr = e.pr
            d = {
                'timestamp': pr.timestamp,
                'k': pr.k,
                'elbowSeed': pr.elbowSeed, 
                'seed': pr.seed, 
                'inertia': pr.inertia, 
                'simplifiedSilhouette': pr.simplifiedSilhouette
            }
            data.append(d)
            print(d)

            if pr.isLast:
                break
        
        df = pd.DataFrame(data)
        df.to_csv(f"{job.id}.csv", index=False)
