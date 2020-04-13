const express = require('express');
const fs = require('fs');
const app = express();
const exec = require('child_process').exec;
const bodyParser = require('body-parser');

app.use(bodyParser());

app.use(express.static('public'));

app.post('/execute', (req, res) => {
  const code = req.body.code;
  const stdin = req.body.stdin;
  const cmd = 'g++ main.cpp -std=c++11 -o main && ' + (stdin.length ? ' cat stdin.inp | ./main' : './main');
  fs.writeFileSync('main.cpp', code);
  fs.writeFileSync('stdin.inp', stdin);
  exec(cmd, (err, stdout, stderr) => {
    res.json({ err, stdout, stderr });
  });
});

app.listen(process.env.PORT || 3000);