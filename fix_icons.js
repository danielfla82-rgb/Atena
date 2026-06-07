const fs = require('fs');
let code = fs.readFileSync('components/Library.tsx', 'utf8');

// The pattern looks for an icon component, then an input type="url"
const linkIconPattern = /<([A-Z][a-zA-Z0-9]*)\s+className="absolute left-3 top-3([^"]*)"\s+size=\{16\}\s*\/>\s*(<input[^>]*type="url"[^>]*value=\{([^\|\}]+)(?:[\| ]*'')?\})/g;

code = code.replace(linkIconPattern, (match, iconName, iconClasses, inputHTML, valueVar) => {
    valueVar = valueVar.trim();
    return `<${iconName} className={\`absolute left-3 top-3${iconClasses} \${${valueVar} ? 'cursor-pointer hover:scale-110 hover:brightness-125 z-10 transition-all' : ''}\`} size={16} onClick={() => ${valueVar} && window.open(${valueVar}, '_blank')} />${inputHTML}`;
});

fs.writeFileSync('components/Library.tsx', code);
console.log("Replaced icons in components/Library.tsx");
