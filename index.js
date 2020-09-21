const express = require('express');
const fs = require('fs');
const app = express();
const exec = require('child_process').exec;
const bodyParser = require('body-parser');
const timeout = require('connect-timeout');

app.use(timeout('60s'));
app.use(bodyParser());

app.use(express.static('public'));

app.post('/execute', (req, res) => {
  const root = "/playground";
  const code = req.body.code;
  const stdin = req.body.stdin;
  const lang = req.body.lang;
  const flags = req.body.flags;
  let cmd = '';
  switch (lang) {
    case 'cpp':
      fs.writeFileSync(root + '/main.cpp', code);
      cmd += 'g++ main.cpp -std=c++11 -o maincpp ' + flags + ' && ' + (stdin.length ? ' cat stdin.inp | ./maincpp' : './maincpp');
      break;
    case 'python':
      fs.writeFileSync(root + '/main.py', code);
      cmd += stdin.length ? 'cat stdin.inp | python main.py' : 'python main.py';
      break;
    case 'node':
      fs.writeFileSync(root + '/main.js', code);
      cmd += stdin.length ? 'cat stdin.inp | node main.js' : 'node main.js';
      break;
    case 'rust':
      fs.writeFileSync(root + '/main.rs', code);
      cmd += stdin.length ? 'cat stdin.inp | /root/.cargo/bin/rustc main.rs' : '/root/.cargo/bin/rustc main.rs';
      break;
    default:
      break;
  }
  fs.writeFileSync(root + '/stdin.inp', stdin);
  exec(cmd, { cwd: root }, (err, stdout, stderr) => {
    res.json({ err, stdout, stderr });
  });
});

const startupCommand = '/root/.cargo/bin/rustup default stable';
exec(startupCommand, { cwd: root });

app.listen(process.env.PORT || 3000);