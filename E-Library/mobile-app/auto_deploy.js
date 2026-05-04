const { spawn } = require('child_process');

async function run() {
  console.log("Starting EAS Init...");
  const child = spawn('eas.cmd', ['init'], { 
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: true,
    cwd: __dirname 
  });

  // Wait a bit for the first question (Would you like to create a project?)
  setTimeout(() => {
    console.log("Answering 'Yes' to project creation...");
    child.stdin.write('y\n');
    
    // Wait for the second question (slug/name)
    setTimeout(() => {
      console.log("Confirming project slug...");
      child.stdin.write('\n');
      child.stdin.end();
    }, 3000);
  }, 5000);

  child.on('close', (code) => {
    console.log(`EAS Init finished with code ${code}`);
    if (code === 0) {
      console.log("Starting EAS Build...");
      const build = spawn('eas.cmd', ['build', '-p', 'android', '--profile', 'preview', '--non-interactive'], {
        stdio: 'inherit',
        shell: true,
        cwd: __dirname
      });
    }
  });
}

run();
