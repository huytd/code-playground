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
import 'codemirror/addon/dialog/dialog.js';
import 'codemirror/addon/dialog/dialog.css';

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

function useLocalStorage(key, initialValue) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = React.useState(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };

  return [storedValue, setValue];
}

const useCodeEditor = (ref, keyMap = {}, options = {}, commands = []) => {
  const cm = React.useRef();

  React.useEffect(() => {
    const Vim = (CodeMirror as any).Vim;
    // Config Vim key binding
    Vim.map("jk", "<Esc>", "insert")

    for (let cmd of commands) {
      const {command, short, fn} = cmd;
      Vim.defineEx(command, short, fn);
    }

    cm?.current = CodeMirror(ref?.current, {
      lineNumbers: true,
      keyMap: 'vim',
      theme: 'material-darker',
      showCursorWhenSelecting: true,
      ...options
    });
    cm?.current.addKeyMap(keyMap);
  }, [ref]);

  return cm;
};

const useFileSystem = (id) => {
  const fs = React.useRef();
  const [language, setLanguage] = useLocalStorage("__cpp-pad-saved-language", "cpp");
  const [fileSystem, setFileSystem] = useLocalStorage(id, {
    currentFileIndex: -1,
    files: [
      {
        name: 'demo-01.js',
        content: 'console.log("Hey you!")',
        language: 'node',
      },
      {
        name: 'demo-02.rs',
        content: 'fn main() {\n  println!("OK This is a test");\n}',
        language: 'rust'
      },
    ]
  });

  const all = () => {
    return fileSystem.files;
  };

  const getCurrent = () => {
    if (fileSystem.currentFileIndex !== -1) {
      return fileSystem.files[fileSystem.currentFileIndex];
    }
  };

  const get = (index) => {
    return fileSystem.files[index];
  };

  const findIndex = (name) => {
    return fileSystem.files.findIndex(file => file.name === name);
  };

  const newFile = () => {
    window.location.href = "/";
  };

  const rename = (index, newName) => {
        const files = fileSystem.files;
        files[index].name = newName;
        setFileSystem({
          fileSystem,
          files: files
        });
  };

  const write = (name, content) => {
    const files = fileSystem.files;
    const index = fileIndex(name);
    let writtenIndex = index;
    if (index !== -1) {
      // edit file
      files[index] = { name, content, language };
    } else {
      // new file
      const nlen = files.push({ name, content, language });
      writtenIndex = nlen - 1;
    }
    setFileSystem({
      currentFileIndex: writtenIndex,
      files: files
    });
  };

  const setCurrentIndex = (index) => {
    if (index < 0 || index > fileSystem.files.length) index = -1;
    setFileSystem({
      ...fileSystem,
      currentFileIndex: index
    });
  };

  const currentIndex = () => {
    return fileSystem.currentFileIndex;
  };

  const deleteFile = (name) => {
    const files = fileSystem.files.filter(file => file.name !== name);
    setFileSystem({
      ...fileSystem,
      files: files
    });
  };

  fs?.current = {
    all, getCurrent, get, new: newFile, rename, write,
    setCurrentIndex, findIndex, currentIndex, language,
    setLanguage, delete: deleteFile
  };

  return fs;
};

const FileItem = ({ index, selected, fileName, onRename, onDelete }) => {
  const contentRef = React.useRef();
  const [editMode, setEditMode] = React.useState(false);
  const [deleteMode, setDeleteMode] = React.useState(false);
  const keyPressHandler = (e) => {
    if (e.key === "Enter") {
      setEditMode(false);
      if (onRename) {
        onRename(index, contentRef.current.textContent);
      }
    }
  };

  const doubleClickHandler = () => {
    setEditMode(true);
    setTimeout(() => {
      document.execCommand('selectAll',false,null);
    }, 0);
  };

  const deleteFileHandler = () => {
    setDeleteMode(false);
    if (onDelete) {
      onDelete(fileName);
    }
  };

  return !deleteMode ? (
    <div
      className={`file-entry ${selected && "active"}`}
    >
      <a
        href={`#file=${fileName}`}
        ref={contentRef}
        contentEditable={editMode}
        onDoubleClick={doubleClickHandler}
        onKeyPress={keyPressHandler}
      >{fileName}</a>
      <button onClick={() => setDeleteMode(true)}>del</button>
    </div>
  ) : (
    <div
      className={`file-entry delete-mode`}
    >
      <div>delete {fileName}?</div>
      <button onClick={deleteFileHandler}>yes</button>
      <button onClick={() => setDeleteMode(false)}>no</button>
    </div>
  );
};

const App = () => {
  const editorRef = React.useRef();
  const languageRef = React.useRef(null);
  const languageChangeHandler = () => {
    const lang = languageRef.current.value;
    FileManager.current.setLanguage(lang);
  };
  const [waiting, setWaiting] = React.useState(false);
  const [executionOutput, setExecutionOutput] = React.useState({
    stdout: '',
    stderr: ''
  });
  const executeCode = (editor) => {
    setWaiting(true);
    const code = editor.getValue();
    fetch('/execute', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: code,
        lang: FileManager.current.language
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

  const codeEditor = useCodeEditor(editorRef, {
    "Cmd-Enter": executeCode,
    "Ctrl-Enter": executeCode
  }, null, [
    {
      command: "new",
      short: "new",
      fn: () => {
        FileManager.current.new();
      }
    },
    {
      command: "write",
      short: "w",
      fn: (editor, { args = [] }) => {
        const fileName = args[0] || FileManager.current.getCurrent()?.name;
        if (fileName) {
          FileManager.current.write(fileName, editor.getValue());
        } else {
          editor.openNotification(
            "Please specify a valid file name to write",
            {
              bottom: true,
              duration: 5000
            }
          );
        }
      }
    }
  ]);

  const FileManager = useFileSystem("__cpp-pad-file-system");

  React.useEffect(() => {
    const found = supportedLanguages.find(l => l.lang === FileManager.current.language);
    if (found) {
      if (FileManager.current.currentIndex() === -1) {
        codeEditor?.current?.setValue(found.template);
      }
      codeEditor?.current?.setOption('mode', found.cmMode);
    }
  }, [FileManager.current.language]);

  const locationHashChangeHandler = () => {
    const { hash } = window.location;
    const fileName = hash.match(/#file=(.*)/)?.pop();
    const index = FileManager.current.findIndex(fileName);
    FileManager.current.setCurrentIndex(index);
    if (index !== -1) {
      const { content, language } = FileManager.current.get(index);
      codeEditor?.current?.setValue(content);
      FileManager.current.setLanguage(language);
    }
  };

  React.useEffect(() => {
    locationHashChangeHandler();
    window.addEventListener("hashchange", locationHashChangeHandler, false);
    return () => {
      window.removeEventListener("hashchange", locationHashChangeHandler, false);
    }
  }, []);

  return (
    <>
      <div className="header">
        language:&nbsp;
        <select
          id="language-select"
          ref={languageRef}
          onChange={languageChangeHandler}
          value={FileManager.current.language}
        >
          {supportedLanguages.map(({ lang, name }) => <option key={lang} value={lang}>{name}</option>)}
        </select>
      </div>
      <div className="container">
        <div id="file-tree">
          <div className="file-controller">
            <button onClick={FileManager?.current.new}>New File</button>
          </div>
          {FileManager.current.all().map((file, index) => (
            <FileItem
              key={index}
              index={index}
              selected={index === FileManager.current.currentIndex()}
              fileName={file.name}
              onRename={FileManager?.current.rename}
              onDelete={FileManager?.current.delete}
            />
          ))}
        </div>
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
