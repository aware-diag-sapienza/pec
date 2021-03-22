"""
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
"""

from pec.server.jobs import ElbowJob

if __name__ == "__main__":
    e = ElbowJob("I-PecK", "glass", 2, 10, 8, 0, None)
    e.start()
    e.join()

