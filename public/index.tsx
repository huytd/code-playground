import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './styles.scss';

import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material-darker.css';
import 'codemirror/mode/clike/clike.js';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/mode/python/python.js';
import 'codemirror/mode/go/go.js';
import 'codemirror/mode/rust/rust.js';
import 'codemirror/keymap/vim.js';

// Config Vim key binding
CodeMirror.Vim.map("jk", "<Esc>", "insert")

const supportedLanguages = [
  {
    name: 'C++',
    cmMode: 'clike',
    lang: 'cpp',
    template: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello World";\n}',
  },
  {
    name: 'Rust',
    cmMode: 'rust',
    lang: 'rust',
    template: 'fn main() {\n\n}',
  },
  {
    name: 'JavaScript',
    cmMode: 'javascript',
    lang: 'node',
    template: 'console.log("Hello, World")',
  },
  {
    name: 'Go',
    cmMode: 'go',
    lang: 'go',
    template: 'package main\n\nfunc main() {\n\n}',
  },
  {
    name: 'Python',
    cmMode: 'python',
    lang: 'python',
    template: ''
  }
];

const App = () => {
  const editorRef = React.useRef();
  const [waiting, setWaiting] = React.useState(false);
  const [executionOutput, setExecutionOutput] = React.useState({
    stdout: '',
    stderr: ''
  });

  React.useEffect(() => {
    let language = window.localStorage.getItem('__cpppad-saved-language') || 'cpp';

    const cm = CodeMirror(editorRef.current, {
      mode: supportedLanguages[0].cmMode,
      lineNumbers: true,
      keyMap: 'vim',
      theme: 'material-darker',
      cursorBlinkRate: 0,
      showCursorWhenSelecting: true
    });

    const initLanguage = lang => {
      const found = supportedLanguages.find(l => l.lang === lang);
      language = lang;
      window.localStorage.setItem('__cpppad-saved-language', found.lang);
      const savedCode = window.localStorage.getItem('__cpppad-saved-code-' + found.lang) || found.template;
      cm.setValue(savedCode);
      cm.setOption('mode', found.cmMode);
    };

    initLanguage(language);

    const $languageSelect = document.querySelector("#language-select");
    $languageSelect.value = language;
    $languageSelect.onchange = (e) => {
      initLanguage($languageSelect.value);
    };

    const executeCode = (editor) => {
      setWaiting(true);
      const code = editor.getValue();
      window.localStorage.setItem('__cpppad-saved-code-' + language, code);
      fetch('/execute', {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code,
          lang: language
        })
      })
        .then(r => r.json())
        .then(output => {
          setWaiting(false);
          setExecutionOutput({
            stdout: output.stdout,
            stderr: output.stderr
          });
        })
        .catch(() => {
          setWaiting(false);
          setExecutionOutput({
            stdout: 'No output',
            stderr: 'Code execution failed'
          });
        });
    };

    const customKey = {
      "Cmd-Enter": executeCode,
      "Ctrl-Enter": executeCode
    };

    cm.addKeyMap(customKey);

  }, []);

  return (
    <>
      <div className="header">
        language: <select id="language-select">
          {supportedLanguages.map(({ lang, name }) => <option value={lang}>{name}</option>)}
        </select>
      </div>
      <div className="container">
        <div id="editor-container">
          <div id="editor" ref={editorRef}></div>
        </div>
        <div id="output">
          <div className="col">
            <div className="output-section">
              <div id="stdout">
                {waiting ? (
                  <div className='status-section loading'><span className='icon'>i</span> running...</div>
                ) : (
                  <>
                  {executionOutput.stdout && (
                    <div className='output-box out'>
                      <header>stdout</header>
                      <pre><code>{executionOutput.stdout}</code></pre>
                    </div>
                  )}
                  {executionOutput.stderr && (
                    <div className='output-box err'>
                      <header>stderr</header>
                      <pre><code>{executionOutput.stderr}</code></pre>
                    </div>
                  )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
};

ReactDOM.render(<App/>, document.getElementById("root"));
