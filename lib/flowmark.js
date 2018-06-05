'use babel';

import {
  CompositeDisposable
} from 'atom';

const remarkTextr = require('remark-textr');
const typographicQuotes = require('typographic-quotes');
const typographicEllipses = require('typographic-ellipses');

const unified = require('unified');
const parse = require('remark-parse');
const stringify = require('remark-stringify');
const wrap = require('./remark-smart-word-wrap');

// TODO: Expose (selected) options.

const LOCALE = 'en-us';

const TEXTR_OPTS = {
  plugins: [ typographicQuotes, typographicEllipses ],
  options: { locale: LOCALE }
};

const MARKDOWN_OPTS = {
  emphasis: '*',
  strong: '*',
  listItemIndent: 1
};

function runPlugins(text, plugins, cb) {
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
      'flowmark:all': () => this.runRemark([[remarkTextr, TEXTR_OPTS], wrap]),
      'flowmark:reformatPlain': () => this.runRemark([]),
      'flowmark:reformatWrap': () => this.runRemark([wrap]),
      'flowmark:smartQuotes': () => this.runRemark([[remarkTextr, TEXTR_OPTS]]),
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  runRemark(plugins) {
    console.log('plugins',plugins)
    const editor = atom.workspace.getActiveTextEditor();

    const point = editor.getCursorBufferPosition();
    if (editor.getSelectedText().length === 0) {
      editor.selectAll();
    }
    const text = editor.getSelectedText();

    runPlugins(text,
      plugins,
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
