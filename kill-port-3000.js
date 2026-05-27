import { execSync } from 'child_process';
try {
  const pid = execSync('lsof -t -i:3000').toString().trim();
  if (pid) {
    console.log(`Killing process ${pid} on port 3000`);
    execSync(`kill -9 ${pid}`);
  } else {
    console.log('No process on port 3000');
  }
} catch (e) {
  console.log('Error or no process on port 3000:', e.message);
}
