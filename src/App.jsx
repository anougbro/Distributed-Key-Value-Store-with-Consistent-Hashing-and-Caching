import React, { useState, useCallback, useMemo } from 'react';
import { DistributedKVStore } from './kvstore';
import './App.css';

const SAMPLE_DATA = [
  { key: 'user:101', value: JSON.stringify({ name: 'Alice' }) },
  { key: 'user:102', value: JSON.stringify({ name: 'Bob' }) },
  { key: 'user:103', value: JSON.stringify({ name: 'Charlie' }) },
  { key: 'user:104', value: JSON.stringify({ name: 'Diana' }) },
  { key: 'user:105', value: JSON.stringify({ name: 'Eve' }) },
  { key: 'user:106', value: JSON.stringify({ name: 'Frank' }) }
];

function App() {
  const [store] = useState(() => new DistributedKVStore(2));
  const [stats, setStats] = useState(store.getStats());
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedNode, setSelectedNode] = useState(null);

  const updateStats = useCallback(() => {
    setStats(store.getStats());
  }, [store]);

  const initializeCluster = useCallback(() => {
    for (let i = 0; i < 3; i++) {
      store.addNode(`Node-${i + 1}`);
    }
    SAMPLE_DATA.forEach(({ key, value }) => {
      store.set(key, value);
    });
    updateStats();
  }, [store, updateStats]);

  const addNode = useCallback(() => {
    const nodeId = `Node-${stats.nodeCount + 1}`;
    store.addNode(nodeId);
    updateStats();
  }, [store, stats.nodeCount, updateStats]);

  const removeNode = useCallback((nodeId) => {
    store.removeNode(nodeId);
    updateStats();
  }, [store, updateStats]);

  const simulateFailure = useCallback((nodeId) => {
    store.failNode(nodeId);
    updateStats();
  }, [store, updateStats]);

  const recoverNode = useCallback((nodeId) => {
    store.healNode(nodeId);
    updateStats();
  }, [store, updateStats]);

  const handleSetData = useCallback(() => {
    if (input.trim()) {
      const [key, value] = input.split(':').map(s => s.trim());
      if (key && value) {
        store.set(key, value);
        setInput('');
        updateStats();
      }
    }
  }, [input, store, updateStats]);

  const handleGetData = useCallback(() => {
    if (input.trim()) {
      const value = store.get(input.trim());
      if (value) {
        alert(`Value: ${value}`);
      } else {
        alert('Key not found');
      }
      updateStats();
    }
  }, [input, store, updateStats]);

  const handleLoadSampleData = useCallback(() => {
    SAMPLE_DATA.forEach(({ key, value }) => {
      store.set(key, value);
    });
    updateStats();
  }, [store, updateStats]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Distributed Key-Value Storage</h1>
        <p className="subtitle">Consistent Hashing with Replication & Caching</p>
      </header>

      <div className="controls-section">
        <div className="button-group">
          <button className="btn btn-primary" onClick={initializeCluster}>
            Initialize Cluster (3 nodes)
          </button>
          <button className="btn btn-secondary" onClick={handleLoadSampleData}>
            Load Sample Data
          </button>
          <button className="btn btn-success" onClick={addNode}>
            + Add Node
          </button>
        </div>

        <div className="input-group">
          <input
            type="text"
            placeholder="Key:Value (for SET) or Key (for GET)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSetData()}
          />
          <button className="btn btn-info" onClick={handleSetData}>
            SET
          </button>
          <button className="btn btn-info" onClick={handleGetData}>
            GET
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'nodes' ? 'active' : ''}`}
          onClick={() => setActiveTab('nodes')}
        >
          Nodes
        </button>
        <button
          className={`tab-btn ${activeTab === 'ring' ? 'active' : ''}`}
          onClick={() => setActiveTab('ring')}
        >
          Hash Ring
        </button>
        <button
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Logs
        </button>
      </div>

      <div className="content-area">
        {activeTab === 'overview' && (
          <OverviewTab stats={stats} nodeCount={stats.nodeCount} />
        )}
        {activeTab === 'nodes' && (
          <NodesTab
            stats={stats}
            onFailNode={simulateFailure}
            onRecoverNode={recoverNode}
            onRemoveNode={removeNode}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
          />
        )}
        {activeTab === 'ring' && <HashRingTab store={store} stats={stats} />}
        {activeTab === 'logs' && <LogsTab requestLog={stats.requestLog} />}
      </div>
    </div>
  );
}

function OverviewTab({ stats, nodeCount }) {
  return (
    <div className="tab-content">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Active Nodes</div>
          <div className="stat-value">{stats.nodeCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Data Items</div>
          <div className="stat-value">{stats.totalDataItems}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Requests</div>
          <div className="stat-value">{stats.totalRequests}</div>
        </div>
        <div className="stat-card error">
          <div className="stat-label">Error Rate</div>
          <div className="stat-value">{stats.errorRate}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Replication Factor</div>
          <div className="stat-value">{stats.replicationFactor}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failed Errors</div>
          <div className="stat-value">{stats.totalErrors}</div>
        </div>
      </div>

      <div className="info-box">
        <h3>System Overview</h3>
        <ul>
          <li>
            <strong>Consistent Hashing:</strong> Data is distributed across nodes using a hash ring with virtual nodes.
            Minimal data movement when nodes join or leave.
          </li>
          <li>
            <strong>Replication:</strong> Each key is replicated across {stats.replicationFactor} nodes for availability.
          </li>
          <li>
            <strong>Caching:</strong> LRU cache with TTL (60s) on each node reduces data access latency.
          </li>
          <li>
            <strong>Fault Tolerance:</strong> If a node fails, requests are automatically routed to replica nodes.
          </li>
          <li>
            <strong>Transparency:</strong> Users interact with a single KV interface; node complexity is hidden.
          </li>
        </ul>
      </div>
    </div>
  );
}

function NodesTab({ stats, onFailNode, onRecoverNode, onRemoveNode, selectedNode, onSelectNode }) {
  return (
    <div className="tab-content">
      <div className="nodes-grid">
        {stats.nodeStats.map((nodeStats) => (
          <div
            key={nodeStats.nodeId}
            className={`node-card ${!nodeStats.isHealthy ? 'failed' : ''} ${
              selectedNode === nodeStats.nodeId ? 'selected' : ''
            }`}
            onClick={() => onSelectNode(nodeStats.nodeId)}
          >
            <div className="node-header">
              <h4>{nodeStats.nodeId}</h4>
              <span className={`status-badge ${nodeStats.isHealthy ? 'healthy' : 'failed'}`}>
                {nodeStats.isHealthy ? '🟢 Healthy' : '🔴 Failed'}
              </span>
            </div>

            <div className="node-stats">
              <div className="node-stat-row">
                <span>Data Items:</span>
                <strong>{nodeStats.dataSize}</strong>
              </div>
              <div className="node-stat-row">
                <span>Requests:</span>
                <strong>{nodeStats.requestCount}</strong>
              </div>
              <div className="node-stat-row">
                <span>Errors:</span>
                <strong>{nodeStats.errorCount}</strong>
              </div>
              <div className="node-stat-row">
                <span>Error Rate:</span>
                <strong>{nodeStats.errorRate}%</strong>
              </div>
              <div className="divider" />
              <div className="cache-stats">
                <div className="stat-row">
                  <span>Cache Hit Rate:</span>
                  <strong>
                    {nodeStats.cacheStats.validEntries}/{nodeStats.cacheStats.maxSize}
                  </strong>
                </div>
                <div className="stat-row">
                  <span>Utilization:</span>
                  <strong>{nodeStats.cacheStats.utilization}%</strong>
                </div>
              </div>
            </div>

            <div className="node-actions">
              {nodeStats.isHealthy ? (
                <button
                  className="btn btn-small btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFailNode(nodeStats.nodeId);
                  }}
                >
                  Simulate Failure
                </button>
              ) : (
                <button
                  className="btn btn-small btn-success"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRecoverNode(nodeStats.nodeId);
                  }}
                >
                  Recover
                </button>
              )}
              <button
                className="btn btn-small btn-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveNode(nodeStats.nodeId);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {stats.nodeStats.length === 0 && (
        <div className="empty-state">
          <p>No nodes in the cluster. Click "Initialize Cluster" to start.</p>
        </div>
      )}
    </div>
  );
}

function HashRingTab({ store, stats }) {
  const { sortedHashes, nodePositions } = store.ring.getRingVisualization();

  return (
    <div className="tab-content">
      <div className="hash-ring-container">
        <svg className="hash-ring" viewBox="0 0 600 600">
          {/* Ring circle */}
          <circle cx="300" cy="300" r="200" fill="none" stroke="#e0e0e0" strokeWidth="2" />
          <circle cx="300" cy="300" r="180" fill="none" stroke="#f0f0f0" strokeWidth="1" strokeDasharray="5,5" />

          {/* Grid lines */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x2 = 300 + 200 * Math.cos(rad);
            const y2 = 300 + 200 * Math.sin(rad);
            return (
              <line
                key={`grid-${angle}`}
                x1="300"
                y1="300"
                x2={x2}
                y2={y2}
                stroke="#f5f5f5"
                strokeWidth="1"
              />
            );
          })}

          {/* Hash positions */}
          {sortedHashes.slice(0, 50).map((hash, idx) => {
            const angle = (hash % 360);
            const rad = (angle * Math.PI) / 180;
            const x = 300 + 190 * Math.cos(rad);
            const y = 300 + 190 * Math.sin(rad);
            const nodeId = store.ring.ring.get(hash);
            const nodeColor = getNodeColor(nodeId);

            return (
              <circle
                key={`hash-${hash}`}
                cx={x}
                cy={y}
                r="3"
                fill={nodeColor}
                opacity="0.6"
              />
            );
          })}

          {/* Node positions (larger circles) */}
          {Array.from(store.nodes.keys()).map((nodeId, idx) => {
            const angles = nodePositions[nodeId] || [];
            const avgAngle =
              angles.length > 0
                ? angles.reduce((a, b) => a + b, 0) / angles.length
                : (idx * 360) / store.nodes.size;
            const rad = (avgAngle * Math.PI) / 180;
            const x = 300 + 200 * Math.cos(rad);
            const y = 300 + 200 * Math.sin(rad);
            const nodeColor = getNodeColor(nodeId);
            const node = store.nodes.get(nodeId);

            return (
              <g key={`node-${nodeId}`}>
                <circle cx={x} cy={y} r="15" fill={nodeColor} opacity="0.3" stroke={nodeColor} strokeWidth="2" />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dy="0.3em"
                  className="node-label"
                  fill={nodeColor}
                  fontSize="10"
                  fontWeight="bold"
                >
                  {nodeId.split('-')[1]}
                </text>
                {!node?.isHealthy && (
                  <text x={x + 12} y={y - 12} className="failure-indicator" fontSize="16">
                    ⚠️
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="ring-stats">
        <h3>Hash Ring Statistics</h3>
        <p>Total hash positions: {sortedHashes.length}</p>
        <p>Virtual nodes per physical node: {store.ring.virtualNodes}</p>
        <p>Active physical nodes: {store.nodes.size}</p>
      </div>
    </div>
  );
}

function LogsTab({ requestLog }) {
  return (
    <div className="tab-content">
      <div className="logs-container">
        <h3>Request Log (Last {requestLog.length} requests)</h3>
        <div className="logs-list">
          {requestLog.length === 0 ? (
            <p className="empty-message">No requests yet</p>
          ) : (
            requestLog
              .slice()
              .reverse()
              .map((log, idx) => (
                <div
                  key={idx}
                  className={`log-entry ${log.type} ${log.success ? 'success' : 'error'} ${
                    log.fromCache ? 'cached' : ''
                  }`}
                >
                  <span className="log-time">{formatTime(log.timestamp)}</span>
                  <span className={`log-type ${log.type}`}>[{log.type.toUpperCase()}]</span>
                  <span className="log-message">{log.message}</span>
                  {log.nodeId && <span className="log-node">{log.nodeId}</span>}
                  {log.fromCache && <span className="log-cache">💾 CACHE</span>}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

function getNodeColor(nodeId) {
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const index = parseInt(nodeId.split('-')[1]) - 1;
  return colors[index % colors.length];
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

export default App;
