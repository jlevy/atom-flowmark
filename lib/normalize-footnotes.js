'use babel';

import assert from 'assert';
import visit from 'unist-util-visit';
import mdastToString from 'mdast-util-to-string';

// Simple insecure hash that's short (base 36).
// Needn't bother with sha1 or similar and all its deps.
// Loosely based on the Java version.
// https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
const simpleHash = str => {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Convert to 32bit integer
  }
  return new Uint32Array([hash])[0].toString(36);
};

const normalizeText = node => {
  return mdastToString(node).replace(/\s+/g, ' ');
};

const nodeText = definitionNode => {
  return definitionNode.url || normalizeText(definitionNode);
};

// Deterministic footnote id based on a string.
// Add a friendly mnemonic prefix based on text, including handling URLs.
const generateFootnoteId = text => {
  const prefix = text
    .slice(0, 50)
    .toLowerCase()
    .replace(/^https?[/:]*(www\.)?/, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10);
  return `${prefix}.${simpleHash(text).slice(-6)}`;
};

/**
 * Destructively modify MDAST to rename all footnote ids to be unique and based on
 * the contents of the footnote. Id is short and friendly id including a hash of the
 * contents, e.g. the text
 * "https://www.investopedia.com/terms/e/equity.asp" ends up with footnote id
 * "^investoped.dreyz4".
 */
function normalizeFootnoteIds(mdast) {
  const footnoteIds = {};
  const newFootnoteIds = new Set();
  const footnoteTextSet = new Set();

  visit(
    mdast,
    node => node.type === 'footnoteDefinition',
    node => {
      assert(node.identifier, 'All footnote definitions should have an id');
      const definitionText = nodeText(node);
      footnoteTextSet.add(definitionText);
      const newId = generateFootnoteId(definitionText);
      footnoteIds[node.identifier] = newId;
      newFootnoteIds.add(newId);
      console.log(`Mapping footnote id: ${node.type} ^${node.identifier} -> ^${footnoteIds[node.identifier]}`);
    }
  );

  assert(newFootnoteIds.size === footnoteTextSet.size, 'Footnote hash id collision, which should be very unlikely');

  const definitionsSeen = new Set();
  visit(
    mdast,
    node => node.type === 'footnoteReference' || node.type === 'footnoteDefinition',
    (node, index, parent) => {
      const newId = footnoteIds[node.identifier];
      if (newId) {
        if (node.type === 'footnoteDefinition') {
          if (definitionsSeen.has(newId)) {
            console.log(`Removing duplicate footnote definition for ^${node.identifier}`);
            parent.children.splice(index, 1);
            return index;
          }
          definitionsSeen.add(newId);
        }
        node.identifier = newId;
      }
      return null;
    }
  );

  atom.notifications.addInfo(`Found footnote ${Object.keys(footnoteIds).length} footnote definitions (${newFootnoteIds.size} unique)`);
}

export default function attacher(opts) {
  return ast => {
    normalizeFootnoteIds(ast);
  }
}
