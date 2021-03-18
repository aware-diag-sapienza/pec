from pec.metrics import ClusteringMetrics
import numpy as np

x = [[0, 1], [0.1, 0.9]]
y = [[1, 0], [0.9, 0.1]]
data = np.array(x + y)

labels_a = [0,0, 1,1]
labels_b = [0,0, 1,2][::-1]

a, b, u = ClusteringMetrics.normalize_labels(data, labels_a, labels_b)

print(labels_a, a)
print(labels_b, b)
print(u)