function compileAstro(source, externalProps = {}) {
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

    // --- UPGRADE: Pass externalProps into the frontmatter execution ---
    // This creates a function that accepts 'props' and merges them with internal variables
    const executeCode = new Function('props', `
      ${frontmatter}
      
      // Override internal variables if they exist in external props
      const mergedScope = { 
        ${variableNames.map(v => `${v}: typeof ${v} !== 'undefined' ? ${v} : undefined`).join(',\n')} 
      };
      
      return { ...mergedScope, ...props };
    `);
    
    const scope = executeCode(externalProps);
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

    return `<style>${css}</style>${template}`;

  } catch (error) {
    return `<div style="color:red">Compilation Error: ${error.message}</div>`;
  }
}

class AstroNaut extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Internal storage for our properties
    this._props = {};
    this._rawText = ''; 
  }

  // 1. Getter for .props
  get props() {
    return this._props;
  }

  // 2. Setter for .props (This lets JS do: element.props = { ... })
  set props(value) {
    if (typeof value === 'object' && value !== null) {
      this._props = value;
      // If we already fetched the template, re-render immediately with the new data!
      if (this._rawText) {
        this.shadowRoot.innerHTML = compileAstro(this._rawText, this._props);
      }
    }
  }

  async connectedCallback() {
    const src = this.getAttribute('src');
    const propsAttr = this.getAttribute('props');
    
    // Fallback: If the user used the HTML attribute instead of JS property
    if (propsAttr && Object.keys(this._props).length === 0) {
      try {
        this._props = JSON.parse(propsAttr);
      } catch (e) {
        console.error("Failed to parse props JSON attribute:", e);
      }
    }

    if (!src) {
      this.shadowRoot.innerHTML = `<p style="color:red">Missing 'src' attribute.</p>`;
      return;
    }

    this.shadowRoot.innerHTML = `<p style="color:#64748b">Loading component...</p>`;

    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      // Save the raw text to our instance so we can re-render later if props change
      this._rawText = await response.text();

      // Initial render
      this.shadowRoot.innerHTML = compileAstro(this._rawText, this._props);
    } catch (error) {
      this.shadowRoot.innerHTML = `<p style="color:red">Failed to load AstroNaut component: ${error.message}</p>`;
    }
  }
}

// Register the custom element as <astro-naut>
customElements.define('astro-naut', AstroNaut);
