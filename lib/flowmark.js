'use babel';

import { CompositeDisposable } from 'atom';

const unified = require('unified');
const parse = require('remark-parse');
const stringify = require('remark-stringify');

// TODO: Consider adding too: https://github.com/remarkjs/remark-textr

function reformatMarkdownText(text, cb) {
  unified()
    .use(parse)
    .use(stringify, { emphasis: '*', strong: '*' })
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
    reformatMarkdownText(text, (err, file) => {
      if (err) {
        atom.notifications.addError('Error processing Markdown');
        atom.notifications.addError(report(err));
      } else {
        atom.notifications.addInfo('Reformatted Markdown');
        editor.insertText(String(file));
        editor.setCursorBufferPosition(point);
      }
    })
  }
};
