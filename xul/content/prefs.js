/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/ 
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License. 
 *
 * The Original Code is ChatZilla
 * 
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation
 * Portions created by Netscape are
 * Copyright (C) 1998 Netscape Communications Corporation.
 *
 * Alternatively, the contents of this file may be used under the
 * terms of the GNU Public License (the "GPL"), in which case the
 * provisions of the GPL are applicable instead of those above.
 * If you wish to allow use of your version of this file only
 * under the terms of the GPL and not to allow others to use your
 * version of this file under the MPL, indicate your decision by
 * deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL.  If you do not delete
 * the provisions above, a recipient may use your version of this
 * file under either the MPL or the GPL.
 *
 * Contributor(s):
 *  Robert Ginda, <rginda@netscape.com>, original author
 *
 */

const DEFAULT_NICK = "IRCMonkey"

function initPrefs()
{
    client.prefManager = new PrefManager("extensions.irc.");
    client.prefManagers = [client.prefManager];

    client.prefs = client.prefManager.prefs;
    
    var profilePath = getSpecialDirectory("ProfD");
    profilePath.append("chatzilla");

    client.prefManager.addPref("profilePath", profilePath.path);
    
    profilePath = new nsLocalFile(client.prefs["profilePath"]);
    
    if (!profilePath.exists())
        mkdir(profilePath);

    client.prefManager.profilePath = profilePath;

    var scriptPath = profilePath.clone();
    scriptPath.append("scripts");
    if (!scriptPath.exists())
        mkdir(scriptPath);
    client.prefManager.scriptPath = scriptPath;

    var logPath = profilePath.clone();
    logPath.append("logs");
    if (!logPath.exists())
        mkdir(logPath);
    client.prefManager.logPath = logPath;

    var logDefault = client.prefManager.logPath.clone();
    logDefault.append(escapeFileName("client.log"));

    var prefs =
        [
         ["aliases",            []],
         ["bugURL",           "http://bugzilla.mozilla.org/show_bug.cgi?id=%s"],
         ["channelHeader",      true],
         ["channelLog",         false],
         ["channelMaxLines",    500],
         ["charset",            "utf-8"],
         ["clientMaxLines",     200],
         ["collapseMsgs",       false],
         ["copyMessages",       true],
         ["debugMode",          ""],
         ["desc",               "New Now Know How"],
         ["deleteOnPart",       true],
         ["displayHeader",      true],
         ["guessCommands",      true],
         ["focusChannelOnJoin", true],
         ["initialURLs",        []],
         ["initialScripts",     [getURLSpecFromFile(scriptPath.path)]],
         ["log",                false],
         ["logFileName",        logDefault.path],
         ["messages.click",     "goto-url"],
         ["messages.ctrlClick", "goto-url-newwin"],
         ["messages.metaClick", "goto-url-newtab"],
         ["motif.dark",         "chrome://chatzilla/skin/output-dark.css"],
         ["motif.light",        "chrome://chatzilla/skin/output-light.css"],
         ["motif.default",      "chrome://chatzilla/skin/output-default.css"],
         ["motif.current",      "chrome://chatzilla/skin/output-default.css"],
         ["msgBeep",            "beep beep"],
         ["multiline",          false],
         ["munger.colorCodes",  true],
         ["networkHeader",      true],
         ["networkLog",         false],
         ["networkMaxLines",    200],
         ["newTabLimit",        15],
         ["notify.aggressive",  true],
         ["nickCompleteStr",    ":"],
         ["nickname",           DEFAULT_NICK],
         ["outgoing.colorCodes",  false],
         ["outputWindowURL",   "chrome://chatzilla/content/output-window.html"],
         ["sortUsersByMode",    true],
         ["queryBeep",          "beep"],
         ["raiseNewTab",        false],
         ["reconnect",          true],
         ["showModeSymbols",    false],
         ["stalkBeep",          "beep"],
         ["stalkWholeWords",    true],
         ["stalkWords",         []],
         ["username",           "chatzilla"],
         ["usermode",           "+i"],
         ["userHeader",         true],
         ["userLog",            false],
         ["userMaxLines",       200]
        ];

    client.prefManager.addPrefs(prefs);
    client.prefManager.onPrefChanged = onPrefChanged;

    CIRCNetwork.prototype.stayingPower  = client.prefs["reconnect"];
    CIRCNetwork.prototype.INITIAL_NICK  = client.prefs["nickname"];
    CIRCNetwork.prototype.INITIAL_NAME  = client.prefs["username"];
    CIRCNetwork.prototype.INITIAL_DESC  = client.prefs["desc"];
    CIRCNetwork.prototype.INITIAL_UMODE = client.prefs["usermode"];
    CIRCNetwork.prototype.MAX_MESSAGES  = client.prefs["networkMaxLines"];
    CIRCChannel.prototype.MAX_MESSAGES  = client.prefs["channelMaxLines"];
    CIRCChanUser.prototype.MAX_MESSAGES = client.prefs["userMaxLines"];
    client.MAX_MESSAGES                 = client.prefs["clientMaxLines"];
    client.charset                      = client.prefs["charset"];

    initAliases();
}

