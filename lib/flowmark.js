'use babel';

const textr = require('textr');
const remarkTextr = require('remark-textr');
const textrQuotes = require('typographic-quotes');

const unified = require('unified');
const parse = require('remark-parse');
const stringify = require('remark-stringify');
const wrap = require('./remark-smart-word-wrap');

// We could use
// typographic-apostrophes, typographic-ellipses, typographic-em-dashes, typographic-en-dashes
// but they are literally one-line modules and it's better we have control, especially on em dashes.

function textrEllipses(input) {
  return input.replace(/\.{3}/gim, '…');
}

function textrApostrophes(input) {
  return input.replace(/(\w)'(\w)/gim, '$1’$2').replace(/'(\d0s)/gim, '’$1');
}

function textrEnDashes(input) {
  return input.replace(/(\d)-(\d)/gim, '$1–$2');
}

function textrEmDashes(input) {
  // Remove spaces around em dashes.
  return input.replace(/--/gim, '—').replace(/ +— +/gim, '—');
}

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

function runRemarkPlugins(plugins, text, cb) {
  unified()
    .use(parse)
    .use(plugins || [])
    .use(stringify, MARKDOWN_OPTS)
    .process(text, cb);
}

function runTextrPlugins(plugins, text, cb) {
  const tf = textr({
    locale: LOCALE
  }).use(...plugins);
  cb(null, tf.exec(text));
}

export default {
  all: (text, cb) => runRemarkPlugins([[remarkTextr, TEXTR_SETTINGS], wrap], text, cb),
  reformatPlain: (text, cb) => runRemarkPlugins([], text, cb),
  reformatWrap: (text, cb) => runRemarkPlugins([wrap], text, cb),
  smartQuotes: (text, cb) => runTextrPlugins(TEXTR_PLUGINS, text, cb)
};
