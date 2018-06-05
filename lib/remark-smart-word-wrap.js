'use babel';

// Some portions drawn from https://github.com/ben-eb/remark-word-wrap/blob/master/src/index.js

import is from 'unist-util-is';
import parents from 'unist-util-parents';
import visit from 'unist-util-visit';

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

/**
 * Heuristic: End of sentence must be two letters or more, with the last letter lowercase,
 * followed by a period.
 */
function isEndOfSentenceWord(word) {
  const lastLetter = word.length > 1 && word[word.length - 2];
  // TODO: How can we support /\p{L}/u to handle all Unicode letters?
  return !!(lastLetter && lastLetter.toLowerCase() === lastLetter && word.match(/[a-zA-Z]+\./));
}

// TODO: Make configurable.
const SENTENCE_BREAKS = true;
const SENTENCE_MIN_MARGIN = 15;

function nodeLength(node) {
  let len = 0;
  if (is('text', node)) {
    len += node.value.length;
  } else if (is('image', node)) {
    len += node.url.length + (node.alt || '').length;
  } else if (is('link', node)) {
    len += node.url.length + 4;  // Extra delimiters []()
  } else if (is('linkReference', node)) {
    len += node.identifier.length + 4;  // Extra delimiters [][]
  }
  if (node.children) {
    node.children.forEach(child => {
      len += nodeLength(child);
    });
  }
  // Breaks or anything else treated as zero length.
  return len;
}

export default function attacher(opts) {
  const {
    width
  } = {
    // A good compromise between old 80 char and being too wide to read comfortably.
    width: 92,
    ...opts,
  };

  function visitor(node) {
    if (node.type !== 'paragraph') {
      return;
    }

    // Maintain paragraph reflow logic: Full set of lines and column position.
    // Maintained for only the current block of text being wrapped.
    // The tricky things are around mixing text and links:
    // Tricky Case 1: You can't break after a link if the text follows it with no whitespace.
    // Tricky Case 2: You can't break before a link if the text precedes it with no whitespace.
    let position = 0;
    let textIsFollowingLink = false;
    let sentenceEnded = false;
    let currentLine;
    let lines = [];

    function newText() {
      currentLine = [];
      lines = [currentLine];
    }

    function breakLine() {
      currentLine = [];
      lines.push(currentLine);
      position = 0;
    }

    function addWord(word) {
      // Wrap if possible, also handling Tricky Case 1:
      const textDirectlyAfterLink = (textIsFollowingLink && !word.startsWith(' '));
      const doSentenceBreak = SENTENCE_BREAKS && sentenceEnded && position >= SENTENCE_MIN_MARGIN;
      if (!doSentenceBreak && (textDirectlyAfterLink || position + word.length + 1 < width)) {
        currentLine.push(word);
        position += word.length + 1;
      } else {
        currentLine = [word.trimLeft()];
        lines.push(currentLine);
        position = word.length + 1;
      }
      sentenceEnded = isEndOfSentenceWord(word);
      textIsFollowingLink = false;
    }

    function addLink(node) {
      if (position + nodeLength(node) + 1 >= width) {
        newText();
        position = 0;
      }
      position += nodeLength(node);
      sentenceEnded = false;
      textIsFollowingLink = true;
    }

    function getLineBrokenText() {
      return joinWords(lines);
    }

    function wrapText(parent) {
      // Don't bother wrapping text inside links at all. You can't wrap URLs and wrapping anchor text is usually less clear than
      // splitting out the whole anchor and URL on one line.
      // We don't do this for emphasis or strong text, as they most often do flow well in the source.
      if (parent.type === 'link') {
        addLink(parent);
        return;
      }

      for (let i = 0; i < parent.children.length; ++i) {
        const current = parent.children[i];
        const next = i + 1 < parent.children.length && parent.children[i + 1];

        if (current.children) {
          wrapText(current);
        } else if (current.node.value) {
          newText();

          const words = splitWords(current.node.value);
          words.forEach(word => {
            addWord(word);
          });

          // Add break at the end of this text node if the next link isn't going to fit anyway.
          // Unless there is no whitespace at the end of the last text node (Tricky Case 2).
          if (current.type === 'text' && next && next.type === 'link' && position + nodeLength(next) + 1 >= width &&
            words[words.length - 1].endsWith(' ')) {
            breakLine();
          }
          current.node.value = getLineBrokenText();
        }
      }
      return length;
    }

    wrapText(parents(node));
  }

  return ast => visit(ast, visitor);
}
