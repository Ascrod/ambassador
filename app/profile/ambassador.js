# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

// This is needed to start Ambassador.
pref("toolkit.defaultChromeURI", "chrome://ambassador/content/ambassador.xul");

// Enable the extension manager.
pref("xpinstall.dialog.confirm", "chrome://mozapps/content/xpinstall/xpinstallConfirm.xul");
pref("xpinstall.dialog.progress.skin", "chrome://mozapps/content/extensions/extensions.xul?type=themes");
pref("xpinstall.dialog.progress.chrome", "chrome://mozapps/content/extensions/extensions.xul?type=extensions");
pref("xpinstall.dialog.progress.type.skin", "Extension:Manager-themes");
pref("xpinstall.dialog.progress.type.chrome", "Extension:Manager-extensions");
pref("extensions.update.enabled", true);
pref("extensions.update.interval", 86400);
pref("extensions.dss.enabled", false);
pref("extensions.dss.switchPending", false);
pref("extensions.ignoreMTimeChanges", false);
pref("extensions.logging.enabled", false);
pref("general.skins.selectedSkin", "classic/1.0");
pref("extensions.getAddons.cache.enabled", true);

// This means nothing because APO doesn't host Ambassador extensions,
// but I have to put something or the extension manager pukes.
pref("extensions.update.url", "https://addons.palemoon.org/");

pref("extensions.getAddons.showPane", false);
pref("extensions.logging.enabled", false);
pref("extensions.strictCompatibility", true);
pref("extensions.minCompatibleAppVersion", "1.0");

// Make the external protocol service happy
pref("network.protocol-handler.expose-all", false);
pref("network.protocol-handler.expose.irc", true);
pref("network.protocol-handler.expose.ircs", true);
pref("security.dialog_enable_delay", 0);

// Update prefs

// Always prompt by default.
pref("app.update.enabled", true);
pref("app.update.auto", false);
pref("app.update.silent", false);
pref("app.update.mode", 0);
pref("app.update.incompatible.mode", 0);

pref("app.update.url", "http://chatzilla.rdmsoft.com/xulrunner/update/2/%CHANNEL%?v=%VERSION%&b=%BUILD_ID%&o=%BUILD_TARGET%&ov=%OS_VERSION%&pv=%PLATFORM_VERSION%&");
pref("app.update.url.manual", "https://github.com/ascrod/ambassador/");
pref("app.update.url.details", "https://github.com/ascrod/ambassador/");

// Check every day, if download or install is deferred ask again each day.
pref("app.update.interval", 86400);
pref("app.update.nagTimer.download", 86400);
pref("app.update.nagTimer.restart", 86400);
pref("app.update.timer", 600000);

// Seems to be broken, and nothing else uses it.
pref("app.update.showInstalledUI", false);
