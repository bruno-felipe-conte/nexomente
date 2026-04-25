const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('reports/eslint-report.json'));
const files = data.filter(f => f.messages.some(m => m.ruleId === 'react/prop-types'));

files.forEach(f => {
  let content = fs.readFileSync(f.filePath, 'utf-8');
  const propsSet = new Set();
  
  f.messages.filter(m => m.ruleId === 'react/prop-types').forEach(m => {
    const match = m.message.match(/'([^']+)' is missing/);
    if (match) {
        const propName = match[1].split('.')[0]; // Handle nested like msg.role -> msg
        propsSet.add(propName);
    }
  });

  if (propsSet.size === 0) return;

  // Add import PropTypes from 'prop-types'; if not exists
  if (!content.includes("from 'prop-types'") && !content.includes('from "prop-types"')) {
    const importRegex = /import\s+.*?from\s+['"].*?['"];?\n/g;
    let lastImportIndex = 0;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      lastImportIndex = match.index + match[0].length;
    }
    
    // If no imports found, insert at the beginning
    if (lastImportIndex === 0) {
      content = `import PropTypes from 'prop-types';\n` + content;
    } else {
      content = content.slice(0, lastImportIndex) + `import PropTypes from 'prop-types';\n` + content.slice(lastImportIndex);
    }
  }

  // Find component name
  let compName = null;
  const defaultExportMatch = content.match(/export\s+default\s+function\s+([A-Z][a-zA-Z0-9_]*)/);
  if (defaultExportMatch) {
      compName = defaultExportMatch[1];
  } else {
      const constMatch = content.match(/const\s+([A-Z][a-zA-Z0-9_]*)\s*=\s*(?:memo\()/);
      if (constMatch) compName = constMatch[1];
      else {
          const constMatch2 = content.match(/const\s+([A-Z][a-zA-Z0-9_]*)\s*=\s*\([^)]*\)\s*=>/);
          if (constMatch2) compName = constMatch2[1];
          else {
              const exportFuncMatch = content.match(/export\s+function\s+([A-Z][a-zA-Z0-9_]*)/);
              if (exportFuncMatch) compName = exportFuncMatch[1];
              else {
                  const classMatch = content.match(/class\s+([A-Z][a-zA-Z0-9_]*)\s+extends\s+React\.Component/);
                  if (classMatch) compName = classMatch[1];
              }
          }
      }
  }

  if (compName) {
      let propTypesStr = `\n${compName}.propTypes = {\n`;
      Array.from(propsSet).forEach(p => {
          let type = 'PropTypes.any';
          if (p.startsWith('on')) type = 'PropTypes.func';
          else if (p.startsWith('is') || p.startsWith('has')) type = 'PropTypes.bool';
          else if (p === 'children') type = 'PropTypes.node';
          else if (p === 'title' || p === 'description' || p === 'className') type = 'PropTypes.string';
          propTypesStr += `  ${p}: ${type},\n`;
      });
      propTypesStr += `};\n`;

      if (!content.includes(`${compName}.propTypes`)) {
          // Verify if the export is at the end of the file. If so, append before export default CompName if it exists
          const exportDefaultRegex = new RegExp(`export\\s+default\\s+(?:memo\\()?${compName}(?:\\))?;`);
          const exportDefaultMatch = content.match(exportDefaultRegex);
          
          if (exportDefaultMatch) {
              const index = exportDefaultMatch.index;
              content = content.slice(0, index) + propTypesStr + '\n' + content.slice(index);
          } else {
              content += propTypesStr;
          }
          fs.writeFileSync(f.filePath, content, 'utf-8');
          console.log(`Updated ${path.basename(f.filePath)}`);
      }
  } else {
      console.log(`Could not find component name in ${path.basename(f.filePath)}`);
  }
});
