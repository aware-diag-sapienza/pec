from __future__ import division
import os
import numpy as np
import scipy.sparse, scipy.spatial
import time
import sklearn.metrics
import networkx as nx
import metis

import ctypes
from itertools import combinations
from collections import namedtuple


### Fix for compatibility with Networkx 2.4, Graph.node is removed (H.node --> H.nodes) ###
IDXTYPEWIDTH  = os.getenv('METIS_IDXTYPEWIDTH', '32')
REALTYPEWIDTH = os.getenv('METIS_REALTYPEWIDTH', '32')
if IDXTYPEWIDTH == '32':
    idx_t = ctypes.c_int32
elif IDXTYPEWIDTH == '64':
    idx_t = ctypes.c_int64
else:
    raise EnvironmentError('Env var METIS_IDXTYPEWIDTH must be "32" or "64"')
if REALTYPEWIDTH == '32':
    real_t = ctypes.c_float
elif REALTYPEWIDTH == '64':
    real_t = ctypes.c_double
else:
    raise EnvironmentError('Env var METIS_REALTYPEWIDTH must be "32" or "64"')

METIS_Graph = namedtuple('METIS_Graph', 'nvtxs ncon xadj adjncy vwgt vsize adjwgt')
def networkx_to_metis(G):
  """
  Convert NetworkX graph into something METIS can consume
  The graph may specify weights and sizes using the following
  graph attributes:

  * ``edge_weight_attr``
  * ``node_weight_attr`` (multiple names allowed)
  * ``node_size_attr``

  For example::

      >>> G.adj[0][1]['weight'] = 3
      >>> G.node[0]['quality'] = 5
      >>> G.node[0]['specialness'] = 8
      >>> G.graph['edge_weight_attr'] = 'weight'
      >>> G.graph['node_weight_attr'] = ['quality', 'specialness']

  If node_weight_attr is a list instead of a string, then multiple
  node weight labels can be provided.

  All weights must be integer values. If an attr label is specified but
  a node/edge is missing that attribute, it defaults to 1.

  If a graph attribute is not provided, no defaut is used. That is, if
  ``edge_weight_attr`` is not set, then ``'weight'`` is not used as the
  default, and the graph will appear unweighted to METIS.
  """
  n = G.number_of_nodes()
  m = G.number_of_edges()
  nvtxs = idx_t(n)
  H = nx.convert_node_labels_to_integers(G)
  xadj = (idx_t*(n+1))()
  adjncy = (idx_t*(2*m))()
  # Check graph attributes for weight/size labels
  edgew = G.graph.get('edge_weight_attr', None)
  nodew = G.graph.get('node_weight_attr', [])
  nodesz = G.graph.get('node_size_attr', None)
  if edgew:
      adjwgt = (idx_t*(2*m))()
  else:
      adjwgt = None
  if nodew:
      if isinstance(nodew, str):
          nodew = [nodew]
      nc = len(nodew)
      ncon = idx_t(nc)
      vwgt = (idx_t*(n*len(nodew)))()
  else:
      ncon = idx_t(1)
      vwgt = None
  if nodesz:
      vsize = (idx_t*n)()
  else:
      vsize = None
  # Fill in each array
  xadj[0] = e = 0
  for i in H.nodes:
      for c,w in enumerate(nodew):
          try:
              vwgt[i*nc+c] = H.nodes[i].get(w, 1)
          except TypeError:
              raise TypeError("Node weights must be integers" )
      if nodesz:
          try:
              vsize[i] = H.nodes[i].get(nodesz, 1)
          except TypeError:
              raise TypeError("Node sizes must be integers")
      for j, attr in H.adj[i].items():
          adjncy[e] = j
          if edgew:
              try:
                  adjwgt[e] = attr.get(edgew, 1)
              except TypeError:
                  raise TypeError("Edge weights must be integers")
          e += 1
      xadj[i+1] = e
  return METIS_Graph(nvtxs, ncon, xadj, adjncy, vwgt, vsize, adjwgt)

def memory():
    """Determine memory specifications of the machine.

    Returns
    -------
    mem_info : dictonary
        Holds the current values for the total, free and used memory of the system.
    """

    mem_info = dict()

    for k, v in psutil.virtual_memory()._asdict().items():
           mem_info[k] = int(v)
           
    return mem_info

