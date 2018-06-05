'use babel';

import {
  CompositeDisposable
} from 'atom';

const textr = require('textr');
const remarkTextr = require('remark-textr');
const textrQuotes = require('typographic-quotes');
const textrApostrophes = require('typographic-apostrophes');
const textrEllipses = require('typographic-ellipses');
const textrEmDashes = require('typographic-em-dashes');
const textrEnDashes = require('typographic-en-dashes');

const unified = require('unified');
const parse = require('remark-parse');
const stringify = require('remark-stringify');
const wrap = require('./remark-smart-word-wrap');

// TODO: Expose (selected) options.

const LOCALE = 'en-us';

const TEXTR_PLUGINS = [textrQuotes, textrApostrophes, textrEllipses, textrEmDashes, textrEnDashes];
const TEXTR_OPTIONS = {
  locale: LOCALE
};
const TEXTR_SETTINGS = {
  plugins: TEXTR_PLUGINS,
  options: TEXTR_OPTIONS
};

const MARKDOWN_OPTS = {
  emphasis: '*',
  strong: '*',
  listItemIndent: 1
};

function runRemarkPlugins(text, plugins, cb) {
  unified()
    .use(parse)
    .use(plugins || [])
    .use(stringify, MARKDOWN_OPTS)
    .process(text, cb);
}

function runTextrPlugins(text, plugins, cb) {
  const tf = textr({
      locale: LOCALE
    })
    .use(...plugins);
  cb(null, tf.exec(text));
}

export default {

  subscriptions: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'flowmark:all': () => this.remarkText([
        [remarkTextr, TEXTR_SETTINGS], wrap
      ]),
      'flowmark:reformatPlain': () => this.remarkText([]),
      'flowmark:reformatWrap': () => this.remarkText([wrap]),
      'flowmark:smartQuotes': () => this.textrText(TEXTR_PLUGINS),
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  remarkText(plugins) {
    this.processText(runRemarkPlugins, plugins);
  },

  textrText(plugins) {
    this.processText(runTextrPlugins, plugins);
  },

  processText(func, plugins) {
    const editor = atom.workspace.getActiveTextEditor();

    const point = editor.getCursorBufferPosition();
    if (editor.getSelectedText().length === 0) {
      editor.selectAll();
    }
    const text = editor.getSelectedText();

    func(text,
      plugins,
      (err, result) => {
        if (err) {
          atom.notifications.addError('Unexpected error processing Markdown');
          throw err;
        } else {
          atom.notifications.addInfo('Reformatted Markdown');
          editor.insertText(String(result));
          editor.setCursorBufferPosition(point);
        }
      })
  }
};
