const editor = document.getElementById('editor');
const compileBtn = document.getElementById('compile-btn');
const preview = document.getElementById('preview');

function compileAstro(source) {
  try {
    const parts = source.split('---');
    if (parts.length < 3) {
      throw new Error("Missing code fences (---). Ensure your file has a top and bottom fence!");
    }
    
    const frontmatter = parts[1].trim();
    let template = parts[2].trim();

    // 1. Extract variable names to form the scope
    const variableNames = [];
    const varRegex = /(?:const|let|var)\s+(\w+)\s*=/g;
    let match;
    while ((match = varRegex.exec(frontmatter)) !== null) {
      variableNames.push(match[1]);
    }

    // 2. Execute frontmatter to build the local scope
    const executeCode = new Function(
      frontmatter + "\nreturn { " + variableNames.join(', ') + " };"
    );
    const scope = executeCode();
    const argNames = Object.keys(scope);
    const argValues = Object.values(scope);

    // 3. Extract CSS
    let css = '';
    const styleRegex = /<style>([\s\S]*?)<\/style>/;
    const styleMatch = template.match(styleRegex);
    if (styleMatch) {
      css = styleMatch[1];
      template = template.replace(styleRegex, ''); 
    }

    // 4. THE NESTED BRACKET PARSER
    // Instead of regex, we walk through the string to find matching { and }
    let i = 0;
    while (i < template.length) {
      if (template[i] === '{') {
        let start = i;
        let bracketCount = 1;
        let j = i + 1;
        
        while (j < template.length && bracketCount > 0) {
          if (template[j] === '{') bracketCount++;
          if (template[j] === '}') bracketCount--;
          j++;
        }
        
        if (bracketCount === 0) {
          const fullExpression = template.substring(start, j);
          const jsExpression = template.substring(start + 1, j - 1).trim();
          
          try {
            const evaluator = new Function(...argNames, "return " + jsExpression);
            const result = evaluator(...argValues);
            
            let replacement = '';
            if (Array.isArray(result)) {
              replacement = result.join('');
            } else if (result !== false && result !== null && result !== undefined) {
              replacement = result;
            }
            
            template = template.substring(0, start) + replacement + template.substring(j);
            i = start + String(replacement).length;
            continue; 
          } catch (e) {
            // If it fails to evaluate (like raw CSS or object literals), leave it alone
          }
        }
      }
      i++;
    }

    // 5. Return finalized HTML
    return [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '<style>' + css + '</style>',
      '</head>',
      '<body>' + template + '</body>',
      '</html>'
    ].join('\n');

  } catch (error) {
    return [
      '<div style="color: #ef4444; font-family: monospace; padding: 20px;">',
      '<h3>🚨 Compilation Error:</h3>',
      '<pre>' + error.message + '</pre>',
      '</div>'
    ].join('\n');
  }
}

function runCompiler() {
  const code = editor.value;
  const compiledHTML = compileAstro(code);
  
  const doc = preview.contentDocument || preview.contentWindow.document;
  doc.open();
  doc.write(compiledHTML);
  doc.close();
}

compileBtn.addEventListener('click', runCompiler);

let debounceTimer;
editor.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runCompiler, 300);
});

runCompiler();
