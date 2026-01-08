const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dir = path.join(__dirname, 'src', 'environments');
// checks if environemnts file exists
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}
// accessses .env
const apiKey = process.env;

// creates text for file
const content = (isProd) => `export const environment = {
  production: ${isProd},
  mapsKey: '${apiKey.MAPS_API_KEY || ''}',
  firebase: {
    apiKey: '${apiKey.FIREBASE_API_KEY || ''}',
    authDomain: '${apiKey.FIREBASE_AUTH_DOMAIN || ''}',
    databaseURL: '${apiKey.FIREBASE_DATABASE_URL || ''}',
    projectId: '${apiKey.FIREBASE_PROJECT_ID || ''}',
    storageBucket: '${apiKey.FIREBASE_STORAGE_BUCKET || ''}',
    messagingSenderId: '${apiKey.FIREBASE_MESSAGING_SENDER_ID || ''}',
    appId: '${apiKey.FIREBASE_APP_ID || ''}'
  }
};
`;
// stores all files in array
const files = [
  { name: 'environment.ts', isProd: false },
  { name: 'environment.prod.ts', isProd: true },
  { name: 'environment.ci.ts', isProd: true },
  { name: 'environment.development.ts', isProd: false }
];
// traveres through each file and rewrites file with content
files.forEach(file => {
  fs.writeFileSync(path.join(dir, file.name), content(file.isProd));
});