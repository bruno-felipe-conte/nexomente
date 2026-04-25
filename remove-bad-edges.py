import json

# Read graph
with open('graphify-out/graph.json', 'rb') as f:
    content = f.read()
g = json.loads(content)

# Remove invalid edges from AIChatPage (6 total)
invalid_to_remove = [
    "AIChatPage()" + e['target'] for e in g['edges']
    if e['source'] == 'AIChatPage()' and e['target'] in [
        'useAIModel()', 'useAIChat()', 'useNotes()', 'getTemperature()'
    ]
]

# Remove notes->getModel  
invalid_to_remove.extend([e for e in g['edges'] 
                         if e['source'] == 'NotasPage()' and e['target'] == 'getModel()'])

print(f"Removing {len(invalid_to_remove)} invalid edges")

# Filter them out
g['edges'] = [e for e in g['edges'] if tuple(e) not in [(t, tuple(t)) for t in invalid_to_remove]]

# Write back
with open('graphify-out/graph.json', 'wb') as f:
    content = json.dumps(g, indent=2).encode()
    f.write(content)

print(f"New edge count: {len(g['edges'])}")
print("Done!")