'use babel';

// Some portions drawn from https://github.com/ben-eb/remark-word-wrap/blob/master/src/index.js

import is from 'unist-util-is';
import parents from 'unist-util-parents';
import visit from 'unist-util-visit';

// TODO: Make configurable.
const SENTENCE_BREAKS = true;
// Do a sentence wrap only after this column.
const SENTENCE_MIN_MARGIN = 15;
// A good compromise between old 80 char and being too wide to read comfortably.
const WRAP_WIDTH = 92;

/**
 * Split text into words, treating all whitespace as a break. Leading and trailing
 * spaces are preserved and go onto the first and last words.
 */
function splitWords(value) {
  const trimmed = value.trim();
  if (trimmed === '') {
    return [' '];
  }
  const words = trimmed.replace(/\s+/g, ' ').split(' ');
  if (value.match(/^\s+/)) {
    words[0] = ' ' + words[0];
  }
  if (value.match(/\s+$/)) {
    words[words.length - 1] = words[words.length - 1] + ' ';
  }
  return words;
}

function joinWords(lines) {
  return lines.map(line => line.join(' ')).join('\n');
}

function normalizeText(value) {
  return joinWords([splitWords(value)]);
}

/**
 * Heuristic: End of sentence must be two letters or more, with the last letter lowercase,
 * followed by a period, exclamation point, question mark, colon, or semicolon.
 * Except for colon or semicolon, a final or preceding parenthesis or quote is allowed.
 * TODO: This should be /\p{L}/u (with a toLower() call below), but we need Unicode regex support.
 * TODO: Could also handle rare cases with quotes and parentheses at sentence end.
 */
const SENTENCE_RE = /([a-z])([.?!]['"’”)]?|['"’”)][.?!]|[:;]) *$/;

/**
 * Is this word ending a sentence? Goal is to be conservative, not perfect, and avoid
 * false positives.
 */
function isEndOfSentenceWord(word) {
  return !!word.match(SENTENCE_RE);
}

/**
 * Text length of node. We skip delimiter characters [](), **..**, etc. for simplicity.
 */
function nodeLength(node) {
  let len = 0;
  if (is('text', node)) {
    len += node.value.length;
  } else if (is('image', node)) {
    len += node.url.length + (node.alt || '').length;
  } else if (is('link', node)) {
    len += node.url.length;
  } else if (is('linkReference', node)) {
    len += node.identifier.length;
  }
  if (node.children) {
    node.children.forEach(child => {
      len += nodeLength(child);
    });
  }
  // Breaks or anything else treated as zero length.
  return len;
}

const FIRST_WORD_RE = /^\s*(\S+)/;

function firstWord(text) {
  const match = text.match(FIRST_WORD_RE);
  return (match && match[1]) || '';
}

/**
 * Text length of the first wrappable portion of node.
 */
function nodeMinLength(node) {
  let len;
  if (is('text', node)) {
    len = firstWord(node.value).length;
  } else if (is('strong', node) || is('emphasis', node)) {
    // Only word wrap strong or emphasis text, not links.
    len = nodeMinLength(node.children[0]);
  } else {
    len = nodeLength(node);
  }
  return len;
}

export default function attacher(opts) {
  const { width } = {
    width: WRAP_WIDTH,
    ...opts
  };

  function visitor(node) {
    if (!is('paragraph', node)) {
      return;
    }

    // Maintain paragraph reflow logic: Full set of lines and column position.
    // Maintained for only the current block of text being wrapped.
    // The tricky things are around mixing text and sibling nodes (strong, emphasis, and link):
    // Case 1: You can't break after a node if the text follows it with no whitespace.
    // Case 2: You can't break before a node if the text precedes it with no whitespace.
    let position = 0;
    let breakAllowed = false;
    let sentenceEnded = false;
    let currentLine;
    let lines = [];

    function resetColumn() {
      position = 0;
      sentenceEnded = false;
      breakAllowed = false;
    }

    // Start accumulating lines fresh from current postion or on new line.
    function newText(withBreak) {
      currentLine = [];
      lines = [currentLine];
      if (withBreak) {
        resetColumn();
      }
    }

    // Add linebreak on current text.
    function breakLine() {
      // currentLine[currentLine.length - 1] = currentLine[currentLine.length - 1].trimRight();
      currentLine = [];
      lines.push(currentLine);
      resetColumn();
    }

    function addWord(word, followsSpace) {
      // Wrap if possible, also handling Case 1:
      breakAllowed = breakAllowed || followsSpace || word.startsWith(' ');
      const doSentenceBreak = SENTENCE_BREAKS && sentenceEnded && position >= SENTENCE_MIN_MARGIN;
      if (breakAllowed && (doSentenceBreak || position + word.length + 1 >= width)) {
        currentLine = [word.trimLeft()];
        lines.push(currentLine);
        position = word.length + 1;
      } else {
        currentLine.push(word);
        position += word.length + 1;
      }
      sentenceEnded = isEndOfSentenceWord(word);
      breakAllowed = word.endsWith(' ');
    }

    function addUnbreakableNode(node) {
      if (breakAllowed && position + nodeLength(node) + 1 >= width) {
        newText(true);
      }
      position += nodeLength(node);
      sentenceEnded = false;
      breakAllowed = false;
    }

    function getLineBrokenText() {
      return joinWords(lines);
    }

    function process(parent) {
      // Don't bother wrapping text inside links at all; just normalize the anchor text.
      // You can't wrap URLs. And wrapping anchor text is usually less clear than
      // splitting out the whole anchor and URL on one line.
      // We don't do this for emphasis or strong text, as they most often do flow well in the source.
      if (is('link', parent)) {
        parent.children[0].node.value = normalizeText(parent.children[0].node.value);
        addUnbreakableNode(parent);
        return;
      }

      for (let i = 0; i < parent.children.length; ++i) {
        const current = parent.children[i];
        const next = i + 1 < parent.children.length && parent.children[i + 1];

        if (current.children) {
          process(current);
        } else if (current.node.value) {
          newText();

          const words = splitWords(current.node.value);
          for (let j = 0; j < words.length; ++j) {
            addWord(words[j], j > 0);
          }

          // Add break at the end of this text node if the next next word/link isn't going to fit.
          // Unless there is no whitespace at the end of the last text node (Case 2).
          if (is('text', current) && next && position + nodeMinLength(next) + 1 >= width && words[words.length - 1].endsWith(' ')) {
            breakLine();
          }
          current.node.value = getLineBrokenText();
        }
      }
      return length;
    }

    process(parents(node));
  }

  return ast => visit(ast, visitor);
}
