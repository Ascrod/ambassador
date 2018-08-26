// Default Prefs

// This is needed to start Ambassador.
pref("toolkit.defaultChromeURI", "chrome://chatzilla/content/chatzilla.xul");

// Enable the extension manager...
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
pref("extensions.checkUpdateSecurity", false);
pref("extensions.getAddons.cache.enabled", true);

// This means nothing because AMO doesn't host Ambassador extensions,
// but I have to put something or the extension manager pukes.
pref("extensions.update.url", "chrome://mozapps/locale/extensions/extensions.properties");
pref("extensions.getMoreExtensionsURL", "chrome://mozapps/locale/extensions/extensions.properties");
pref("extensions.getMoreThemesURL", "chrome://mozapps/locale/extensions/extensions.properties");

pref("extensions.getAddons.showPane", false);

// make the external protocol service happy
pref("network.protocol-handler.expose-all", false);
pref("network.protocol-handler.expose.irc", true);
pref("network.protocol-handler.expose.ircs", true);
pref("security.dialog_enable_delay", 0);

pref("general.useragent.extra.ambassador", "Ambassador/@REVISION@");
