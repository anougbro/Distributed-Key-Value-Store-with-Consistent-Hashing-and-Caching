# Distributed Key-Value Storage System

A React-based simulation of a distributed key-value storage system demonstrating consistent hashing, node replication, caching, and fault tolerance. Perfect for learning about distributed systems architecture.

## Features

### 1. **Consistent Hashing**
- Distributes data across nodes using a hash ring
- Virtual nodes (160 per physical node) ensure even distribution
- Minimal data movement when nodes join or leave the cluster
- Automatic key-to-node mapping

### 2. **Node Management**
- Add nodes dynamically to scale the cluster
- Remove nodes gracefully (data is redistributed)
- Visual representation of node distribution on the hash ring
- Real-time statistics per node

### 3. **Data Replication**
- Configurable replication factor (default: 2 replicas)
- Each key is stored on multiple nodes for availability
- Automatic read/write routing to replica nodes
- Failover to healthy replicas on node failure

### 4. **Caching Layer**
- LRU (Least Recently Used) cache per node
- Time-To-Live (TTL) support (60 seconds by default)
- Reduces data access latency
- Cache hit statistics tracking

### 5. **Failure Simulation**
- Simulate node failures with 70% error rate
- System continues to operate via replicas
- Recovery mechanism to bring failed nodes back online
- Real-time error rate tracking

### 6. **System Transparency**
- Users interact with a single KV interface
- Node-level complexity is hidden
- Consistent read/write behavior despite node failures
- Request routing handled automatically

## Project Structure

```
distributed-kvstore/
├── src/
│   ├── main.jsx           # React entry point
│   ├── App.jsx            # Main React component
│   ├── App.css            # Styling
│   ├── index.css          # Global styles
│   ├── kvstore.js         # Core distributed system logic
│   │   ├── ConsistentHashRing    # Hashing algorithm
│   │   ├── LRUCache              # Cache implementation
│   │   ├── DistributedNode       # Single node storage
│   │   └── DistributedKVStore    # Main system orchestrator
├── index.html             # HTML template
├── vite.config.js         # Vite configuration
├── package.json           # Dependencies
└── README.md             # This file
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Steps

1. **Extract the project**
```bash
unzip distributed-kvstore.zip
cd distributed-kvstore
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm run dev
```

The application will open automatically in your browser at `http://localhost:5173`

4. **Build for production**
```bash
npm run build
```

## Usage Guide

### Getting Started

1. Click **"Initialize Cluster (3 nodes)"** to create the initial cluster
2. Click **"Load Sample Data"** to populate with sample user data
3. Explore the different tabs to understand the system

### Tabs Overview

#### Overview
- **Overview Tab**: System-wide statistics
  - Active nodes count
  - Total data items stored
  - Request count and error rate
  - Replication factor
  - Understanding of how the system works

#### Nodes
- **Nodes Tab**: Per-node details
  - Data count per node
  - Request/error statistics
  - Cache utilization
  - Node health status
  - Actions: Simulate failure, recover, or remove nodes

#### Hash Ring
- **Hash Ring Tab**: Visual representation
  - Consistent hash ring with node positions
  - Distribution visualization
  - Hash position indicators
  - Ring statistics

#### Logs
- **Logs Tab**: Request history
  - All operations logged with timestamps
  - Cache hits/misses
  - Node-specific routing information
  - Success/failure indicators

### Operations

#### SET Operation
```
Input: user:107:John
Click: SET
```
Stores a key-value pair across replica nodes.

#### GET Operation
```
Input: user:101
Click: GET
```
Retrieves a value from the nearest available replica.

#### Add Node
Click the **"+ Add Node"** button to dynamically add capacity to the cluster. Data is automatically redistributed.

#### Simulate Failure
1. Click on a node card to select it
2. Click **"Simulate Failure"** to make it unavailable
3. Observe system continues operating via replicas
4. Click **"Recover"** to bring the node back online

#### Remove Node
Click **"Remove"** on any node to permanently remove it from the cluster and redistribute its data.

## Sample Data

The system comes with pre-loaded sample data:

```
user:101 -> {"name": "Alice"}
user:102 -> {"name": "Bob"}
user:103 -> {"name": "Charlie"}
user:104 -> {"name": "Diana"}
user:105 -> {"name": "Eve"}
user:106 -> {"name": "Frank"}
```

## System Architecture

### Consistent Hashing Algorithm

The system uses a hash ring with virtual nodes:

1. **Physical Nodes**: Actual servers in the cluster (Node-1, Node-2, etc.)
2. **Virtual Nodes**: Each physical node creates 160 virtual nodes on the ring
3. **Hash Function**: Simple MD5-like hash algorithm
4. **Key Distribution**: Keys are hashed and assigned to the nearest node on the ring

**Benefits:**
- When a node is removed, only ~1/n of keys need redistribution
- When a node is added, only ~1/n keys are moved to it
- Uniform distribution across nodes

### Replication Strategy

