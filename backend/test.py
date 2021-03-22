
from pec.metrics import ClusteringMetrics
import numpy as np

data = np.array([
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 0],
    [0.5, 0.5]
], dtype=float)

labels = np.array([0, 0, 1, 1, 0])

s = ClusteringMetrics.silhouette(data, labels)
ss = ClusteringMetrics.simplified_silhouette(data, labels)

print(F"S  {s}")
print(F"SS {ss}")

