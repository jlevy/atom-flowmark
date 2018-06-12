# atom-flowmark

Flowmark is a new, experimental Atom plugin to auto-format Markdown text, with the
addition of reflowing text on sentences when possible.
It’s a bit like if
[gofmt](https://utcc.utoronto.ca/~cks/space/blog/programming/GoWhyGofmtAccepted) and
[semantic linefeeds](http://rhodesmill.org/brandon/2012/one-sentence-per-line/) had a baby
written in JavaScript.

## Why auto-format Markdown?

Auto-formatting is known to be a Very Good Thing when multiple programmers work together.
But it turns out the same idea can be hard to apply for Markdown, mostly related to the
handling of paragraphs of text.
Inconsistent formatting details like stars or dashes are small annoyances easily fixed by
any auto-formatter.
But the real challenge of collaborative editing is *confusing diffs* and *merge conflicts*
common with multiple people editing paragraph-long lines on large GitHub-hosted Markdown
files.

Flowmark tries a different approach:
It intelligently breaks lines on sentence boundaries when they are reasonable, while still
preserving the Markdown.
This “stabilizes” the line wrapping, so small changes—say only a few words in one
sentence—only affect nearby lines.
It also wraps links intelligently, so they don’t bungle up your paragraphs.
Take a look at
[the source to this README](https://github.com/jlevy/atom-flowmark/blame/master/README.md)
for an example.
(And see [this discussion](https://github.com/shurcooL/markdownfmt/issues/17) for more
details.)

The hope is that you—or anyone else you collaborate with—can run it any time to clean up
your Markdown consistently, and with minimal diff churn.
Line diff counts on GitHub also become meaningful (unlike when whole paragraphs are
lines). Note that the Flowmark formatting rules a a little complex, but that’s okay, as
long as they’re consistent.

## Other features

- Full, deterministic Markdown support, based on [Remark](https://github.com/remarkjs/remark)
  and typographic fixes via [Textr](https://github.com/A/textr).
- Switches to smart quotes, dashes, and the like, to clean up
  [bad typewriter habits](https://practicaltypography.com/typewriter-habits.html).

## Installation and use

Install as usual in Atom, by going to preferences, select install, and search for
“flowmark”. You’ll then have a Flowmark menu item under *Packages*. Or use the hot key
Shift-Cmd-M to reformat the whole doc.

It helps to use [line-diff-details-plus](https://atom.io/packages/line-diff-details-plus),
[GitHub Desktop](https://desktop.github.com/), or something similar to see and review changes
before saving or committing.

## Alternatives and previous work

Auto-formatting Markdown has been done before, notably with
[tidy-markdown](https://github.com/slang800/tidy-markdown) and
[atom-tidy-markdown](https://github.com/slang800/atom-tidy-markdown) (also used in
[atom-beautify](https://github.com/Glavin001/atom-beautify)),
[markdownfmt](https://github.com/shurcooL/markdownfmt) (in Go), and
[atom-markdown-format](https://github.com/shurcooL-legacy/atom-markdown-format) (an Atom
plugin based on markdownfmt but now deprecated).
These don’t try to reflow text, however.
A related approach, just to detect errors, is
[linter-markdown](https://github.com/AtomLinter/linter-markdown), which uses
[remark-lint](https://github.com/remarkjs/remark-lint)’s framework in Atom.
