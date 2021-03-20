
from pec.metrics import ClusteringMetrics
import numpy as np

data = np.array([
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 0]
], dtype=float)

labels_prev = np.array([0, 1, 2, 3])
labels_curr = np.array([1, 2, 0, 3])

sm = ClusteringMetrics.smooth_labels__jaccard(data, labels_prev, labels_curr)
print(sm)
"""
a, b, u = ClusteringMetrics.normalize_labels(data, labels_a, labels_b)

print(labels_a, a)
print(labels_b, b)
print(u)
"""