def get_chunk_size(N, n):
    """Given a two-dimensional array with a dimension of size 'N', 
        determine the number of rows or columns that can fit into memory.

    Parameters
    ----------
    N : int
        The size of one of the dimensions of a two-dimensional array.  

    n : int
        The number of arrays of size 'N' times 'chunk_size' that can fit in memory.

    Returns
    -------
    chunk_size : int
        The size of the dimension orthogonal to the one of size 'N'. 
    """

    mem_free = memory()['free']
    if mem_free > 60000000:
        chunk_size = int(((mem_free - 10000000) * 1000) / (4 * n * N))
        return chunk_size
    elif mem_free > 40000000:
        chunk_size = int(((mem_free - 7000000) * 1000) / (4 * n * N))
        return chunk_size
    elif mem_free > 14000000:
        chunk_size = int(((mem_free - 2000000) * 1000) / (4 * n * N))
        return chunk_size
    elif mem_free > 8000000:
        chunk_size = int(((mem_free - 1400000) * 1000) / (4 * n * N))
        return chunk_size
    elif mem_free > 2000000:
        chunk_size = int(((mem_free - 900000) * 1000) / (4 * n * N))
        return chunk_size
    elif mem_free > 1000000:
        chunk_size = int(((mem_free - 400000) * 1000) / (4 * n * N))
        return chunk_size
    else:
        print("\nERROR: Cluster_Ensembles: get_chunk_size: "
              "this machine does not have enough free memory resources "
              "to perform MCLA clustering.\n")
        sys.exit(1)


###############################################################

def pairwise_sparse_jaccard_distance(X, Y=None):
    """
    Computes the Jaccard distance between two sparse matrices or between all pairs in
    one sparse matrix.

    Args:
        X (scipy.sparse.csr_matrix): A sparse matrix.
        Y (scipy.sparse.csr_matrix, optional): A sparse matrix.

    Returns:
        numpy.ndarray: A similarity matrix.
    """
    if Y is None:
        Y = X
    assert X.shape[1] == Y.shape[1]
    X = X.astype(bool).astype(int)
    Y = Y.astype(bool).astype(int)
    intersect = X.dot(Y.T)
    x_sum = X.sum(axis=1).A1
    y_sum = Y.sum(axis=1).A1
    xx, yy = np.meshgrid(x_sum, y_sum)
    union = ((xx + yy).T - intersect)
    return (1 - intersect / union).A

