// Consistent Hashing Ring Implementation
// Uses MD5-like hashing for demonstration

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export class ConsistentHashRing {
  constructor(replicationFactor = 3) {
    this.ring = new Map(); // hash -> nodeId
    this.nodes = new Set();
    this.replicationFactor = replicationFactor;
    this.virtualNodes = 160; // virtual nodes per physical node
  }

  addNode(nodeId) {
    if (this.nodes.has(nodeId)) return;
    
    this.nodes.add(nodeId);
    
    // Add virtual nodes to the ring
    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualKey = `${nodeId}:${i}`;
      const hash = simpleHash(virtualKey);
      this.ring.set(hash, nodeId);
    }
  }

  removeNode(nodeId) {
    this.nodes.delete(nodeId);
    
    // Remove virtual nodes from the ring
    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualKey = `${nodeId}:${i}`;
      const hash = simpleHash(virtualKey);
      this.ring.delete(hash);
    }
  }

  getNode(key) {
    if (this.nodes.size === 0) return null;
    
    const hash = simpleHash(key);
    const sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);
    
    // Find the first hash >= key hash
    for (const h of sortedHashes) {
      if (h >= hash) {
        return this.ring.get(h);
      }
    }
    
    // Wrap around to the first node
    return this.ring.get(sortedHashes[0]);
  }

  getReplicaNodes(key) {
    if (this.nodes.size === 0) return [];
    
    const hash = simpleHash(key);
    const sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);
    
    const replicas = [];
    const seenNodes = new Set();
    let startIdx = sortedHashes.findIndex(h => h >= hash);
    if (startIdx === -1) startIdx = 0;
    
    for (let i = 0; i < sortedHashes.length && replicas.length < this.replicationFactor; i++) {
      const idx = (startIdx + i) % sortedHashes.length;
      const node = this.ring.get(sortedHashes[idx]);
      if (!seenNodes.has(node)) {
        replicas.push(node);
        seenNodes.add(node);
      }
    }
    
    return replicas;
  }

  getRingVisualization() {
    const sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);
    const nodePositions = {};
    
    sortedHashes.forEach((hash, index) => {
      const angle = (hash % 360);
      const node = this.ring.get(hash);
      if (!nodePositions[node]) {
        nodePositions[node] = [];
      }
      nodePositions[node].push(angle);
    });
    
    return { sortedHashes, nodePositions };
  }
}

export class LRUCache {
  constructor(maxSize = 100, ttlMs = 60000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map(); // key -> { value, timestamp, accessCount }
    this.accessOrder = [];
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    
    const entry = this.cache.get(key);
    
    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      return null;
    }
    
    // Update access info
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
    
    return entry.value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.accessOrder = this.accessOrder.filter(k => k !== key);
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      lastAccess: Date.now(),
      accessCount: 1
    });
    this.accessOrder.push(key);
    
    // Evict LRU entry if cache is full
    if (this.cache.size > this.maxSize) {
      const lruKey = this.accessOrder.shift();
      this.cache.delete(lruKey);
    }
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  getStats() {
    const now = Date.now();
    let validEntries = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp <= this.ttlMs) {
        validEntries++;
      }
    }
    
    return {
      size: this.cache.size,
      validEntries,
      maxSize: this.maxSize,
      utilization: Math.round((validEntries / this.maxSize) * 100)
    };
  }
}

export class DistributedNode {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.data = new Map(); // key -> value
    this.cache = new LRUCache(100, 60000);
    this.isHealthy = true;
    this.requestCount = 0;
    this.errorCount = 0;
  }

  get(key) {
    this.requestCount++;
    if (!this.isHealthy && Math.random() < 0.7) {
      this.errorCount++;
      throw new Error(`Node ${this.nodeId} is unavailable`);
    }
    
    // Try cache first
    const cached = this.cache.get(key);
    if (cached !== null) return { value: cached, fromCache: true };
    
    // Try storage
    if (this.data.has(key)) {
      const value = this.data.get(key);
      this.cache.set(key, value);
      return { value, fromCache: false };
    }
    
    return null;
  }

  set(key, value) {
    this.requestCount++;
    if (!this.isHealthy && Math.random() < 0.7) {
      this.errorCount++;
      throw new Error(`Node ${this.nodeId} is unavailable`);
    }
    
    this.data.set(key, value);
    this.cache.set(key, value);
  }

  delete(key) {
    this.data.delete(key);
    this.cache.cache.delete(key);
  }

  getStats() {
    return {
      nodeId: this.nodeId,
      dataSize: this.data.size,
      isHealthy: this.isHealthy,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? Math.round((this.errorCount / this.requestCount) * 100) : 0,
      cacheStats: this.cache.getStats()
    };
  }

  failNode() {
    this.isHealthy = false;
  }

  healNode() {
    this.isHealthy = true;
    this.errorCount = 0;
    this.requestCount = 0;
  }
}

