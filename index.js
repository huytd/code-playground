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
    await container.stop();
    await container.remove();
    resolve(output);
  } catch(error) {
    throw error;
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
      default:
        image = 'node';
        break;
    }

    const session = `${root}/${Date.now().toPrecision(21)}`;
    if (!fs.existsSync(`./${session}`)) {
      fs.mkdirSync(`./${session}`);
    }

    let cmd = executeCommandBuilder(code, lang, `./${session}`);
    let result = await runInDocker(docker, image, ["/bin/bash", "-c", cmd], {
      'HostConfig': {
        'Binds': [`${path.join(__dirname + "/" + session)}:/usr/app/src`]
      },
      'WorkingDir': '/usr/app/src'
    });

    rmDir(`./${session}`);

    res.json(result);
  } catch(err) {
    console.log("ERROR", err);
    res.json({ error: true });
  }
});

const entryFile = './public/index.html';
const options = {};
const bundler = new Bundler(entryFile, options);
app.use(bundler.middleware());

app.listen(process.env.PORT || 3000);