class Ensemble(object):
  """

  """
  def __init__(self, partitions=np.array([[]]), n_cluster=2, partitions_format='PE'):
    self.k = n_cluster
    # Ensemble store input as partitions x data entries (PE format)
    self.partitions = np.transpose(partitions) if partitions_format == 'EP' else partitions
    self.hypergraph = None
    self.metagraph = None
    self.meta_clusters = None
    self.meta_hyperedges = None
    self.ensemble = None
  
  def clear(self):
    self.hypergraph = None
    self.metagraph = None
    self.meta_clusters = None
    self.meta_hyperedges = None
    self.ensemble = None

  def create_hypergraph(self):
    p, e = self.partitions.shape
    parts_flat = np.ravel(self.partitions)
    ix_p_rows = np.repeat(np.arange(0, p * self.k, self.k), e)
    ix_cols = np.tile(np.arange(e), p)
    ix_rows = np.add(parts_flat, ix_p_rows)
    data = np.ones(len(ix_rows))
    self.hypergraph = scipy.sparse.csr_matrix((data, (ix_rows, ix_cols)), dtype=np.int8)

  def __create_hypergraph_201111(self):
    def ix_2d_unique(x):
      t0 = time.time()
      x_flat = x.ravel()
      ix_flat = np.argsort(x_flat)
      u, ix_u = np.unique(x_flat[ix_flat], return_index=True)
      """
      print('x')
      print(x)
      print('x_flat')
      print(x_flat)
      print('ix_flat')
      print(ix_flat)
      print('u')
      print(u)
      print('ix_u')
      print(ix_u)
      """
      ix_row, ix_col = np.unravel_index(ix_flat, x.shape)
      t1 = time.time()
      for ix_start, start in enumerate(ix_u):
        end = ix_u[ix_start+1] if ix_start +1 < len(ix_u) else len(ix_row)
        np.add.at(ix_row, np.arange(start, end), ix_start * len(ix_u))
      
      t2 = time.time()
      print('t01')
      print(t1-t0)
      print('t12')
      print(t2-t1)
      return ix_row, ix_col
    b0 = time.time()
    ix_rows, ix_cols = ix_2d_unique(self.partitions)
    b1 = time.time()
    data = np.ones(len(ix_rows))
    self.hypergraph = scipy.sparse.csr_matrix((data, (ix_rows, ix_cols)), dtype=np.int8)
    b2 = time.time()
    print('b01')
    print(b1-b0)
    print('b12')
    print(b2-b1)
    print('all')
    print(b2-b0)

  def __create_hypergraph_201110(self):
    def create_sparse_matrix(partition):
      indices = partition
      indptr = range(len(indices)+1)
      data = np.ones(len(indices))
      matrix = scipy.sparse.csr_matrix((data, indices, indptr), dtype=np.int8).transpose()
      if self.hypergraph is None:
        self.hypergraph = matrix
      else:
        self.hypergraph = scipy.sparse.vstack([self.hypergraph, matrix], format='csr')
    np.apply_along_axis(create_sparse_matrix, 1, self.partitions)
  
  def construct_metagraph(self, times=False):
    mg_times = []
    if times: t0 = time.time()
    jaccard = 1 - pairwise_sparse_jaccard_distance(self.hypergraph)
    if times: t1 = time.time()
    self.metagraph = np.round(jaccard * 100).astype(int)
    if times:
      t2 = time.time()
      mg_times.append(('metagraph sparse', t2-t0))
      mg_times.append(('t01', t1-t0))
      mg_times.append(('t12', t2-t1))
    return mg_times
  
  def __construct_metagraph_201112(self, times=False):
    if self.partitions.shape[1] < 1000:
      return self.__construct_metagraph_dense(times)
    else:
      return self.__construct_metagraph_sparse(times)

  def __construct_metagraph_201112_dense(self, times=False):
    mg_times = []
    if times: t0 = time.time()
    self.metagraph = nx.Graph()
    self.metagraph.graph['edge_weight_attr'] = 'weight'
    self.metagraph.add_nodes_from(range(0, self.hypergraph.shape[0]))
    if times: t1 = time.time()
    #
    jaccard_cndmat = 1 - scipy.spatial.distance.pdist(self.hypergraph.toarray(), metric='jaccard')
    if times: t2 = time.time()
    jaccard_iter = list(combinations(range(self.hypergraph.shape[0]),2))
    np.around(jaccard_cndmat * 100, out=jaccard_cndmat)
    weights_cndmat = jaccard_cndmat.view(int)
    weights_cndmat[:] = jaccard_cndmat
    if times: t3 = time.time()
    for ws_ix, ws in enumerate(weights_cndmat):
      if ws > 0:
        self.metagraph.add_edge(jaccard_iter[ws_ix][0], jaccard_iter[ws_ix][1], weight=ws)
    if times:
      t4 = time.time()
      mg_times.append(('metagraph dense', t4-t0))
      mg_times.append(('t01', t1-t0))
      mg_times.append(('t12', t2-t1))
      mg_times.append(('t23', t3-t2))
      mg_times.append(('t34', t4-t3))
    return mg_times

  def __construct_metagraph_201112_sparse(self, times=False):
    mg_times = []
    if times: t0 = time.time()
    self.metagraph = nx.Graph()
    self.metagraph.graph['edge_weight_attr'] = 'weight'
    self.metagraph.add_nodes_from(range(0, self.hypergraph.shape[0]))
    if times: t1 = time.time()
    #
    jaccard = 1 - pairwise_sparse_jaccard_distance(self.hypergraph)
    if times: t2 = time.time()
    weights = np.round(jaccard * 100).astype(int)
    weights_iter = list(combinations(range(self.hypergraph.shape[0]),2))
    if times: t3 = time.time()
    for ix_it, it in enumerate(weights_iter):
      if weights[it[0],it[1]] > 0:
        self.metagraph.add_edge(it[0], it[1], weight=weights[it[0],it[1]])
    if times:
      t4 = time.time()
      mg_times.append(('metagraph sparse', t4-t0))
      mg_times.append(('t01', t1-t0))
      mg_times.append(('t12', t2-t1))
      mg_times.append(('t23', t3-t2))
      mg_times.append(('t34', t4-t3))
    return mg_times, weights

  def __construct_metagraph_201101(self):
    self.metagraph = nx.Graph()
    self.metagraph.graph['edge_weight_attr'] = 'weight'
    self.metagraph.add_nodes_from(range(0, self.hypergraph.shape[0]))
    for i in range(0, self.hypergraph.shape[0]-1):
      for k in range(i+1, self.hypergraph.shape[0]):
        jaccard = sklearn.metrics.jaccard_score(self.hypergraph.getrow(i).toarray().flatten(), self.hypergraph.getrow(k).toarray().flatten())
        # scikit-learn 0.17 --> jaccard = sklearn.metrics.jaccard_similarity_score(self.hypergraph.getrow(i), self.hypergraph.getrow(k), normalize=False)
        weight = int(round(jaccard*100))
        if weight > 0:
          self.metagraph.add_edge(i, k, weight=weight)

  def cluster_hyperedges(self):
    scale_factor = 100
    N_rows = self.hypergraph.shape[0]
    N_cols = self.metagraph.shape[1]
    w = self.hypergraph.sum(axis = 1)
    w *= scale_factor
    w = np.rint(w)
    vwgt = []
    for sublist in w.tolist():
        for item in sublist:
            vwgt.append(int(item))
    adjncy = []
    adjwgt = []
    xadj = []
    xadjind = 0
    xadj.append(0)
    chunks_size = get_chunk_size(N_cols, 7)
    for i in range(0, N_rows, chunks_size):
        M = self.metagraph[i:min(i+chunks_size, N_rows)]
        for j in range(M.shape[0]):
            edges = np.where(M[j] > 0)[0]
            weights = M[j, edges]
            xadjind += edges.size
            xadj.append(xadjind)
            adjncy.extend(edges)
            adjwgt.extend(weights)
    adjwgt = list(map(int, adjwgt))
    xadj = (idx_t * len(xadj))(*xadj)
    adjncy = (idx_t * len(adjncy))(*adjncy)
    adjwgt = (idx_t * len(adjwgt))(*adjwgt)
    vwgt = (idx_t * len(vwgt))(*vwgt)
    ncon = idx_t(1)
    G = METIS_Graph(idx_t(N_rows), ncon, xadj, adjncy, vwgt, None, adjwgt)
    (_, indices) = metis.part_graph(G, self.k)
    indptr = range(len(indices)+1)
    data = np.ones(len(indices))
    self.meta_clusters = scipy.sparse.csr_matrix((data, indices, indptr), dtype=np.int8).transpose()

  def __cluster_hyperedges_201112(self, k):
    metis_graph = networkx_to_metis(self.metagraph)
    (_, indices) = metis.part_graph(metis_graph, nparts=k)
    print('meta clusters')
    print(indices)
    indptr = range(len(indices)+1)
    data = np.ones(len(indices))
    self.meta_clusters = scipy.sparse.csr_matrix((data, indices, indptr), dtype=np.int8).transpose()

  def collapse_meta_clusters(self):
    cluster_sum = self.meta_clusters.sum(1)
    cluster_avg = np.where(cluster_sum != 0, cluster_sum, 10)
    matrix = self.meta_clusters.multiply(1 / cluster_avg)
    self.meta_hyperedges = matrix.dot(self.hypergraph)

  def compete_for_objects(self):
    # Credits: https://stackoverflow.com/questions/51914697/numpy-arrays-row-column-wise-argmax-with-random-ties
    # TODO: check!
    def random_num_per_grp_cumsumed(L):
      r1 = np.random.rand(np.sum(L)) + np.repeat(np.arange(len(L)),L)
      offset = np.r_[0,np.cumsum(L[:-1])]
      return r1.argsort()[offset]
    def argmax_randtie_masking_generic(a, axis=1): 
      max_mask = a==a.max(axis=axis,keepdims=True)
      # m,n = a.shape
      L = max_mask.sum(axis=axis)
      set_mask = np.zeros(L.sum(), dtype=bool)
      select_idx = random_num_per_grp_cumsumed(L)
      set_mask[select_idx] = True
      if axis==0:
          max_mask.T[max_mask.T] = set_mask
      else:
          max_mask[max_mask] = set_mask
      return max_mask.argmax(axis=axis)
    self.ensemble = argmax_randtie_masking_generic(self.meta_hyperedges.toarray(), axis=0)

  def mcla(self, times=False, partial_results=False, dtype=None):
    pr = []
    ts = []
    if times:
      ts.append(('Partitions', 0))
      begin = time.time()
    self.create_hypergraph()
    if times:
      end = time.time()
      ts.append(('Hypergraph', end-begin))
      start = time.time()
    mg_times = self.construct_metagraph(times)
    if times:
      end = time.time()
      ts.append(('Metagraph', end-start))
      ts.extend(mg_times)
      start = time.time()
    self.cluster_hyperedges()
    if times:
      end = time.time()
      ts.append(('Meta-Clusters', end-start))
      start = time.time()
    self.collapse_meta_clusters()
    if times:
      end = time.time()
      ts.append(('Meta-Hyperedges', end-start))
      start = time.time()
    self.compete_for_objects()
    if times:
      end = time.time()
      ts.append(('Ensemble', end-start))
      ts.append(('Total', end-begin))
    if partial_results:
      pr.append(('Partitions', self.partitions))
      pr.append(('Hypergraph', self.hypergraph.toarray()))
      pr.append(('Metagraph', nx.adjacency_matrix(self.metagraph).todense()))
      pr.append(('Meta-Clusters', self.meta_clusters.toarray()))
      pr.append(('Meta-Hyperedges', self.meta_hyperedges.toarray()))
      pr.append(('Ensemble', self.ensemble))
      pr.append(('Total', self.ensemble))
    if dtype is None:
      return self.ensemble, ts, pr
    else:
      return np.array(self.ensemble, dtype=dtype), ts, pr