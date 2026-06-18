# Distributed KV Store - Architecture Documentation

## System Overview

This distributed key-value storage system implements a production-inspired architecture with four core components:

```
┌─────────────────────────────────────────────────────────┐
│                    React UI Layer                       │
│         (Visualization & User Interaction)              │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│              DistributedKVStore                         │
│     (Main orchestrator - handles routing & replication) │
└────────┬────────────────────┬───────────────────────────┘
         │                    │
    ┌────▼────┐          ┌────▼────┐
    │ConsistentHashRing  │NodeManager
    │(hash-based routing)│(node list)
    └─────────────────────────────────┘
         │                    │
    ┌────▼──────────────────▼──────┐
    │   DistributedNode (×N)       │
    │ ┌──────────────────────────┐ │
    │ │ Actual Data Storage      │ │
    │ │ (key-value map)          │ │
    │ │                          │ │
    │ │ ┌────────────────────┐   │ │
    │ │ │  LRU Cache        │   │ │
    │ │ │  (TTL + LRU)      │   │ │
    │ │ └────────────────────┘   │ │
    │ └──────────────────────────┘ │
    │                               │
    │ Status: Healthy/Failed        │
    │ Stats: Requests, Errors       │
    └───────────────────────────────┘
```

## Component Details

### 1. ConsistentHashRing

**Purpose**: Map keys to nodes using consistent hashing

**Algorithm**:
```
1. Create hash ring (0 to 2^32)
2. For each physical node:
   - Create 160 virtual nodes
   - Hash each virtual node: hash("Node-1:0"), hash("Node-1:1"), ...
   - Place on the ring
3. To find node for key:
   - hash(key)
   - Find first node >= this hash on the ring
   - If none found, wrap to start
4. For replication:
   - Get primary node
   - Get next 1, 2, 3... nodes on the ring
   - Use first unique physical nodes as replicas
```

**Key Properties**:
- **O(log n)** lookup time with sorted hashes
- **Minimal redistribution** on node join/leave
- **Virtual nodes** ensure uniform distribution
- **Replication factor** configurable (default: 2)

**Data Structures**:
```javascript
{
  ring: Map<hash, nodeId>,          // All 160*N virtual nodes
  nodes: Set<nodeId>,               // Physical nodes
  replicationFactor: number,         // Replicas per key
  virtualNodes: number              // 160 by default
}
```

### 2. LRUCache

**Purpose**: Fast access to recently used keys with automatic expiration

**Mechanics**:
```
┌─ Access Key ─┐
│              ▼
│         In Cache?
│           │   │
│         No│   │Yes
│           │   ├─ Check TTL
│           │   │  ├─ Expired? Delete
│           │   │  └─ Valid? Return
│           │   │
│           └──┬┘
│              │
│              ▼
│         Return Value
│              &
│         Move to End
│         (Most Recent)
│              │
│              ▼
│         Cache Full?
│              │
│            Yes├─ Remove Front
│              │  (Least Recent)
│            No│
│              └─ Done
```

**Implementation**:
- Cache: `Map<key, {value, timestamp, accessCount, lastAccess}>`
- Access Order: `Array<key>` (push to end, shift from front)
- TTL: Check `Date.now() - timestamp > ttlMs`
- Eviction: Remove least recently used when full

**Performance**:
- GET: O(1) + TTL check
- SET: O(1) + potential LRU eviction
- CLEAR: O(1)

### 3. DistributedNode

**Purpose**: Individual storage node with local cache and failure simulation

**Structure**:
```javascript
DistributedNode {
  nodeId: "Node-1"
  data: Map<key, value>              // Actual persistent storage
  cache: LRUCache                    // Fast lookup layer
  isHealthy: boolean                 // Failure flag
  requestCount: number               // Statistics
  errorCount: number                 // Failed requests
}
```

**Operations**:
- **GET**: Try cache first → try storage → return null
- **SET**: Write to storage + cache
- **DELETE**: Remove from storage and cache
- **FAILURE**: Random 70% of requests fail until recovered

