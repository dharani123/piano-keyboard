import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const PROGRESS_FILE = 'saved-progress.json';

// GET/POST /__progress reads and writes saved-progress.json, so practice
// progress lives in the repo and follows a commit to another laptop.
function progressFile() {
  return {
    name: 'progress-file',
    configureServer(server) {
      const file = path.resolve(server.config.root, PROGRESS_FILE);
      server.middlewares.use('/__progress', (req, res) => {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '{}');
          return;
        }
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              fs.writeFileSync(file, JSON.stringify(JSON.parse(body), null, 2) + '\n');
              res.statusCode = 204;
            } catch {
              res.statusCode = 400;
            }
            res.end();
          });
          return;
        }
        res.statusCode = 405;
        res.end();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), progressFile()],
  server: { watch: { ignored: [`**/${PROGRESS_FILE}`] } },
});
