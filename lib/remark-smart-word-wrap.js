'use babel';

// Some portions drawn from https://github.com/ben-eb/remark-word-wrap/blob/master/src/index.js

import is from 'unist-util-is';
import visitParents from 'unist-util-visit-parents';

import {splitWords, joinWords, normalizeTextNodes} from './text-util';

// TODO: Make configurable.
const SENTENCE_BREAKS = true;
// Do a sentence wrap only after this column.
const SENTENCE_MIN_MARGIN = 15;
// A good compromise between old 80 char and being too wide to read comfortably.
const WRAP_WIDTH = 92;

/**
 * Heuristic: End of sentence must be two letters or more, with the last letter lowercase,
 * followed by a period, exclamation point, question mark, colon, or semicolon.
 * Except for colon or semicolon, a final or preceding parenthesis or quote is allowed.
 * TODO: This should be /\p{L}/u (with a toLower() call below), but we need Unicode regex support.
 * TODO: Could also handle rare cases with quotes and parentheses at sentence end.
 * TODO: Should be OK for most Latin langauges but may need to rethink 2-letter restriction.
 */
const SENTENCE_RE = /([A-Z\da-z'’][a-z])([.?!]['"’”)]?|['"’”)][.?!]|[:;]) *$/;

/**
 * Is this word ending a sentence? Goal is to be conservative, not perfect, and avoid
 * false positives.
 */
function isEndOfSentenceWord(word) {
  return Boolean(word.match(SENTENCE_RE));
}

/**
 * Text length of node. We skip delimiter characters [](), **..**, etc. for simplicity.
 */
function nodeLength(node) {
  let length = 0;
  if (is(node, 'text')) {
    length += node.value.length;
  } else if (is(node, 'image')) {
    length += node.url.length + (node.alt || '').length;
  } else if (is(node, 'link')) {
    length += node.url.length;
  } else if (is(node, 'linkReference')) {
    length += node.identifier.length;
  }

  if (node.children) {
    node.children.forEach(child => {
      length += nodeLength(child);
    });
  }

  // Breaks or anything else treated as zero length.
  return length;
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
  let length;
  if (is(node, 'text')) {
    length = firstWord(node.value).length;
  } else if (is(node, ['strong', 'emphasis'])) {
    // Only word wrap strong or emphasis text, not links.
    length = nodeMinLength(node.children[0]);
  } else {
    length = nodeLength(node);
  }

  return length;
}

export default function attacher(options) {
  const {width} = {
    width: WRAP_WIDTH,
    ...options
  };

  function visitor(node, ancestors) {
    // TODO: For now, we do not wrap or normalize footnote definitions at all since they need to be indented. Should add this.
    if (
      ancestors &&
      is(ancestors[ancestors.length - 1], 'footnoteDefinition')
    ) {
      return;
    }

    // Maintain paragraph reflow logic: Full set of lines and column position within each node.
    // Maintained for only the current piece of text being wrapped, which may begin at any column.
    // Rules: We just flow across all pieces, and ignore delimiter text when counting widths,
    // for simplicity. However there are a few tricky things are around mixing text and sibling
    // nodes (strong, emphasis, and link), when breaking is forbidden:
    // Case 1: You can't break after a node if the text follows it with no whitespace.
    // Case 2: You can't break before a node if the text precedes it with no whitespace.
    // Case 3: You can't break immediately at the start of a formatted node (strong, emphasis, or link).

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
    function newText(newNode, withBreak) {
      currentLine = [];
      lines = [currentLine];
      if (withBreak) {
        resetColumn();
      }
    }

    function trimTrailingWhitespace() {
      if (currentLine.length > 0) {
        currentLine[currentLine.length - 1] = currentLine[
          currentLine.length - 1
        ].trimEnd();
      }
    }

    // Add linebreak on current text, if allowed.
    function breakLine(isPlain) {
      // If a node isPlain, i.e. not inside a strong/emphasis/link, it's fine to break.
      // If a node is strong/emphasis/link formatted, we can't break it on the
      // first character, so have to wait until next opportunity.
      // Also avoid double breaks.
      // Handles Case 3.
      const breakOk = position > 0 && (isPlain || currentLine.length > 0);
      if (breakOk) {
        trimTrailingWhitespace();
        currentLine = [];
        lines.push(currentLine);
        resetColumn();
      }

      return breakOk;
    }

    function addWord(word, followsSpace, isPlain) {
      // Wrap if possible. Handles Case 1.
      breakAllowed = breakAllowed || followsSpace || word.startsWith(' ');
      const doSentenceBreak =
        SENTENCE_BREAKS && sentenceEnded && position >= SENTENCE_MIN_MARGIN;
      if (
        breakAllowed &&
        (doSentenceBreak || position + word.trimEnd().length + 1 >= width)
      ) {
        const didBreak = breakLine(isPlain);
        if (word === ' ') {
          return;
        }

        currentLine.push(didBreak ? word.trimStart() : word);
      } else {
        currentLine.push(word);
      }

      position += word.length + 1;
      sentenceEnded = isEndOfSentenceWord(word);
      breakAllowed = word.endsWith(' ');
    }

    function addUnbreakableNode(node) {
      if (breakAllowed && position + nodeLength(node) + 1 >= width) {
        newText(node, true);
      }

      position += nodeLength(node);
      sentenceEnded = false;
      breakAllowed = false;
    }

    function getLineBrokenText() {
      return joinWords(lines);
    }

    function process(parent, formatChain) {
      // Don't bother wrapping text inside links at all; just normalize the anchor text.
      // You can't wrap URLs. And wrapping anchor text is usually less clear than
      // splitting out the whole anchor and URL on one line.
      // We don't do this for emphasis or strong text, as they most often do flow well in the source.
      if (is(parent, 'link')) {
        addUnbreakableNode(parent);
        return;
      }

      for (let i = 0; i < parent.children.length; ++i) {
        const current = parent.children[i];
        const next = i + 1 < parent.children.length && parent.children[i + 1];

        if (current.children) {
          process(current, formatChain.concat(current.type));
        } else if (is(current, 'text')) {
          newText(current, false);

          const isPlain = formatChain.length === 0;
          const words = splitWords(current.value);
          for (const [j, element] of words.entries()) {
            addWord(element, j > 0, isPlain);
          }

          // Add break at the end of this text node if the next next word/link isn't going to fit.
          // Unless there is no whitespace at the end of the last text node.
          // Handles Case 2.
          if (
            next &&
            position + nodeMinLength(next) + 1 >= width &&
            words[words.length - 1].endsWith(' ')
          ) {
            breakLine(isPlain);
          }

          current.value = getLineBrokenText();
        }
      }
    }

    process(node, []);
  }

  return ast => {
    // Mutate all pure text nodes to have normalized whitespace, so we don't
    // confuse ' ' and '\n' etc.
    normalizeTextNodes(ast);
    // Then walk all nodes.
    visitParents(ast, 'paragraph', visitor);
  };
}
