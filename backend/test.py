from sklearn.utils.validation import _num_samples
'''
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
'''

import numpy as np
from sklearn.datasets import make_moons, make_circles

X, y = make_moons(n_samples = 1500, noise=.05)
np.savetxt("moons.csv", X, delimiter=",", header="x,y", comments="")


X, y = make_circles(n_samples=1500, factor=.5, noise=.05)
np.savetxt("circles.csv", X, delimiter=",", header="x,y", comments="")
