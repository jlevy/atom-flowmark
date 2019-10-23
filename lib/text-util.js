'use babel';

import is from 'unist-util-is';

/**
 * Split text into words, treating all whitespace as a break. Leading and trailing
 * spaces are preserved and go onto the first and last words.
 */
export function splitWords(value) {
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

export function joinWords(lines) {
  return lines.map(line => line.join(' ')).join('\n');
}

export function normalizeText(value) {
  return joinWords([splitWords(value)]);
}

export function normalizeTextNodes(node) {
  if (is('text', node) && node.value) {
    node.value = normalizeText(node.value);
  }
  if (node.children) {
    node.children.forEach(child => normalizeTextNodes(child));
  }
}
