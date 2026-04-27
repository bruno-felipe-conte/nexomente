#!/bin/bash
# Graphify auto-update hook for CI/CD
# Run this after significant code changes

set -e

GRAPHIFY_DIR="graphify-out"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔄 Checking for code changes..."

# Check if there are uncommitted changes
if [ -d "$PROJECT_ROOT/.git" ]; then
  git_status=$(cd "$PROJECT_ROOT" && git status --porcelain 2>/dev/null || echo "")
  if [ -n "$git_status" ]; then
    echo "📝 Uncommitted changes detected. Updating graph..."
    cd "$PROJECT_ROOT"
    
    # Run graphify if available
    if command -v graphify &> /dev/null; then
      graphify update .
      echo "✅ Knowledge graph updated"
    else
      echo "⚠️ graphify not found. Skipping update."
      echo "   Install: npm install -g graphify"
    fi
  else
    echo "✅ No changes to process"
  fi
fi

echo "📊 Graph stats:"
if [ -f "$PROJECT_ROOT/$GRAPHIFY_DIR/graph.json" ]; then
  nodes=$(cat "$PROJECT_ROOT/$GRAPHIFY_DIR/graph.json" | grep -o '"id"' | wc -l)
  edges=$(cat "$PROJECT_ROOT/$GRAPHIFY_DIR/graph.json" | grep -o '"from"' | wc -l)
  echo "   Nodes: $nodes"
  echo "   Edges: $edges"
fi

echo "Done."