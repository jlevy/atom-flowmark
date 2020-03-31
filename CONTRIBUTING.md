# Contributing

Contributions are most welcome!
We use this heavily at [Holloway](https://www.holloway.com/) but I don’t have much time to
maintain it. (These are my own dev notes so I don’t have to remember all the commands.)

## Developing

To develop, make sure you’re running sources within Atom and are current:

```bash
# Uninstall if it's been isntalled before.
apm remove flowmark
# Use local
apm link .
# Install.
npm i
```

After that, use Reload Window (Ctrl-Cmd-Option-L) to reload all of Atom and activate
plugin.

## Testing

There are no fully automated unit tests, but there is a comprehensive test document that
*must* be run manually to ensure Flowmark is operating correctly.

Copy [testdoc.orig.md](tests/testdoc.orig.md) over [testdoc.flowmark.md](tests/testdoc.orig.md)
then run Flowmark default formatting and save.
Use git diff to review any churn is appropriate.
In general changes should only

Repeat if appropriate for other menu options:

- copy over testdoc.footnote-norm.md and test “Normalize footnotes”
- copy over testdoc.boldface-punc.md and test “Normalize punctuation boldfacing”

Add these files to the PR, to allow review on any churn in behavior.

Only change testdoc.orig.md or code, but never both at once in a commit.
This allows careful review of formatting behavior changes.

## Publishing

Usual Atom publishing methods:

```bash
apm publish patch
apm publish minor
```

This does a local commit to package.json, a local tag, pushes to GitHub, and then sends to
Atom registry.
Note that if something goes wrong, like auth isn’t set up right (on the git http/ssh repo
listed in package.json) it fails in a painful way because it has done the local commit and
tag, but then fails.
So you need to `git reset --hard` and `git tag -d` the new tag and start again.
Using ssh auth now as that works more reliably for me.
