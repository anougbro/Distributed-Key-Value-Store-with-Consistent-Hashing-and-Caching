# Quick Start Guide

## 🚀 Get Running in 3 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The app opens at `http://localhost:5173`

### 3. Explore the System

**First Time Users:**
1. Click **"Initialize Cluster (3 nodes)"**
2. Click **"Load Sample Data"**
3. Check the **"Overview"** tab for system status
4. Click on **"Nodes"** tab to see node details
5. Try the **"Hash Ring"** tab for visualization
6. Use **"Logs"** tab to see request history

**Try These Operations:**

```
SET: user:107:MyData
GET: user:101
```

**Simulate Failures:**
1. Go to **Nodes** tab
2. Click on a node card to select it
3. Click **"Simulate Failure"** to break it
4. Try GETting data (it still works via replicas!)
5. Click **"Recover"** to fix the node
6. Check **"Logs"** to see routing changes

**Scale the Cluster:**
1. Click **"+ Add Node"** several times
2. Watch data redistribution in real-time
3. New data spreads across all nodes
4. Old data is rebalanced automatically

## 📊 Understanding the Metrics

- **Active Nodes**: Number of healthy nodes in cluster
- **Total Data Items**: Keys stored in the system
- **Error Rate**: Percentage of failed requests
- **Cache Hits**: Successful retrieves from local caches
- **Hash Ring**: Visual map showing data distribution

## 🔑 Core Concepts

**Consistent Hashing**: Like a pizza cut into slices, each node gets a slice of the hash space. When you add/remove a node, only adjacent slices move.

**Replication**: Each data is copied to 2 nodes (by default). If one node dies, the other has your data.

**Caching**: Each node remembers recently accessed data locally, like a bookmark for fast access.

**Failure Handling**: When a node fails, requests automatically go to its replica. The user never notices!

## 📁 Project Files

- `src/kvstore.js` - Core distributed system logic
- `src/App.jsx` - React UI component
- `src/App.css` - Styling (use this to customize colors!)
- `index.html` - Web page template
- `package.json` - Dependencies list

## 🎯 Learning Paths

**Beginner**: Just click buttons and observe what happens

**Intermediate**: 
- Read the code in `kvstore.js`
- Understand the hash ring visualization
- Trace requests through the logs

**Advanced**:
- Modify cache size and observe effects
- Change replication factor in `App.jsx`
- Add custom data and observe distribution
- Study the consistent hashing algorithm

## 💡 Cool Things to Try

1. **Scale to 10 nodes** - See how data distributes evenly
2. **Fail 2 nodes at once** - System still works!
3. **Fail then recover nodes** - Watch request patterns change
4. **Add then remove nodes** - Observe minimal data movement
5. **Watch the hash ring** - See how nodes position themselves

## 🐛 Troubleshooting

**App won't start?**
```bash
npm install  # Make sure all packages installed
npm run dev  # Try again
```

**Port 5173 in use?**
Vite automatically tries the next port (5174, 5175, etc)

**No data showing?**
Click "Load Sample Data" after "Initialize Cluster"

## 📚 Next Steps

After exploring, try modifying:

1. **In `src/kvstore.js`**: Change virtual nodes count
   ```javascript
   this.virtualNodes = 320; // More virtual nodes = better balance
   ```

2. **In `src/App.jsx`**: Add more sample data
   ```javascript
   { key: 'mykey:1', value: 'myvalue' }
   ```

3. **In `src/App.css`**: Change colors
   ```css
   --primary: #your-color;
   ```

## 🎓 What You'll Learn

- How distributed databases work
- Why companies use consistent hashing
- How big data systems handle failures
- Why caching matters
- How to scale systems horizontally

**Enjoy exploring!** 🎉
