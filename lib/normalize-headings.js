'use babel';

/* global atom */
/* eslint no-undef: "error" */
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */

import visit from 'unist-util-visit';
import {titleCase} from 'title-case';

function normalizeHeadings(mdast) {
  const totals = [0, 0, 0, 0, 0, 0];
  const modifieds = [0, 0, 0, 0, 0, 0];

  function normalizeTextCase(mdast, depth) {
    visit(mdast, 'text', node => {
      const newText = titleCase(node.value);
      if (newText !== node.value) {
        node.value = newText;
        modifieds[depth] += 1;
      }

      totals[depth] += 1;
    });
  }

  visit(mdast, 'heading', node => {
    normalizeTextCase(node, node.depth);
    return visit.SKIP;
  });

  let summary = [];
  for (let i = 1; i < totals.length; i++) {
    summary.push(`${modifieds[i]}/${totals[i]} H${i}s`);
  }

  atom.notifications.addInfo(`Normalized headings: ${summary.join(', ')}`);
}

export default function attacher() {
  return ast => {
    normalizeHeadings(ast);
  };
}
