// 1. Put our battle-tested compiler function at the top
function compileAstro(source) {
  try {
    const parts = source.split('---');
    if (parts.length < 3) return "Missing code fences (---)";
    
    const frontmatter = parts[1].trim();
    let template = parts[2].trim();

    const variableNames = [];
    const varRegex = /(?:const|let|var)\s+(\w+)\s*=/g;
    let match;
    while ((match = varRegex.exec(frontmatter)) !== null) {
      variableNames.push(match[1]);
    }

    const executeCode = new Function(
      frontmatter + "\nreturn { " + variableNames.join(', ') + " };"
    );
    const scope = executeCode();
    const argNames = Object.keys(scope);
    const argValues = Object.values(scope);

    // Style extraction
    let css = '';
    const styleRegex = /<style>([\s\S]*?)<\/style>/;
    const styleMatch = template.match(styleRegex);
    if (styleMatch) {
      css = styleMatch[1];
      template = template.replace(styleRegex, ''); 
    }

    // Bracket-counting parser
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
            // Raw brackets or CSS fallback
          }
        }
      }
      i++;
    }

    // Return encapsulated scoped style and HTML
    return `<style>${css}</style>${template}`;

  } catch (error) {
    return `<div style="color:red">Compilation Error: ${error.message}</div>`;
  }
}

// 2. Define the AstroNaut Web Component
class AstroNaut extends HTMLElement {
  constructor() {
    super();
    // Attach a Shadow DOM so our AstroNaut component styles don't leak out to the main page!
    this.attachShadow({ mode: 'open' });
  }

  // Watch for when the element is placed on the screen
  async connectedCallback() {
    const src = this.getAttribute('src');
    if (!src) {
      this.shadowRoot.innerHTML = `<p style="color:red">Missing 'src' attribute.</p>`;
      return;
    }

    this.shadowRoot.innerHTML = `<p style="color:#64748b">Loading component...</p>`;

    try {
      // Fetch the raw .astro file from the CDN or server
      const response = await fetch(src);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const rawText = await response.text();

      // Compile and inject it into the component's shadow DOM
      this.shadowRoot.innerHTML = compileAstro(rawText);
    } catch (error) {
      this.shadowRoot.innerHTML = `<p style="color:red">Failed to load AstroNaut component: ${error.message}</p>`;
    }
  }
}

// Register the custom element as <astro-naut>
customElements.define('astro-naut', AstroNaut);
