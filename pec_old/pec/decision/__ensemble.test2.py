import numpy as np
import scipy.sparse
import networkx as nx
import time

from ensemble import Ensemble

start_t = time.time()
partitions = np.random.randint(0, 4, size=(8, 5000000), dtype=np.int8)
print(f"n={partitions.shape[1]} r={partitions.shape[0]}")
print(f"Data generated in {round(time.time() - start_t, 2)} sec")

start_t = time.time()
ensemble = Ensemble(partitions=partitions, n_cluster=4, partitions_format='PE')
labels, _, _ = ensemble.mcla(dtype=np.int8)
print(f"Consensus computed in {round(time.time() - start_t, 2)} sec")
print(f"Labels: {np.lib.arraysetops.unique(labels)}")