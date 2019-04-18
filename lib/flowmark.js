'use babel';

const textr = require('textr');
const remarkTextr = require('remark-textr');
const textrQuotes = require('typographic-quotes');

const unified = require('unified');
const parse = require('remark-parse');
const stringify = require('remark-stringify');
const frontmatter = require('remark-frontmatter')
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
  // Regular and em dashes between digits should be en dashes.
  return input.replace(/(\d)-(\d)/gim, '$1–$2').replace(/(\d)—(\d)/gim, '$1–$2');
}

function textrEmDashes(input) {
  // Replace double dash with em dash; replace isolated en dashes with em dashes;
  // remove spaces around em dashes.
  return input.replace(/--/gim, '—')
              .replace(/ – /gim, ' — ')
              .replace(/ +— +/gim, '—');
}

/**
 * Do some general cleanup of a set of common Markdown mis-escaping or unhelpful
 * junk resulting from GDocs->Word->pandoc->Markdown export.
 */
function heavyCleanup(input) {
  // TODO: Some of the backslash escapes should be handled by Flowmark instead
  // being of unescaped here.
  return input.replace(/    > /gim, '    ')
              .replace(/<!-- -->/gim, '')
              .replace(/\\'/gim, "'")
              .replace(/\\"/gim, '"')
              .replace(/\\\$/gim, '$')
              .replace(/\\~/gim, '~')
              .replace(/\\>/gim, '>')
              .replace(/\[([^\[\]]*?)\]\{.underline\}/gim, '$1');
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
    .use(frontmatter, ['yaml', 'toml'])
    .process(text, cb);
}

function runTextrPlugins(plugins, text, cb) {
  const tf = textr({
    locale: LOCALE
  }).use(...plugins);
  cb(null, tf.exec(text));
}

export default {
  // Default standard full option.
  all: (text, cb) => runRemarkPlugins([[remarkTextr, TEXTR_SETTINGS], wrap], text, cb),

  // A few custom options.
  reformatPlain: (text, cb) => runRemarkPlugins([], text, cb),
  reformatWrap: (text, cb) => runRemarkPlugins([wrap], text, cb),
  smartQuotes: (text, cb) => runTextrPlugins(TEXTR_PLUGINS, text, cb),
  heavyCleanup: (text, cb) => cb(null, heavyCleanup(text))
};
