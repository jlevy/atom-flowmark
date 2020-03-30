'use babel';

/* global atom */
/* eslint no-undef: "error" */
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */

import assert from 'assert';
import visit from 'unist-util-visit';
import mdastToString from 'mdast-util-to-string';

import {normalizeTextNodes} from './text-util';

// Simple insecure hash that's short (base 36).
// Needn't bother with sha1 or similar and all its deps.
// Loosely based on the Java version.
// https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
const simpleHash = value => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
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
    .replace(/[^a-z\d]/g, '')
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
  const footnoteIdMapping = {};
  const newFootnoteIds = new Set();
  const missingFootnoteIds = new Set();
  const orphanedFootnoteIds = new Set();
  const footnoteTextSet = new Set();
  let footnoteRefCount = 0;

  // Calculate new footnote ids based on present definitions and and assemble old->new id mapping.
  visit(mdast, 'footnoteDefinition', node => {
    assert(node.identifier, 'All footnote definitions should have an id');
    const definitionText = nodeText(node);
    footnoteTextSet.add(definitionText);
    const newId = generateFootnoteId(definitionText);
    footnoteIdMapping[node.identifier] = newId;
    newFootnoteIds.add(newId);
    console.log(
      `Mapping footnote id: ${node.type} ^${node.identifier} -> ^${
        footnoteIdMapping[node.identifier]
      }`
    );
  });

  assert(
    newFootnoteIds.size === footnoteTextSet.size,
    'Footnote hash id collision, which should be very unlikely'
  );

  // Apply the old->new mapping on ids, also dropping duplicate definitions.
  const referencesSeen = new Set();
  const definitionsSeen = new Set();
  visit(
    mdast,
    ['footnoteReference', 'footnoteDefinition'],
    (node, index, parent) => {
      const newId = footnoteIdMapping[node.identifier];
      if (node.type === 'footnoteReference') {
        if (newId) {
          node.identifier = newId;
        } else {
          missingFootnoteIds.add(node.identifier);
          node.identifier += '.missing';
        }

        footnoteRefCount++;
        referencesSeen.add(node.identifier);
      } else {
        assert(node.type === 'footnoteDefinition');
        assert(newId);
        if (definitionsSeen.has(newId)) {
          console.log(
            `Removing duplicate footnote definition for ^${node.identifier}`
          );
          parent.children.splice(index, 1);
          return index;
        }

        // For clarity, we un-wrap footnote definitions so they are on a single line.
        // Not essential to do this, but seems a little clearer here to really "normalize" and we can wrap them later.
        normalizeTextNodes(node);
        node.identifier = newId;
        definitionsSeen.add(newId);
        if (!referencesSeen.has(newId)) {
          orphanedFootnoteIds.add(node.identifier);
          node.identifier += '.orphan';
        }
      }

      return null;
    }
  );

  atom.notifications.addInfo(
    `Found ${footnoteRefCount} footnotes and ${
      newFootnoteIds.size
    } unique footnote definitions (${Object.keys(footnoteIdMapping).length -
      newFootnoteIds.size} duplicates dropped)`
  );
  if (missingFootnoteIds.size) {
    // These are a problem!
    atom.notifications.addWarning(
      `Found ${
        missingFootnoteIds.size
      } footnotes missing definitions (search for .missing): ${[
        ...missingFootnoteIds
      ]
        .sort()
        .join(', ')}`
    );
  }

  if (orphanedFootnoteIds.size) {
    // Orphaned definitions are technically harmless but probably are the result of some error or mistake so should be highlighted.
    atom.notifications.addWarning(
      `Leaving ${
        orphanedFootnoteIds.size
      } orphaned definitions in place (search for .orphan): ${[
        ...orphanedFootnoteIds
      ]
        .sort()
        .join(', ')}`
    );
  }
}

export default function attacher() {
  return ast => {
    normalizeFootnoteIds(ast);
  };
}
