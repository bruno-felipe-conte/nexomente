$graph = Get-Content graphify-out/graph.json -Raw | ConvertFrom-Json

# Filter edges: remove 6 invalid inferred calls
$newEdges = $graph.edges | Where-Object {
    $_.source -ne "AIChatPage()" -or $_.target -notin @("useAIModel()", "useAIChat()", "useNotes()", "getTemperature()")
} | Where-Object {
    $_.source -ne "NotasPage()" -or $_.target -ne "getModel()"
}

$graph.edges = $newEdges
$graph | ConvertTo-Json 2>$null | Out-File graphify-out/graph.json -Encoding utf8

Write-Host "Cleaned! Kept $($newEdges.Count) edges from $($graph.edges.Count)"
