/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 *
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is ChatZilla.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Robert Ginda, <rginda@netscape.com>, original author
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

function initMenus()
{
    function isMotif(name)
    {
        return "client.prefs['motif.current'] == " +
            "client.prefs['motif." + name + "']";
    };

    function isFontFamily(name)
    {
        return "cx.sourceObject.prefs['font.family'] == '" + name + "'";
    };

    function isFontFamilyCustom()
    {
        return "!cx.sourceObject.prefs['font.family']." +
               "match(/^(default|(sans-)?serif|monospace)$/)";
    };

    function isFontSize(size)
    {
        return "cx.fontSize == cx.fontSizeDefault + " + size;
    };

    function isFontSizeCustom()
    {
        // It's "custom" if it's set (non-zero/not default), not the default
        // size (medium) and not +/-2 (small/large).
        return "'fontSize' in cx && cx.fontSize != 0 && " +
               "cx.fontSizeDefault != cx.fontSize && " +
               "Math.abs((cx.fontSizeDefault - cx.fontSize) / 2) != 1";
    };

    function onMenuCommand (event, window)
    {
        var params;
        var commandName = event.originalTarget.getAttribute("commandname");
        if ("cx" in client.menuManager && client.menuManager.cx)
        {
            client.menuManager.cx.sourceWindow = window;
            params = client.menuManager.cx;
        }
        else
        {
            params = { sourceWindow: window };
        }

        dispatch (commandName, params);

        delete client.menuManager.cx;
    };

    client.onMenuCommand = onMenuCommand;
    client.menuSpecs = new Object();
    var menuManager = new MenuManager(client.commandManager,
                                      client.menuSpecs,
                                      getCommandContext,
                                      "client.onMenuCommand(event, window);");
    client.menuManager = menuManager;

    client.menuSpecs["maintoolbar"] = {
        items:
        [
         ["disconnect"],
         ["quit"],
         ["part"]
        ]
    };

    var notInChannel = "((cx.TYPE == 'IRCChannel') and !cx.channel.active)";
    var inChannel = "((cx.TYPE == 'IRCChannel') and cx.channel.active)";
    var netConnected = "cx.network and cx.network.isConnected()";
    var netDisconnected = "cx.network and !cx.network.isConnected()";

    client.menuSpecs["mainmenu:file"] = {
        label: MSG_MNU_FILE,
        getContext: getDefaultContext,
        items:
        [
         ["join"],
         // Planned future menu items, not implemented yet.
         //["attach"],
         //["-"],
         //["manage-networks"],
         //["manage-plugins"],
         ["-"],
         ["leave",       {visibleif: inChannel}],
         ["rejoin",      {visibleif: notInChannel}],
         ["delete-view", {visibleif: "!" + inChannel}],
         ["disconnect",  {visibleif: netConnected}],
         ["reconnect",   {visibleif: netDisconnected}],
         ["-"],
         ["print"],
         ["-"],
         ["save"],
         ["-"],
         [navigator.platform.search(/win/i) == -1 ? "quit" : "exit"]
        ]
    };

    var Mozilla = "(client.host == 'Mozilla')";
    var ToolkitAppOnLinux = "((client.host != 'Mozilla') and " +
                            "(client.platform == 'Linux'))";
    var ToolkitAppNotOnLinux = "((client.host != 'Mozilla') and " +
                               "!(client.platform == 'Linux'))";

    client.menuSpecs["mainmenu:edit"] = {
        label: MSG_MNU_EDIT,
        getContext: getDefaultContext,
        items:
        [
         ["cmd-undo",      {enabledif: "getCommandEnabled('cmd_undo')"}],
         ["cmd-redo",      {enabledif: "getCommandEnabled('cmd_redo')"}],
         ["-"],
         ["cmd-cut",       {enabledif: "getCommandEnabled('cmd_cut')"}],
         ["cmd-copy",      {enabledif: "getCommandEnabled('cmd_copy')"}],
         ["cmd-paste",     {enabledif: "getCommandEnabled('cmd_paste')"}],
         ["cmd-delete",    {enabledif: "getCommandEnabled('cmd_delete')"}],
         ["-"],
         ["cmd-selectall", {enabledif: "getCommandEnabled('cmd_selectAll')"}],
         ["-"],
         ["find"],
         ["find-again", {enabledif: "canFindAgainInPage()"}],
         ["-",                   {visibleif: Mozilla}],
         ["cmd-mozilla-prefs",   {visibleif: Mozilla}],
         ["cmd-chatzilla-prefs", {visibleif: Mozilla}],
         ["-",                   {visibleif: ToolkitAppOnLinux}],
         ["cmd-prefs",           {visibleif: ToolkitAppOnLinux}]
        ]
    };

    client.menuSpecs["mainmenu:tools"] = {
        label: MSG_MNU_TOOLS,
        getContext: getDefaultContext,
        items:
        [
         ["cmd-chatzilla-opts", {visibleif: ToolkitAppNotOnLinux}]
        ]
    };

    client.menuSpecs["popup:motifs"] = {
        label: MSG_MNU_MOTIFS,
        items:
        [
         ["motif-default",
                 {type: "checkbox",
                  checkedif: isMotif("default")}],
         ["motif-dark",
                 {type: "checkbox",
                  checkedif: isMotif("dark")}],
         ["motif-light",
                 {type: "checkbox",
                  checkedif: isMotif("light")}],
        ]
    };

    client.menuSpecs["mainmenu:view"] = {
        label: MSG_MNU_VIEW,
        getContext: getDefaultContext,
        items:
        [
         [">popup:showhide"],
         ["-"],
         ["clear-view"],
         ["hide-view", {enabledif: "client.viewsArray.length > 1"}],
         ["toggle-oas",
                 {type: "checkbox",
                  checkedif: "isStartupURL(cx.sourceObject.getURL())"}],
         ["-"],
         [">popup:motifs"],
         [">popup:fonts"],
         ["-"],
         ["toggle-ccm",
                 {type: "checkbox",
                  checkedif: "client.prefs['collapseMsgs']"}],
         ["toggle-copy",
                 {type: "checkbox",
                  checkedif: "client.prefs['copyMessages']"}],
         ["toggle-timestamps",
                 {type: "checkbox",
                  checkedif: "cx.sourceObject.prefs['timestamps']"}]
        ]
    };

    /* Mac expects a help menu with this ID, and there is nothing we can do
     * about it. */
    client.menuSpecs["mainmenu:help"] = {
        label: MSG_MNU_HELP,
        domID: "menu_Help",
        items:
        [
         ["about"],
        ]
    };

    client.menuSpecs["popup:showhide"] = {
        label: MSG_MNU_SHOWHIDE,
        items:
        [
         ["tabstrip",
                 {type: "checkbox",
                  checkedif: "isVisible('view-tabs')"}],
         ["header",
                 {type: "checkbox",
                  checkedif: "cx.sourceObject.prefs['displayHeader']"}],
         ["userlist",
                 {type: "checkbox",
                  checkedif: "isVisible('user-list-box')"}],
         ["statusbar",
                 {type: "checkbox",
                  checkedif: "isVisible('status-bar')"}],

        ]
    };

    client.menuSpecs["popup:fonts"] = {
        label: MSG_MNU_FONTS,
        getContext: getFontContext,
        items:
        [
         ["font-size-bigger", {}],
         ["font-size-smaller", {}],
         ["-"],
         ["font-size-default",
                 {type: "checkbox", checkedif: "!cx.fontSize"}],
         ["font-size-small",
                 {type: "checkbox", checkedif: isFontSize(-2)}],
         ["font-size-medium",
                 {type: "checkbox", checkedif: isFontSize(0)}],
         ["font-size-large",
                 {type: "checkbox", checkedif: isFontSize(+2)}],
         ["font-size-other",
                 {type: "checkbox", checkedif: isFontSizeCustom()}],
         ["-"],
         ["font-family-default",
                 {type: "checkbox", checkedif: isFontFamily("default")}],
         ["font-family-serif",
                 {type: "checkbox", checkedif: isFontFamily("serif")}],
         ["font-family-sans-serif",
                 {type: "checkbox", checkedif: isFontFamily("sans-serif")}],
         ["font-family-monospace",
                 {type: "checkbox", checkedif: isFontFamily("monospace")}],
         ["font-family-other",
                 {type: "checkbox", checkedif: isFontFamilyCustom()}]
        ]
    };

    // Me is op.
    var isop    = "(cx.channel.iAmOp()) && ";
    // Me is op or half-op.
    var isopish = "(cx.channel.iAmOp() || cx.channel.iAmHalfOp()) && ";
    // Server has half-ops.
    var shop    = "(cx.server.supports.prefix.indexOf('h') > 0) && ";

    client.menuSpecs["popup:opcommands"] = {
        label: MSG_MNU_OPCOMMANDS,
        items:
        [
         ["op",         {visibleif: isop           + "!cx.user.isOp"}],
         ["deop",       {visibleif: isop           + "cx.user.isOp"}],
         ["hop",        {visibleif: isopish + shop + "!cx.user.isHalfOp"}],
         ["dehop",      {visibleif: isopish + shop + "cx.user.isHalfOp"}],
         ["voice",      {visibleif: isopish        + "!cx.user.isVoice"}],
         ["devoice",    {visibleif: isopish        + "cx.user.isVoice"}],
         ["-"],
         ["ban",        {enabledif: "(" + isop + "1) || (" + isopish + "!cx.user.isOp)"}],
         ["unban",      {enabledif: "(" + isop + "1) || (" + isopish + "!cx.user.isOp)"}],
         ["kick",       {enabledif: "(" + isop + "1) || (" + isopish + "!cx.user.isOp)"}],
         ["kick-ban",   {enabledif: "(" + isop + "1) || (" + isopish + "!cx.user.isOp)"}]
        ]
    };


    client.menuSpecs["context:userlist"] = {
        getContext: getUserlistContext,
        items:
        [
         ["toggle-usort", {type: "checkbox",
                           checkedif: "client.prefs['sortUsersByMode']"}],
         ["toggle-umode", {type: "checkbox",
                           checkedif: "client.prefs['showModeSymbols']"}],
         ["-", {visibleif: "cx.nickname"}],
         ["label-user", {visibleif: "cx.nickname", header: true}],
         [">popup:opcommands", {visibleif: "cx.channel && " + isopish + "cx.user"}],
         ["whois",   {visibleif: "cx.nickname"}],
         ["query",   {visibleif: "cx.nickname"}],
         ["version", {visibleif: "cx.nickname"}],
        ]
    };

    var urlenabled = "has('url')";
    var urlexternal = "has('url') && cx.url.search(/^irc:/i) == -1";
    var textselected = "getCommandEnabled('cmd_copy')";

    client.menuSpecs["context:messages"] = {
        getContext: getMessagesContext,
        items:
        [
         ["goto-url", {visibleif: urlenabled}],
         ["goto-url-newwin", {visibleif: urlexternal}],
         ["goto-url-newtab", {visibleif: urlexternal}],
         ["cmd-copy-link-url", {visibleif: urlenabled}],
         ["cmd-copy", {visibleif: "!" + urlenabled, enabledif: textselected }],
         ["cmd-selectall", {visibleif: "!" + urlenabled }],
         ["-"],
         ["clear-view"],
         ["hide-view", {enabledif: "client.viewsArray.length > 1"}],
         ["toggle-oas",
                 {type: "checkbox",
                  checkedif: "isStartupURL(cx.sourceObject.getURL())"}],
         ["-", {visibleif: "cx.channel && cx.nickname"}],
         ["label-user", {visibleif: "cx.channel && cx.nickname", header: true}],
         [">popup:opcommands", {visibleif: "cx.channel && " + isopish + "cx.user"}],
         ["whois",   {visibleif: "cx.user"}],
         ["whowas",  {visibleif: "cx.nickname && !cx.user"}],
         ["query",   {visibleif: "cx.nickname"}],
         ["version", {visibleif: "cx.nickname"}],
         ["-"],
         ["leave",       {visibleif: inChannel}],
         ["rejoin",      {visibleif: notInChannel}],
         ["delete-view", {visibleif: "!" + inChannel}],
         ["disconnect",  {visibleif: netConnected}],
         ["reconnect",   {visibleif: netDisconnected}],
         ["-"],
         ["toggle-text-dir"]
        ]
    };

    client.menuSpecs["context:tab"] = {
        getContext: getTabContext,
        items:
        [
         ["clear-view"],
         ["hide-view", {enabledif: "client.viewsArray.length > 1"}],
         ["toggle-oas",
                 {type: "checkbox",
                  checkedif: "isStartupURL(cx.sourceObject.getURL())"}],
         ["-"],
         ["leave",       {visibleif: inChannel}],
         ["rejoin",      {visibleif: notInChannel}],
         ["delete-view", {visibleif: "!" + inChannel}],
         ["disconnect",  {visibleif: netConnected}],
         ["reconnect",   {visibleif: netDisconnected}],
         ["-"],
         ["toggle-text-dir"]
        ]
    };

    var net          = "cx.network";
    var netAway      = "cx.network.prefs['away']";
    var netAwayIsDef = "(cx.network.prefs['away'] == '" + MSG_AWAY_DEFAULT +
                       "') and " + netAway;

    client.menuSpecs["mainmenu:nickname"] = {
        label: client.prefs["nickname"],
        domID: "server-nick",
        getContext: getDefaultContext,
        items:
        [
         ["nick"],
         ["-"],
         ["back", {type: "checkbox", checkedif: net + " and !" + netAway}],
         ["away", {type: "checkbox",
                     checkedif: "cx.sourceObject.prefs.away == item.message",
                     repeatfor: "client.awayMsgs",
                     repeatmap: "cx.reason = item.message" }],
         ["-"],
         ["custom-away"]
        ]
    };

}

