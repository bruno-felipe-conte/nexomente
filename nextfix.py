import json

with open('graphify-out/graph.json') as f:
    g = json.load(f)

edges_to_keep = []
invalid_targets_for_AIChat = ["useAIModel()", "useAIChat()", "useNotes()", "getTemperature()"]

for edge in g['edges']:
    src, tgt = edge['source'], edge['target']
    
    if src == "AIChatPage()" and tgt in invalid_targets_for_AIChat:
        continue
    
    if src == "NotasPage()" and tgt == "getModel()":
        continue
    
    edges_to_keep.append(edge)

g['edges'] = edges_to_keep
with open('graphify-out/graph.json', 'w') as f:
    json.dump(g, f)

print(f"Kept {len(edges_to_keep)} edges from {len(g['edges'])}")