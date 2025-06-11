const { spawn } = require('child_process');

const server = spawn('node', ['./dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

server.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

server.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Wait a bit for server to start
setTimeout(() => {
  server.stdin.write('{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"roots":{"listChanged":false},"sampling":{}},"clientInfo":{"name":"claude-code","version":"1.0"}}}\n');
  
  setTimeout(() => {
    server.stdin.write('{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"obsidian_get_notes","arguments":{"target":"Tests/Section Test Note.md"}}}\n');
    
    setTimeout(() => {
      server.kill();
    }, 2000);
  }, 100);
}, 100);
