const { spawn } = require('child_process');

const email = 'debharanamihijaya@gmail.com';
const password = 'Ravitha@2000';

const child = spawn('eas', ['login'], {
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true
});

child.stdin.write(`${email}\n`);
setTimeout(() => {
  child.stdin.write(`${password}\n`);
  child.stdin.end();
}, 2000);

child.on('close', (code) => {
  console.log(`EAS login exited with code ${code}`);
  process.exit(code);
});
