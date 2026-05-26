const fs = require('fs');
const lines = fs.readFileSync('routes/analyticsRoutes.js', 'utf8').split('\n');
lines.splice(419, 196);
fs.writeFileSync('routes/analyticsRoutes.js', lines.join('\n'));