function pref_mungeName(name)
{
    return escape(name.replace(/\./g, "-").replace(/:/g, "_").toLowerCase());
}

function getNetworkPrefManager(network)
{
    function defer(prefName)
    {
        return client.prefs[prefName];
    };

    function onPrefChanged(prefName, newValue, oldValue)
    {
        onNetworkPrefChanged (network, prefName, newValue, oldValue);
    };

    var logDefault = client.prefManager.logPath.clone();
    logDefault.append(escapeFileName(pref_mungeName(network.name)) + ".log");

    var prefs =
        [
         ["charset",          defer],
         ["collapseMsgs",     defer],
         ["desc",             defer],
         ["displayHeader",    client.prefs["networkHeader"]],
         ["log",              client.prefs["networkLog"]],
         ["logFileName",      logDefault.path],
         ["motif.current",    defer],
         ["nickname",         defer],
         ["outputWindowURL",  defer],
         ["reconnect",        defer],
         ["username",         defer],
         ["usermode",         defer]
        ];

    var branch = "extensions.irc.networks." + pref_mungeName(network.name) +
        ".";
    var prefManager = new PrefManager(branch);
    prefManager.addPrefs(prefs);
    prefManager.onPrefChanged = onPrefChanged;

    network.INITIAL_NICK  = prefManager.prefs["nickname"];
    network.INITIAL_NAME  = prefManager.prefs["username"];
    network.INITIAL_DESC  = prefManager.prefs["desc"];
    network.INITIAL_UMODE = prefManager.prefs["usermode"];
    network.stayingPower  = prefManager.prefs["reconnect"];

    client.prefManagers.push(prefManager);

    return prefManager;
}

function getChannelPrefManager(channel)
{
    var network = channel.parent.parent;

    function defer(prefName)
    {
        return network.prefs[prefName];
    };
    
    function onPrefChanged(prefName, newValue, oldValue)
    {
        onChannelPrefChanged (channel, prefName, newValue, oldValue);
    };
    
    var logDefault = client.prefManager.logPath.clone();
    var filename = pref_mungeName(network.name) + "," + 
        pref_mungeName(channel.name);
    
    logDefault.append(escapeFileName(filename) + ".log");

    var prefs =
        [
         ["charset",          defer],
         ["collapseMsgs",     defer],
         ["displayHeader",    client.prefs["channelHeader"]],
         ["log",              client.prefs["channelLog"]],
         ["logFileName",      logDefault.path],
         ["motif.current",    defer],
         ["outputWindowURL",  defer]
        ];
    
    var branch = "extensions.irc.networks." + pref_mungeName(network.name) +
        ".channels." + pref_mungeName(channel.normalizedName) + "."
    var prefManager = new PrefManager(branch);
    prefManager.addPrefs(prefs);
    prefManager.onPrefChanged = onPrefChanged;

    client.prefManagers.push(prefManager);
    
    return prefManager;
}

function getUserPrefManager(user)
{
    var network = user.parent.parent;

    function defer(prefName)
    {
        return network.prefs[prefName];
    };
    
    function onPrefChanged(prefName, newValue, oldValue)
    {
        onUserPrefChanged (user, prefName, newValue, oldValue);
    };
    
    var logDefault = client.prefManager.logPath.clone();
    var filename = pref_mungeName(network.name);
    filename += "," + pref_mungeName(user.nick);
    logDefault.append(escapeFileName(filename) + ".log");

    var prefs =
        [
         ["charset",          defer],
         ["collapseMsgs",     defer],
         ["displayHeader",    client.prefs["userHeader"]],
         ["motif.current",    defer],
         ["outputWindowURL",  defer],
         ["log",              client.prefs["userLog"]],
         ["logFileName",      logDefault.path]
        ];
    
    var branch = "extensions.irc.networks." + pref_mungeName(network.name) +
        ".users." + pref_mungeName(user.nick) + ".";
    var prefManager = new PrefManager(branch);
    prefManager.addPrefs(prefs);
    prefManager.onPrefChanged = onPrefChanged;

    client.prefManagers.push(prefManager);
    
    return prefManager;
}
                 
function destroyPrefs()
{
    if ("prefManagers" in client)
    {
        for (var i = 0; i < client.prefManagers.length; ++i)
            client.prefManagers[i].destroy();
    }
}