export class DistributedKVStore {
  constructor(replicationFactor = 3) {
    this.ring = new ConsistentHashRing(replicationFactor);
    this.nodes = new Map(); // nodeId -> DistributedNode
    this.requestLog = [];
    this.maxLogSize = 100;
  }

  addNode(nodeId) {
    const node = new DistributedNode(nodeId);
    this.nodes.set(nodeId, node);
    this.ring.addNode(nodeId);
    this.logRequest(`Node ${nodeId} added to the cluster`, 'system');
  }

  removeNode(nodeId) {
    // Redistribute data from this node
    const node = this.nodes.get(nodeId);
    if (node) {
      for (const [key, value] of node.data.entries()) {
        this.set(key, value); // Will be re-distributed to other nodes
      }
    }
    
    this.nodes.delete(nodeId);
    this.ring.removeNode(nodeId);
    this.logRequest(`Node ${nodeId} removed from the cluster`, 'system');
  }

  set(key, value) {
    const replicaNodes = this.ring.getReplicaNodes(key);
    let successCount = 0;
    
    for (const nodeId of replicaNodes) {
      try {
        const node = this.nodes.get(nodeId);
        if (node) {
          node.set(key, value);
          successCount++;
        }
      } catch (error) {
        // Node failed, continue with other replicas
      }
    }
    
    this.logRequest(`SET ${key}`, 'write', successCount > 0);
    return successCount > 0;
  }

  get(key) {
    const replicaNodes = this.ring.getReplicaNodes(key);
    
    for (const nodeId of replicaNodes) {
      try {
        const node = this.nodes.get(nodeId);
        if (node) {
          const result = node.get(key);
          if (result) {
            this.logRequest(`GET ${key}`, 'read', true, nodeId, result.fromCache);
            return result.value;
          }
        }
      } catch (error) {
        // Try next replica
      }
    }
    
    this.logRequest(`GET ${key}`, 'read', false);
    return null;
  }

  delete(key) {
    const replicaNodes = this.ring.getReplicaNodes(key);
    let successCount = 0;
    
    for (const nodeId of replicaNodes) {
      try {
        const node = this.nodes.get(nodeId);
        if (node) {
          node.delete(key);
          successCount++;
        }
      } catch (error) {
        // Node failed, continue
      }
    }
    
    this.logRequest(`DELETE ${key}`, 'write', successCount > 0);
    return successCount > 0;
  }

  failNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.failNode();
      this.logRequest(`Node ${nodeId} FAILED`, 'system');
    }
  }

  healNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.healNode();
      this.logRequest(`Node ${nodeId} recovered`, 'system');
    }
  }

  logRequest(message, type = 'operation', success = true, nodeId = null, fromCache = false) {
    this.requestLog.push({
      timestamp: Date.now(),
      message,
      type,
      success,
      nodeId,
      fromCache
    });
    
    if (this.requestLog.length > this.maxLogSize) {
      this.requestLog.shift();
    }
  }

  getStats() {
    const nodeStats = Array.from(this.nodes.values()).map(node => node.getStats());
    const totalData = nodeStats.reduce((sum, stat) => sum + stat.dataSize, 0);
    const totalRequests = nodeStats.reduce((sum, stat) => sum + stat.requestCount, 0);
    const totalErrors = nodeStats.reduce((sum, stat) => sum + stat.errorCount, 0);
    
    return {
      nodeCount: this.nodes.size,
      totalDataItems: totalData,
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 100) : 0,
      nodeStats,
      replicationFactor: this.ring.replicationFactor,
      requestLog: this.requestLog
    };
  }
}
