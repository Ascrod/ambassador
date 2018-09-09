#filter substitution
#filter emptyLines
#include ../../shared/pref/preferences.inc
#include ../../shared/pref/uaoverrides.inc

pref("startup.homepage_override_url","https://www.github.com/ascrod/ambassador/");
pref("app.releaseNotesURL", "http://www.github.com/ascrod/ambassador/releases/");

// Updates disabled
pref("app.update.enabled", false);
pref("app.update.url", "");
