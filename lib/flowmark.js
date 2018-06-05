'use babel';

import {
  CompositeDisposable
} from 'atom';

const unified = require('unified');
const parse = require('remark-parse');
const stringify = require('remark-stringify');
const wrap = require('./remark-smart-word-wrap');


const MARKDOWN_OPTS = {
  emphasis: '*',
  strong: '*',
  listItemIndent: 1
};

function runRemark(text, plugins, cb) {
  unified()
    .use(parse)
    .use(plugins || [])
    .use(stringify, MARKDOWN_OPTS)
    .process(text, cb);
}

export default {

  subscriptions: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'flowmark:reformat': () => this.reformat()
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  reformat() {
    const editor = atom.workspace.getActiveTextEditor();

    const point = editor.getCursorBufferPosition();
    if (editor.getSelectedText().length === 0) {
      editor.selectAll();
    }
    const text = editor.getSelectedText();

    // TODO: Consider adding too: https://github.com/remarkjs/remark-textr
    runRemark(text,
      [wrap],
      (err, file) => {
        if (err) {
          atom.notifications.addError('Unexpected error processing Markdown');
          throw err;
        } else {
          atom.notifications.addInfo('Reformatted Markdown');
          editor.insertText(String(file));
          editor.setCursorBufferPosition(point);
        }
      })
  }
};
