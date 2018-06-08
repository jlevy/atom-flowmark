# atom-flowmark

Flowmark is a new, experimental Atom plugin to auto-format Markdown text, with the
addition of reflowing text on sentences when possible.
It’s a bit like if
[gofmt](https://utcc.utoronto.ca/~cks/space/blog/programming/GoWhyGofmtAccepted) and
[semantic linefeeds](http://rhodesmill.org/brandon/2012/one-sentence-per-line/) had a baby
written in JavaScript.

**Why line wrap markdown?** This is useful not just for the appearance of the Markdown to the
person writing, but to minimize the *confusing diffs* and *merge conflicts* common with
paragraph-long lines on large GitHub-hosted files.
It does this by preferring line breaks on sentence boundaries when they are reasonable.
It also wraps links intelligently, so they don’t bungle up your paragraphs.
(Take a look at the source to this file for an example.
And see [this discussion](https://github.com/shurcooL/markdownfmt/issues/17) for more
details.)

The hope is that you—or anyone else you collaborate with—can run it any time to clean up
your Markdown consistently.
Note that formatting rules can be complex, as long as they’re consistent.

**Other features:**

- Full, deterministic Markdown support, based on
  [Remark](https://github.com/remarkjs/remark) and typographic fixes via
  [Textr](https://github.com/A/textr).
- Switches to smart quotes, dashes, and the like (by default).

**Installation and use:** Install as usual in Atom, by going to preferences, select install,
and search for “flowmark”. You’ll then have a Flowmark menu item under “Packages.”
Or use the hot key Shift-Cmd-M to reformat the whole doc.

It helps to use [line-diff-details-plus](https://atom.io/packages/line-diff-details-plus),
[GitHub Desktop](https://desktop.github.com/), or something similar to see and review
changes before saving or committing.

**Alternatives and previous work:** Auto-formatting Markdown has been done before, notably
with [tidy-markdown](https://github.com/slang800/tidy-markdown) and
[atom-tidy-markdown](https://github.com/slang800/atom-tidy-markdown) (also used in
[atom-beautify](https://github.com/Glavin001/atom-beautify)),
[markdownfmt](https://github.com/shurcooL/markdownfmt) (in Go), and
[atom-markdown-format](https://github.com/shurcooL-legacy/atom-markdown-format) (an Atom
plugin based on markdownfmt but now deprecated). These don’t try to reflow text, however.
A related approach, just to detect errors, is
[linter-markdown](https://github.com/AtomLinter/linter-markdown), which uses
[remark-lint](https://github.com/remarkjs/remark-lint)’s framework in Atom.
