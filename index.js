const express = require('express');
const fs = require('fs');
const app = express();
const exec = require('child_process').exec;
const bodyParser = require('body-parser');
const timeout = require('connect-timeout');

const root = process.env.NODE_ENV === "production" ? "/playground" : "./";
const execRoot = process.env.NODE_ENV === "production" ? "/root" : "~";

app.use(timeout('60s'));
app.use(bodyParser());

app.use(express.static('public'));

app.post('/execute', (req, res) => {
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
      cmd += execRoot + '/.cargo/bin/rustc main.rs && ';
      cmd += stdin.length ? 'cat stdin.inp | ./main' : './main';
      break;
    default:
      break;
  }
  fs.writeFileSync(root + '/stdin.inp', stdin);
  exec(cmd, { cwd: root }, (err, stdout, stderr) => {
    res.json({ err, stdout, stderr });
  });
});

const startupCommand = execRoot + '/.cargo/bin/rustup default stable';
exec(startupCommand, { cwd: "/" });

app.listen(process.env.PORT || 3000);