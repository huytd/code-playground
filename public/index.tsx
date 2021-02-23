import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './styles.scss';

import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/xq-light.css';
import 'codemirror/mode/clike/clike.js';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/mode/python/python.js';
import 'codemirror/mode/rust/rust.js';
import 'codemirror/keymap/vim.js';

// Config Vim key binding
CodeMirror.Vim.map("jk", "<Esc>", "insert")

const htmlEntities = (str) => {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

const defaultCode = {
  'cpp': '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello World";\n}',
  'python': '',
  'node': 'process.stdin.resume();\nprocess.stdin.setEncoding("utf-8");\nvar stdin_input = "";\n\nprocess.stdin.on("data", function (input) {\n    stdin_input += input;\n});\n\nprocess.stdin.on("end", function () {\n   main(stdin_input);\n});\n\nfunction main(input) {\n    process.stdout.write("Hi, " + input + ".");\n}',
  'rust': 'fn main() {\n\n}',
};

const App = () => {
  const editorRef = React.useRef();

  React.useEffect(() => {
    let language = window.localStorage.getItem('__cpppad-saved-language') || 'cpp';

    const cm = CodeMirror(editorRef.current, {
      mode: 'clike',
      lineNumbers: true,
      keyMap: 'vim',
      theme: 'xq-light',
      showCursorWhenSelecting: true
    });

    const initLanguage = lang => {
      language = lang;
      window.localStorage.setItem('__cpppad-saved-language', lang);
      const savedStdin = window.localStorage.getItem('__cpppad-saved-stdin-' + lang);
      if (savedStdin) {
        document.querySelector("#stdin").value = savedStdin;
      }
      const savedCode = window.localStorage.getItem('__cpppad-saved-code-' + lang) || defaultCode[lang];
      cm.setValue(savedCode);
      const expectedOutput = window.localStorage.getItem('__cpppad-saved-expected-' + lang) || '';
      document.querySelector('#expected-stdout').value = expectedOutput;
      let mode = 'clike';
      switch (lang) {
        case 'cpp': mode = 'clike'; break;
        case 'node': mode = 'javascript'; break;
        case 'python': mode = 'python'; break;
        case 'rust': mode = 'rust'; break;
      }
      cm.setOption('mode', mode);
    };

    initLanguage(language);

    const $languageSelect = document.querySelector("#language-select");
    $languageSelect.value = language;
    $languageSelect.onchange = (e) => {
      initLanguage($languageSelect.value);
    };

    const testOutput = () => {
      const expected = document.querySelector("#expected-stdout").value.trim();
      if (expected.length) {
        const actual = document.querySelector("#stdout").innerHTML.trim();
        if (expected === actual) {
          document.querySelector("#stdout").innerHTML += "<div class='status-section success'><span class='icon'>✔</span> test passed!</div>";
        } else {
          document.querySelector("#stdout").innerHTML += "<div class='status-section failed'><span class='icon'>!</span> test failed!</div>";
        }
      }
    };

    const executeCode = (editor) => {
      document.querySelector("#stdout").innerHTML = "<div class='status-section loading'><span class='icon'>i</span> running...</div>";
      const code = editor.getValue();
      const stdin = document.querySelector("#stdin").value;
      const expected = document.querySelector("#expected-stdout").value;
      window.localStorage.setItem('__cpppad-saved-code-' + language, code);
      window.localStorage.setItem('__cpppad-saved-stdin-' + language, stdin);
      window.localStorage.setItem('__cpppad-saved-expected-' + language, expected);
      fetch('/execute', {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stdin: stdin,
          code: code,
          lang: language
        })
      })
        .then(r => r.json())
        .then(output => {
          document.querySelector("#stdout").innerHTML = "<div class='output-box out'><div class='box-title'><b>stdout</b></div>";
          document.querySelector("#stdout").innerHTML += htmlEntities(output.stdout);
          document.querySelector("#stdout").innerHTML = "</div>";
          document.querySelector("#stdout").innerHTML = "<div class='output-box err'><div class='box-title'><b>stderr</b></div>";
          document.querySelector("#stdout").innerHTML += htmlEntities(output.stderr);
          document.querySelector("#stdout").innerHTML = "</div>";
          testOutput();
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
          <option value="cpp">C++</option>
          <option value="python">Python</option>
          <option value="node">JavaScript</option>
          <option value="rust">Rust</option>
        </select>
      </div>
      <div className="container">
        <div id="editor-container">
          <div id="editor" ref={editorRef}></div>
        </div>
        <div id="output">
          <div className="col left">
            <div className="output-section">
              <header>stdout/stderr</header>
              <pre id="stdout"></pre>
            </div>
          </div>
          <div className="col right">
            <div className="output-section">
              <header>stdin</header>
              <textarea id="stdin"></textarea>
            </div>
            <div className="output-section">
              <header>expected stdout</header>
              <textarea id="expected-stdout"></textarea>
            </div>
          </div>
        </div>
      </div>
    </>
  )
};

ReactDOM.render(<App/>, document.getElementById("root"));
