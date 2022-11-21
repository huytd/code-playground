const express = require('express');
const fs = require('fs');
const path = require('path');
const Stream = require('stream');
const app = express();
const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const Bundler = require('parcel-bundler');
const Docker = require('dockerode');
const exec = require('child_process').exec;

const rmDir = (dir) => {
  exec(`rm -rf ${dir}`);
};

const docker = new Docker({
  socketPath: '/var/run/docker.sock'
});

const root = "playground";

app.use(timeout('60s'));
app.use(bodyParser());

const runInDocker = (docker, image, command, options) => new Promise(async (resolve, reject) => {
  try {
    let output = {
      stdout: '',
      stderr: ''
    };

    const container = await docker.createContainer({
      Image: image,
      Cmd: command,
      ...options
    });

    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
      tty: false
    });

    const stdout = new Stream.PassThrough();
    const stderr = new Stream.PassThrough();
    container.modem.demuxStream(stream, stdout, stderr);

    stdout.on('data', (chunk) => {
      output.stdout += chunk.toString('utf-8');
    });

    stderr.on('data', (chunk) => {
      output.stderr += chunk.toString('utf-8');
    });

    await container.start();
    try {
      await container.stop();
    } catch (e) {
      console.error('Container already stopped')
    }
    await container.remove();
    resolve(output);
  } catch(error) {
    reject(error);
  }
});

const executeCommandBuilder = (code, lang, path) => {
  let cmd = '';
  switch (lang) {
    case 'cpp':
      fs.writeFileSync(path + '/main.cpp', code);
      cmd = 'g++ main.cpp -std=c++11 -o maincpp && ./maincpp';
      break;
    case 'python':
      fs.writeFileSync(path + '/main.py', code);
      cmd = 'python main.py';
      break;
    case 'node':
      fs.writeFileSync(path + '/main.js', code);
      cmd = 'node main.js';
      break;
    case 'rust':
      fs.writeFileSync(path + '/main.rs', code);
      cmd = 'rustc main.rs && RUST_BACKTRACE=1 ./main';
      break;
    case 'go':
      fs.writeFileSync(path + '/main.go', code);
      cmd = 'go run main.go';
      break;
    case 'zig':
      fs.writeFileSync(path + '/main.zig', code);
      cmd = 'zig run main.zig';
      break;
    default:
      break;
  }
  return cmd;
};

app.post('/execute', async (req, res) => {
  try {
    const code = req.body.code;
    const lang = req.body.lang;

    let image;
    switch (lang) {
      case 'rust':
        image = 'rust';
        break;
      case 'go':
        image = 'golang';
        break;
      case 'zig':
        image = 'protocall7/zig:0.10.0';
        break;
      default:
        image = 'node';
        break;
    }

    const session = `${root}/${Date.now().toPrecision(21)}`;
    if (!fs.existsSync(`./${session}`)) {
      fs.mkdirSync(`./${session}`);
    }

    let cmd = executeCommandBuilder(code, lang, `./${session}`);
    let result = await runInDocker(docker, image, ["/bin/sh", "-c", cmd], {
      'HostConfig': {
        'Binds': [`${path.join(__dirname + "/" + session)}:/usr/app/src`]
      },
      'WorkingDir': '/usr/app/src'
    });

    rmDir(`./${session}`);

    res.json(result);
  } catch(err) {
    console.log("ERROR", err);
    res.json({ 
      error: true,
      stdout: 'No output',
      stderr: err.message
    });
  }
});

const entryFile = './public/index.html';
const options = {};
const bundler = new Bundler(entryFile, options);
app.use(bundler.middleware());

app.listen(process.env.PORT || 3000);