function onPrefChanged(prefName, newValue, oldValue)
{
    switch (prefName)
    {
        case "channelMaxLines":
            CIRCChannel.prototype.MAX_MESSAGES = newValue;
            break;
            
        case "charset":
            client.charset = newValue;
            break;

        case "clientMaxLines":
            client.MAX_MESSAGES = newValue;
            break;
            
        case "showModeSymbols":
            if (newValue)
                setListMode("symbol");
            else
                setListMode("graphic");
            break;
            
        case "nickname":
            CIRCNetwork.prototype.INITIAL_NICK = newValue;
            break;

        case "username":
            CIRCNetwork.prototype.INITIAL_NAME = newValue;
            break;

        case "usermode":
            CIRCNetwork.prototype.INITIAL_UMODE = newValue;
            break;

        case "userMaxLines":
            CIRCChanUser.prototype.MAX_MESSAGES = newValue;
            break;
            
        case "debugMode":
            setDebugMode(newValue);
            break;

        case "desc":
            CIRCNetwork.prototype.INITIAL_DESC = newValue;
            break;

        case "stalkWholeWords":
        case "stalkWords":
            updateAllStalkExpressions();
            break;

        case "sortUsersByMode":
            if (client.currentObject.TYPE == "IRCChannel")
                updateUserList();
            
        case "motif.current":
            dispatch("sync-motifs");
            break;

        case "multiline":
            multilineInputMode(newValue);
            break;

        case "munger.colorCodes":
            client.enableColors = newValue;
            break;

        case "networkMaxLines":
            CIRCNetwork.prototype.MAX_MESSAGES = newValue;
            break;
            
        case "outputWindowURL":
            dispatch("sync-windows");
            break;

        case "displayHeader":
            dispatch("sync-headers");
            break;

        case "log":
            dispatch("sync-logs");
            break;

        case "aliases":
            initAliases();
            break;
    }
}

function onNetworkPrefChanged(network, prefName, newValue, oldValue)
{
    if (network != client.networks[network.name])
    {
        /* this is a stale observer, remove it */
        network.prefManager.destroy();
        return;
    }

    network.updateHeader();

    switch (prefName)
    {
        case "nickname":
            network.INITIAL_NICK = newValue;
            break;

        case "username":
            network.INITIAL_NAME = newValue;
            break;

        case "usermode":
            network.INITIAL_UMODE = newValue;
            if (network.isConnected())
            {
                network.primServ.sendData("mode " + network.server.me + " :" +
                                          newValue + "\n");
            }
            break;

        case "desc":
            network.INITIAL_DESC = newValue;
            break;

        case "reconnect":
            network.stayingPower = newValue;
            break;
        
        case "motif.current":
            dispatch("sync-motifs");
            break;

        case "outputWindowURL":
            dispatch("sync-windows");
            break;

        case "displayHeader":
            dispatch("sync-headers");
            break;

        case "log":
            dispatch("sync-logs");
            break;
    }
}

function onChannelPrefChanged(channel, prefName, newValue, oldValue)
{
    var network = channel.parent.parent;

    if (network != client.networks[network.name] ||
        channel.parent != network.primServ ||
        channel != network.primServ.channels[channel.normalizedName])
    {
        /* this is a stale observer, remove it */
        channel.prefManager.destroy();
        return;
    }

    channel.updateHeader();

    switch (prefName)
    {
        case "motif.current":
            dispatch("sync-motifs");

        case "outputWindowURL":
            dispatch("sync-windows");
            break;

        case "displayHeader":
            dispatch("sync-headers");
            break;

        case "log":
            dispatch("sync-logs");
            break;
    }
}

function onUserPrefChanged(user, prefName, newValue, oldValue)
{
    var network = user.parent.parent;

    if (network != client.networks[network.name] ||
        user.parent != network.primServ ||
        user != network.primServ.users[user.name])
    {
        /* this is a stale observer, remove it */
        user.prefManager.destroy();
        return;
    }

    user.updateHeader();

    switch (prefName)
    {
        case "motif.current":
            dispatch("sync-motifs");

        case "outputWindowURL":
            dispatch("sync-windows");
            break;

        case "displayHeader":
            dispatch("sync-headers");
            break;

        case "log":
            dispatch("sync-logs");
            break;
    }
}

function initAliases()
{
    var aliasDefs = client.prefs["aliases"];

    for (var i = 0; i < aliasDefs.length; ++i)
    {
        var ary = aliasDefs[i].split(/\s*=\s*/);
        var name = ary[0];
        var list = ary[1];
        
        client.commandManager.defineCommand(name, list);
    }
}
