#filter substitution
#filter emptyLines
#include ../../shared/pref/preferences.inc
#include ../../shared/pref/uaoverrides.inc

pref("startup.homepage_override_url","https://www.github.com/ascrod/ambassador/");
pref("app.releaseNotesURL", "https://www.github.com/ascrod/ambassador/releases/latest/");

// Updates disabled
pref("app.update.enabled", false);
pref("app.update.url", "");

// Number of usages of the web console or scratchpad.
// If this is less than 5, then pasting code into the web console or scratchpad is disabled
pref("devtools.selfxss.count", 100);
