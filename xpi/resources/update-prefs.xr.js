// Always prompt by default.
pref("app.update.enabled", true);
pref("app.update.auto", false);
pref("app.update.silent", false);
pref("app.update.mode", 0);
pref("app.update.incompatible.mode", 0);

pref("app.update.url", "http://chatzilla.rdmsoft.com/xulrunner/update/2/%CHANNEL%?v=%VERSION%&b=%BUILD_ID%&o=%BUILD_TARGET%&ov=%OS_VERSION%&pv=%PLATFORM_VERSION%&");
pref("app.update.url.manual", "http://chatzilla.rdmsoft.com/xulrunner/");
pref("app.update.url.details", "http://chatzilla.rdmsoft.com/xulrunner/");

// Check every day, if download or install is deferred ask again each day.
pref("app.update.interval", 86400);
pref("app.update.nagTimer.download", 86400);
pref("app.update.nagTimer.restart", 86400);
pref("app.update.timer", 600000);

// Seems to be broken, and nothing else uses it.
pref("app.update.showInstalledUI", false);
