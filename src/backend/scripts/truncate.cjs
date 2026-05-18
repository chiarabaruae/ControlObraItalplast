const fs = require('fs');
const lines = fs.readFileSync('c:/Users/chiar/Proyectos/Italpalst/ControlAvancesObra/src/frontend/styles/login.css', 'utf-8').split('\n');
fs.writeFileSync('c:/Users/chiar/Proyectos/Italpalst/ControlAvancesObra/src/frontend/styles/login.css', lines.slice(0, 257).join('\n'));
