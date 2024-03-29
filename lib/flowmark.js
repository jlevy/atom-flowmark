'use babel';

const textr = require('textr');
const remarkTextr = require('remark-textr');
const textrQuotes = require('typographic-quotes');

const unified = require('unified');
const parse = require('remark-parse');
const stringify = require('remark-stringify');
const footnotes = require('remark-footnotes');
const frontmatter = require('remark-frontmatter');
const math = require('remark-math');
const wrap = require('./remark-smart-word-wrap');
const normalizeFootnotes = require('./normalize-footnotes');
const normalizeHeadings = require('./normalize-headings');

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
  // Regular and em dashes between pairs of digits should be en dashes.
  // Important: Insist on whitespace or other separation before and after, to avoid
  // munging URLs etc.
  // TODO: Consider broadening this rule but then restricting it so it does not affect URLs.
  return input
    .replace(/((?:\s|^)\d+)-(\d+(?:\s|$))/gim, '$1–$2')
    .replace(/((?:\s|^)\d+)—(\d+(?:\s|$))/gim, '$1–$2');
}

function textrEmDashes(input) {
  // Replace double dash with em dash; replace isolated en dashes with em dashes;
  return input.replace(/--/gim, '—').replace(/ – /gim, ' — ');
  // We no longer remove spaces around em dashes, as sometimes we want to use em dashes as separators.
  // TODO: Expose this rule via a more aggressive punctuation cleanup menu option:
  // .replace(/ +— +/gim, '—');
}

/**
 * Very specific cleanup to ensure that when text is boldfaced, certain trailing punctuation
 * marks are also boldfaced consistently, but only if it appears at the beginning of a line,
 * so inline headings look cleaner (especially in print).
 */
function normalizeBoldface(input) {
  return input.replace(
    /^(\s*[-*]\s+)\*\*(.*?)\*\*([.:?!])( |$)/gim,
    '$1**$2$3**$4'
  );
}

/**
 * Move footnotes to trail punctuation like commas, full stops, and other punctuation.
 * Makes footnotes look cleaner and conforms with typical typographic conventions.
 * Matches multiple of footnotes if needed.
 */
function normalizeFootnotesToFollowPunctuation(input) {
  return input.replace(/([\w*)])(\[\^.*?])([,.!?:;][’”'"]?)/gim, '$1$3$2');
}

/**
 * Do some general cleanup of a set of common Markdown mis-escaping or unhelpful
 * junk resulting from GDocs->Word->pandoc->Markdown export.
 */
function heavyCleanup(input) {
  // TODO: Some of the backslash escapes should be handled by Flowmark instead
  // being of unescaped here.
  return input
    .replace(/ {4}> /gim, '    ')
    .replace(/<!-- -->/gim, '')
    .replace(/\\'/gim, "'")
    .replace(/\\"/gim, '"')
    .replace(/\\\$/gim, '$')
    .replace(/\\~/gim, '~')
    .replace(/\\>/gim, '>')
    .replace(/\\</gim, '<')
    .replace(/\\@/gim, '@')
    .replace(/\\\\ >/gim, '\n') // Some newlines get converted erroneously.
    .replace(/\[([^[\]]*?)]{.underline}/gim, '$1') // Pandoc exports often have underlined links.
    .replace(/\[([^[\]]*?)]{.ul}/gim, '$1') // Another variation on underlined links.
    .replace(/\[(http.*?)]\(\1\)/gim, '$1'); // Some editors set a link to be its own anchor text, which is ugly and pointless.
}

// TODO: Expose (selected) options.

const LOCALE = 'en-us';

const TEXTR_PLUGINS = [
  textrQuotes,
  textrApostrophes,
  textrEllipses,
  textrEmDashes,
  textrEnDashes
];

const TEXTR_OPTIONS = {
  locale: LOCALE
};

const TEXTR_SETTINGS = {
  plugins: TEXTR_PLUGINS,
  options: TEXTR_OPTIONS
};

// Conventions for official "Flowmark" style.
// Change with care as they affect current documents.
// https://github.com/remarkjs/remark/tree/master/packages/remark-stringify
const MARKDOWN_OPTS = {
  // Defaults left as is: gfm is true, bullet is '-'
  // TODO: Use commonmark: true? But inserts HTML comments as para breaks.
  emphasis: '*',
  strong: '*',
  fences: true,
  listItemIndent: 1,
  tablePipeAlign: false
};

function runRemarkPlugins(plugins, text, cb) {
  unified()
    .use(parse, MARKDOWN_OPTS)
    .use(plugins || [])
    .use(stringify, MARKDOWN_OPTS)
    .use(footnotes)
    .use(frontmatter, ['yaml', 'toml'])
    .use(math)
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
  standard: (text, cb) =>
    runRemarkPlugins([[remarkTextr, TEXTR_SETTINGS], wrap], text, cb),

  // A few custom options.
  reformatPlain: (text, cb) => runRemarkPlugins([], text, cb),
  reformatWrap: (text, cb) => runRemarkPlugins([wrap], text, cb),
  smartQuotes: (text, cb) => runTextrPlugins(TEXTR_PLUGINS, text, cb),
  normalizeHeadings: (text, cb) =>
    runRemarkPlugins([normalizeHeadings], text, cb),
  normalizeBoldface: (text, cb) => cb(null, normalizeBoldface(text)),
  normalizeFootnotes: (text, cb) =>
    runRemarkPlugins([normalizeFootnotes], text, cb),
  normalizeFootnotesToFollowPunctuation: (text, cb) =>
    cb(null, normalizeFootnotesToFollowPunctuation(text)),
  heavyCleanup: (text, cb) => cb(null, heavyCleanup(text))
};
