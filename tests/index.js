'use strict';

/* global atom */

var {readFile, copyFile} = require('fs').promises;
var path = require('path');
var test = require('tape');
var flowmark = require('..');

var {join, resolve} = path;

test('flowmark', function(t) {
  t.plan(4);

  atom.workspace.destroyActivePaneItem();
  flowmark.activate();

  Promise.resolve()
    // Assume people have the `whitespace` package, which normalizes trailing
    // whitespace, on.
    .then(() => atom.packages.activatePackage('whitespace'))

    .then(() => check(t, 'flowmark', 'flowmark:standard'))
    .then(() => check(t, 'footnote-norm', 'flowmark:normalizeFootnotes'))
    .then(() =>
      check(
        t,
        'footnotes-to-follow-punc',
        'flowmark:normalizeFootnotesToFollowPunctuation'
      )
    )
    .then(() => check(t, 'boldface-punc', 'flowmark:normalizeBoldface'));
});

function check(t, name, command) {
  var tests = join(resolve(__dirname, '..'), 'tests');
  var sourcePath = join(tests, 'testdoc.orig.md');
  var input = join(tests, 'testdoc.' + name + '.md');

  return Promise.resolve()
    .then(() => copyFile(sourcePath, input))
    .then(() => atom.workspace.open(input))
    .then(() => {
      var view = atom.views.getView(atom.workspace);
      var editor = atom.workspace.getActiveTextEditor();

      atom.commands.dispatch(view, command);

      return editor.save();
    })
    .then(() => Promise.all([readFile(sourcePath), readFile(input)]))
    .then(
      ([source, result]) =>
        t.not(source, result, '`' + name + '` should be flowmarked'),
      error => t.error(error, name)
    );
}
