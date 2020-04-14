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
  let cmd = '';
  switch (lang) {
    case 'cpp':
      fs.writeFileSync(root + '/main.cpp', code);
      cmd += 'g++ main.cpp -std=c++11 -o maincpp && ' + (stdin.length ? ' cat stdin.inp | ./maincpp' : './maincpp');
      break;
    case 'python':
      fs.writeFileSync(root + '/main.py', code);
      cmd += stdin.length ? 'cat stdin.inp | python main.py' : 'python main.py';
      break;
    case 'rust':
      fs.writeFileSync(root + '/main.rs', code);
      cmd += 'rustc main.rs -o mainrs && ' + (stdin.length ? 'cat stdin.inp | ./mainrs' : './mainrs');
      break;
    default:
      break;
  }
  fs.writeFileSync(root + '/stdin.inp', stdin);
  exec(cmd, { cwd: root }, (err, stdout, stderr) => {
    res.json({ err, stdout, stderr });
  });
});

app.listen(process.env.PORT || 3000);