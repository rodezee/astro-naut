function compileAstro(source, externalProps = {}, instanceId) {
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

    const executeCode = new Function('props', `
      ${frontmatter}
      const mergedScope = { 
        ${variableNames.map(v => `${v}: typeof ${v} !== 'undefined' ? ${v} : undefined`).join(',\n')} 
      };
      return { ...mergedScope, ...props };
    `);
    
    const scope = executeCode(externalProps);
    const argNames = Object.keys(scope);
    const argValues = Object.values(scope);

    // Extract CSS
    let css = '';
    const styleRegex = /<style>([\s\S]*?)<\/style>/;
    const styleMatch = template.match(styleRegex);
    if (styleMatch) {
      css = styleMatch[1];
      template = template.replace(styleRegex, ''); 
      
      // Auto-scope standard selectors while ignoring @media and @keyframes
      css = css.replace(/([^\r\n,{}]+)(?=\s*{)/g, (match) => {
        const trimmed = match.trim();
        if (trimmed.startsWith('@')) return match; // Skip @rules
        return `[data-astro-id="${instanceId}"] ${trimmed}`;
      });
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
              replacement = String(result); // Coerce to string safely
            }
            
            template = template.substring(0, start) + replacement + template.substring(j);
            i = start + replacement.length;
            continue; 
          } catch (e) { 
            // Fallback: It's likely raw CSS or an object literal, leave it as is
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
    this._props = {};
    this._rawText = ''; 
    
    // Generate a random unique ID for this specific element instance
    this._instanceId = 'astro-' + Math.random().toString(36).substr(2, 9);

    // --- NEW: EVENT DELEGATION LISTENER ---
    this.addEventListener('click', (event) => {
      // Find the closest element that has a data-on-click attribute
      const target = event.target.closest('[data-on-click]');
      if (!target) return;

      const methodName = target.getAttribute('data-on-click');
      
      // If that method exists on our .props, execute it!
      if (this._props && typeof this._props[methodName] === 'function') {
        this._props[methodName].call(this, event);
      }
    });
  }

  get props() {
    return this._props;
  }

  set props(value) {
    if (typeof value === 'object' && value !== null) {
      this._props = value;
      if (this._rawText) {
        this.innerHTML = compileAstro(this._rawText, this._props, this._instanceId);
      }
    }
  }

  async connectedCallback() {
    this.setAttribute('data-astro-id', this._instanceId);

    const propsAttr = this.getAttribute('props');
    
    if (propsAttr && Object.keys(this._props).length === 0) {
      try {
        this._props = JSON.parse(propsAttr);
      } catch (e) {
        console.error("Failed to parse props JSON attribute:", e);
      }
    }

    const inlineScript = this.querySelector('script[type="text/astro"]');
    
    if (inlineScript) {
      this._rawText = inlineScript.innerHTML.trim();
      this.innerHTML = compileAstro(this._rawText, this._props, this._instanceId);
    } else {
      const src = this.getAttribute('src');
      
      if (src) {
        this.innerHTML = `<p style="color:#64748b">Loading component...</p>`;
        
        try {
          const response = await fetch(src);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          this._rawText = await response.text();
          this.innerHTML = compileAstro(this._rawText, this._props, this._instanceId);
        } catch (error) {
          this.innerHTML = `<p style="color:red">Failed to load AstroNaut component: ${error.message}</p>`;
        }
      } else {
        console.warn("No <script type=\"text/astro\"> found, and 'src' is unset. Unable to obtain Astro source for:", this);
        return;
      }
    }
  }
}

customElements.define('astro-naut', AstroNaut);