**Failure Model**:
```
if (!isHealthy && Math.random() < 0.7) {
  throw Error("Node unavailable")
}
```

### 4. DistributedKVStore

**Purpose**: Main API and orchestrator

**Public API**:
```javascript
interface DistributedKVStore {
  // Cluster management
  addNode(nodeId: string): void
  removeNode(nodeId: string): void
  
  // Data operations (replicated)
  set(key: string, value: string): boolean
  get(key: string): string | null
  delete(key: string): boolean
  
  // Failure simulation
  failNode(nodeId: string): void
  healNode(nodeId: string): void
  
  // Monitoring
  getStats(): SystemStats
}
```

**Operation Flow**:

**SET Operation**:
```
SET(key, value)
  │
  ├─ GetReplicaNodes(key) via ConsistentHashRing
  │  └─ Returns [Node-1, Node-2]
  │
  ├─ Try write to Node-1
  │  ├─ Success? successCount++
  │  └─ Fail? Continue
  │
  ├─ Try write to Node-2
  │  ├─ Success? successCount++
  │  └─ Fail? Continue
  │
  └─ Return (successCount > 0)  // At least one succeeded
```

**GET Operation**:
```
GET(key)
  │
  ├─ GetReplicaNodes(key)
  │  └─ Returns [Node-1, Node-2]
  │
  ├─ Try Node-1
  │  ├─ Success? Return value
  │  └─ Fail? Try next
  │
  ├─ Try Node-2
  │  ├─ Success? Return value
  │  └─ Fail? Try next
  │
  └─ Return null (Not found)
```

**Node Join**:
```
AddNode("Node-4")
  │
  ├─ Create DistributedNode("Node-4")
  ├─ Add 160 virtual nodes to hash ring
  ├─ New keys hash to Node-4
  └─ Old keys remain on original nodes
     (No redistribution needed yet)
```

**Node Leave**:
```
RemoveNode("Node-1")
  │
  ├─ Iterate all data on Node-1
  ├─ RE-SET each key
  │  └─ Goes to new primary via hash ring
  │
  ├─ Remove from ring
  │
  └─ Result: Data redistributed to healthy nodes
```

**Node Failure**:
```
FailNode("Node-2")
  │
  ├─ Mark isHealthy = false
  │
  ├─ GET requests:
  │  ├─ Try Node-2 → Fail (70% rate)
  │  └─ Automatically try Node-3
  │
  ├─ SET requests:
  │  ├─ Try Node-2 → Fail
  │  ├─ Try Node-3 → Success (enough replicas)
  │  └─ Return true
  │
  └─ System continues operating!
```

## Data Flow Examples

### Example 1: Setting user:101 with Replication=2

```
INPUT: SET("user:101", '{"name":"Alice"}')
       
Consistent Hash Ring: Node-1, Node-2, Node-3

STEP 1: Hash the key
   hash("user:101") = 847291847

STEP 2: Find replica nodes
   Sorted hashes on ring: [100, 500, 900, 1200, ...]
   847291847 % 360 = 127 degrees
   Find >= 127: Node-1(100°), Node-2(300°)
   → Replicas: [Node-1, Node-2]

STEP 3: Write to Node-1
   Node-1.data["user:101"] = '{"name":"Alice"}'
   Node-1.cache.set("user:101", '...')
   ✓ Success

STEP 4: Write to Node-2
   Node-2.data["user:101"] = '{"name":"Alice"}'
   Node-2.cache.set("user:101", '...')
   ✓ Success

RESULT: Both replicas have the data
        System returns: true (success)
        Durability: Can survive 1 node failure
```

### Example 2: Getting user:101 when Node-1 is down

```
INPUT: GET("user:101")
       Node-1 is failed (isHealthy=false)

STEP 1: Hash and find replicas
   hash("user:101") = 847291847
   Replicas: [Node-1, Node-2]

STEP 2: Try Node-1
   node1.isHealthy = false
   Math.random() < 0.7? YES → throw Error
   ✗ Node-1 unavailable

STEP 3: Try Node-2
   node2.isHealthy = true
   Check cache first:
     node2.cache.get("user:101")
     Found! And not expired
     ✓ Return from cache (FAST!)
     Log: "GET user:101 [read] Node-2 💾CACHE"

RESULT: User gets data from Node-2
        Sub-millisecond latency (from cache)
        System transparent about node failure
        User never knows Node-1 is down!
```

