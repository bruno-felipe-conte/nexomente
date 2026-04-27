import json

with open('graphify-out/graph.json', 'rb') as f:
    data = f.read()

# Remove BOM and normalize line endings
clean_data = data.replace(b'\xef\xbb\xbf', b'').replace(b'\r\n', b'\n')

g = json.loads(clean_data)

print(f"Original: {len(g['nodes'])} nodes, {len(g['links'])} links")

# Remove bad edges from AIChatPage
bad_edges = []
for l in g['links']:
    source = l.get('source', '')
    target = l.get('target', '')
    if source == 'AIChatPage()' and \
       target in ['useAIModel()', 'useAIChat()', 'useNotes()', 'getTemperature()']:
        bad_edges.append((source, target))
    
print(f"Removing {len(bad_edges)} AIChatPage bad edges")

# Remove NotasPage -> getModel  
bad2 = []
for l in g['links']:
    source = l.get('source', '')
    target = l.get('target', '')
    if source == 'NotasPage()' and target == 'getModel()':
        bad2.append((source, target))
        
print(f"Removing {len(bad2)} NotasPage->getModel edges")

# Deduplicate bad edges as tuples to avoid duplicates
bad_edge_tuple_set = set(bad_edges + bad2)
g['links'] = [l for l in g['links'] if tuple(l) not in bad_edge_tuple_set]

print(f"Final edge count: {len(g['links'])}")

# Write back clean JSON
write = json.dumps(g, indent=2).encode('utf-8')
with open('graphify-out/graph.json', 'wb') as f:
    f.write(write)

print("Fixed!")