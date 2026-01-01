const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dir = path.join(__dirname, 'src', 'environments');

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const apiKey = process.env.MAPS_API_KEY || '';

const content = (isProd) => `export const environment = {
  production: ${isProd},
  mapsKey: '${apiKey}'
};
`;

// Write BOTH files so the 'fileReplacements' in angular.json works
fs.writeFileSync(path.join(dir, 'environment.ts'), content(false));
fs.writeFileSync(path.join(dir, 'environment.prod.ts'), content(true));