function createMenus()
{
    client.menuManager.createMenus(document, "mainmenu");
    client.menuManager.createContextMenus(document);

    // The menus and the component bar need to be hidden on some hosts.
    var winMenu   = document.getElementById("windowMenu");
    var tasksMenu = document.getElementById("tasksMenu");
    var toolsMenu = document.getElementById("mainmenu:tools");
    var comBar    = document.getElementById("component-bar");

    if (client.host != "Mozilla") {
        tasksMenu.parentNode.removeChild(tasksMenu);
        winMenu.parentNode.removeChild(winMenu);
    } else {
        comBar.collapsed = false;
    }

    if ((client.host == "Mozilla") || (client.platform == "Linux")) {
        toolsMenu.parentNode.removeChild(toolsMenu);
    }
}

function getCommandContext (id, event)
{
    var cx = { originalEvent: event };

    if (id in client.menuSpecs)
    {
        if ("getContext" in client.menuSpecs[id])
            cx = client.menuSpecs[id].getContext(cx);
        else if ("cx" in client.menuManager)
        {
            //dd ("using existing context");
            cx = client.menuManager.cx;
        }
        else
        {
            //no context.
        }
    }
    else
    {
        dd ("getCommandContext: unknown menu id " + id);
    }

    if (typeof cx == "object")
    {
        if (!("menuManager" in cx))
            cx.menuManager = client.menuManager;
        if (!("contextSource" in cx))
            cx.contextSource = id;
        if ("dbgContexts" in client && client.dbgContexts)
            dd ("context '" + id + "'\n" + dumpObjectTree(cx));
    }

    return cx;
}