## Consistency & Availability Trade-offs

### Write Consistency
- **Write to multiple replicas**: Eventual consistency
- If write to primary succeeds but replica fails:
  - Read might get stale data temporarily
  - No rollback mechanism (simple design)
- For strong consistency, need read-repair or vector clocks

### Read Availability
- **Always try primary first**: Fast path
- **Fall back to replicas**: Handles failures
- **Cache provides locality**: Reduces latency
- With 2 replicas: 1 node can fail

### Failure Scenarios

| Scenario | Replicas | Result |
|----------|----------|--------|
| 0 nodes down | 2 | ✓ Fast, replicated |
| 1 node down | 2 | ✓ Works, slower (use replica) |
| 2 nodes down | 2 | ✗ Data lost |
| 2 nodes down | 3 | ✓ Still works |

## Performance Characteristics

### Time Complexity
- **Hash ring lookup**: O(log n) - binary search on sorted hashes
- **Cache lookup**: O(1) - map access
- **Node failure**: O(1) - just toggle flag
- **Replicas**: O(replication_factor) - try each replica

### Space Complexity
- **Ring**: O(n * virtual_nodes) - stores positions
- **Data**: O(keys) - one per unique key across system
- **Cache**: O(n * cache_size) - per node local cache
- **Replication**: O(keys * replication_factor) - multiple copies

### Network I/O
- **GET**: 1 round-trip (primary) or 2+ if failures
- **SET**: multiple round-trips (all replicas)
- **Cache hits**: 0 network I/O
- **Failure**: Retries increase latency

## Scalability

### Horizontal Scaling
- Add nodes: No data reshuffling of existing keys
  - New keys go to new nodes
  - ~1/n percent of new data goes to each new node
  
- Remove nodes: Only their keys redistributed
  - ~1/n keys move per removed node
  - Other keys stay in place

### Resource Scaling
- Cache size: Adjust per-node cache capacity
- Replication: Trade availability for storage
- Virtual nodes: Trade memory for distribution uniformity

## Security Considerations

**Not implemented** (educational purposes):
- No authentication/authorization
- No encryption in transit
- No data validation
- No rate limiting

**In production**, add:
- TLS for network communication
- Authentication (tokens, certs)
- Authorization (ACLs)
- Data validation and sanitization
- Rate limiting per client

## Testing Strategy

**Manual Tests** (in the UI):
1. Create 3-node cluster
2. Add data systematically
3. Verify distribution via hash ring
4. Fail random node
5. Verify reads still work
6. Add new node
7. Verify data balancing

**Automated Tests** (would add):
```javascript
// Test cases
- Test hash ring consistency
- Test data replication
- Test failover logic
- Test cache expiration
- Test node join/leave
- Test concurrent operations
```

## Future Improvements

1. **Persistence**: Save to IndexedDB in browser
2. **Replication Sync**: Background sync of replicas
3. **Read Repair**: Fix inconsistencies on read
4. **Quorum Reads**: Trade consistency for availability
5. **Vector Clocks**: Track causality
6. **Anti-entropy**: Background healing
7. **Bloom Filters**: Reduce unnecessary lookups
8. **Compression**: Reduce storage/network
9. **Key Expiration**: TTL per key (not just cache)
10. **Monitoring**: Real-time metrics dashboard

## Production References

This system is inspired by:
- **Memcached**: Consistent hashing, distributed caching
- **Redis Cluster**: Hash slots, replicas, failover
- **Cassandra**: Token ring, multi-node replication
- **DynamoDB**: Replication, caching, fault tolerance
- **Couchbase**: Node distribution, caching

---

*This architecture balances simplicity with realism, making it ideal for learning distributed systems principles.*