With replication factor of 2:
- Each key is stored on the target node + 1 replica node
- On read: Try primary, fall back to replica if unavailable
- On write: Write to both primary and replica
- On node failure: Replicas ensure data availability

### LRU Cache

Each node maintains a local LRU cache:
- **Max Size**: 100 entries per node
- **TTL**: 60 seconds
- **Eviction**: When full, least recently used item is removed
- **Benefits**: Reduces disk/network I/O, improves performance

### Failure Handling

When a node fails:
1. 70% of requests to that node fail
2. System automatically routes to replica nodes
3. Failures are logged with timestamps
4. Error rate is tracked
5. Node recovery is manual (click "Recover" button)

## Performance Considerations

### Scalability
- Consistent hashing allows linear scaling
- Adding nodes requires minimal data movement
- System can handle thousands of keys

### Availability
- Replication ensures service availability
- Multiple failures can be tolerated (depending on replication factor)
- Graceful degradation under failures

### Latency
- Local cache reduces access latency
- Hash-based routing is O(log n) with virtual nodes
- TTL prevents stale data

## Educational Value

This project demonstrates:

1. **Distributed Systems Concepts**
   - Horizontal scaling
   - Data replication
   - Fault tolerance

2. **Consistent Hashing**
   - Ring-based partitioning
   - Virtual nodes for uniform distribution
   - Minimal redistribution on topology changes

3. **Caching Strategies**
   - LRU eviction policy
   - TTL-based expiration
   - Cache hit/miss tracking

4. **System Design**
   - Transparency (hiding complexity)
   - Availability (replication)
   - Partition tolerance (failure handling)

5. **React & Frontend**
   - State management with hooks
   - Real-time visualization
   - Interactive system simulation

## Real-World Applications

This architecture is used in:
- **Memcached**: Distributed memory caching
- **Redis Cluster**: In-memory data store
- **Cassandra**: NoSQL database
- **DynamoDB**: AWS key-value service
- **Couchbase**: Distributed database

## API Reference

### DistributedKVStore

```javascript
// Create store
const store = new DistributedKVStore(replicationFactor);

// Add/remove nodes
store.addNode(nodeId);
store.removeNode(nodeId);

// Operations
store.set(key, value);  // returns boolean (success)
const value = store.get(key);  // returns value or null
store.delete(key);  // returns boolean (success)

// Failure simulation
store.failNode(nodeId);
store.healNode(nodeId);

// Statistics
const stats = store.getStats();

// Request logging
store.requestLog;
```

### DistributedNode

```javascript
// Per-node operations
node.get(key);    // returns {value, fromCache}
node.set(key, value);
node.delete(key);
node.failNode();
node.healNode();
node.getStats();
```

### LRUCache

```javascript
// Cache operations
cache.get(key);   // returns value or null
cache.set(key, value);
cache.clear();
cache.getStats(); // returns cache statistics
```

## Customization

### Change Replication Factor
In `src/App.jsx`, line where DistributedKVStore is created:
```javascript
const [store] = useState(() => new DistributedKVStore(3)); // 3 replicas
```

### Adjust Virtual Nodes
In `src/kvstore.js`, ConsistentHashRing constructor:
```javascript
this.virtualNodes = 320; // increase for better distribution
```

### Modify Cache Settings
In `src/kvstore.js`, LRUCache constructor:
```javascript
constructor(maxSize = 200, ttlMs = 120000) // 200 size, 2min TTL
```

### Add Sample Data
Edit the `SAMPLE_DATA` array in `src/App.jsx` to add more keys.

## Troubleshooting

### Port Already in Use
If port 5173 is in use, Vite will automatically use the next available port.

### Cache Not Working
- Ensure requests are actually hitting cached data
- Check the cache hit indicator in logs (💾 CACHE)
- TTL is 60 seconds; data older than that is evicted

### Node Not Responding
- This is expected when simulating failure
- Data is still available from replica nodes
- Click "Recover" to bring the node back online

## Performance Tips

1. **For Large Datasets**: Increase virtual nodes for better distribution
2. **For High Throughput**: Increase cache size per node
3. **For Reliability**: Increase replication factor
4. **For Speed**: Decrease TTL to keep cache fresher

## License

This educational project is provided as-is for learning purposes.

## Further Learning

### Recommended Reading
- "Designing Data-Intensive Applications" by Martin Kleppmann
- Consistent Hashing papers and resources
- Redis Architecture documentation
- Cassandra's consistent hashing implementation

### Next Steps
- Add persistence layer (localStorage simulation)
- Implement read repair for consistency
- Add leader election algorithm
- Implement CRDT data structures
- Add distributed transaction support

## Support & Questions

This is a complete, self-contained educational project. Experiment freely with:
- Node counts and failure patterns
- Replication factors
- Cache sizes
- Data sizes

Observe how the system behaves under different conditions and understand the trade-offs in distributed systems design.

---

**Happy learning!** 🚀
#   D i s t r i b u t e d - K e y - V a l u e - S t o r e - w i t h - C o n s i s t e n t - H a s h i n g - a n d - C a c h i n g  
 