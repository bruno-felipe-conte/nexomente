import json
from collections import Counter

with open('graphify-out/graph.json', 'rb') as f:
    g = json.load(f)
    
print("Keys:", list(g.keys())[:5])
print(f"Nodes sample: {g['nodes'][0] if g['nodes'] else 'empty'}")