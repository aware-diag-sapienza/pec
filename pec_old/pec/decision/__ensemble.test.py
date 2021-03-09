import numpy as np
import scipy.sparse
import networkx as nx

from ensemble import Ensemble

# 4 data entries x 3 partitions
partitions = np.array([
  [0, 0, 0, 1, 2],
  [1, 1, 2, 0, 0],
  [2, 1, 2, 2, 1],
  [2, 2, 1, 1, 0]
])

"""
ensemble = Ensemble(partitions=partitions, n_cluster=3, partitions_format='EP')
e, ts, pr = ensemble.mcla(times=True, partial_results=True)
for t in ts:
  print(f'{t[0]}: {t[1]} s')
for r in pr:
  print(r[0])
  print(r[1])


print('\n___PARTITIONS 2___')
partitions2 = np.transpose(partitions)
ensemble2 = Ensemble(partitions=partitions2, n_cluster=3, partitions_format='PE')
e2, ts2, pr2 = ensemble2.mcla(times=True, partial_results=True)
for t in ts2:
  print(f'{t[0]}: {t[1]}s')
for r in pr2:
  print(r[0])
  print(r[1])
"""

print('\n___PARTITIONS 3___')
partitions3 = np.random.randint(8, size=(8, 100000))
ensemble3 = Ensemble(partitions=partitions3, n_cluster=8, partitions_format='PE')
e3, ts3, _pr3 = ensemble3.mcla(times=True)
for t in ts3:
  print(f'{t[0]}: {t[1]}s')

"""
hypergraph4 = np.array([
  [1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 1, 1],
  [0, 0, 0, 0, 0, 1, 1],
  [1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1],
  [1, 0, 0, 1, 0, 0, 0],
  [0, 1, 0, 0, 1, 0, 0]
])
ensemble4 = Ensemble(partitions=np.array([[]]), n_cluster=3, partitions_format='PE')
ensemble4.hypergraph = scipy.sparse.csr_matrix(hypergraph4)
print('Hypergraph')
print(ensemble4.hypergraph.toarray())
ensemble4.construct_metagraph()
print('Metagraph')
print(nx.adjacency_matrix(ensemble4.metagraph).todense())
ensemble4.cluster_hyperedges(k=ensemble4.k)
print('Meta-Clusters')
print(ensemble4.meta_clusters.toarray())
ensemble4.collapse_meta_clusters()
print('Meta-Hyperedges')
print(ensemble4.meta_hyperedges.toarray())
ensemble4.compete_for_objects()
print('Ensemble')
print(ensemble4.ensemble)
"""
