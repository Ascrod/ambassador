/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.0 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/ 
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License. 
 *
 * The Original Code is JSIRC Test Client #2
 *
 * The Initial Developer of the Original Code is New Dimensions Consulting,
 * Inc. Portions created by New Dimensions Consulting, Inc. Copyright (C) 1999
 * New Dimenstions Consulting, Inc. All Rights Reserved.
 *
 *
 * Contributor(s):
 *  Robert Ginda, rginda@ndcico.com, original author
 */

function onLoad()
{

    initStatic();
    init(client);

    var entry = document.getElementById("input");
    EntryHistory(20, entry, onInputLine);

    for (var a in client.INITIAL_ALIASES)
        client.addAlias (client.INITIAL_ALIASES[a].name,
                         client.INITIAL_ALIASES[a].value);
    
    client.lastListType = "networks";
    setCurrentNetwork ("efnet");
    updateListNow();
    updateStatus();
    //onListClick({target: document.getElementById ("lstQuickList")});
    mainstep();
    
}

function onUnload()
{

    client.quit ("re-load");
    
}

CIRCNetwork.prototype.onNotice = function my_notice (e)
{

    this.display (e.meat, "NOTICE");
    
}

CIRCChannel.prototype.onPrivmsg = function my_cprivmsg (e)
{
    
    e.user.display (e.meat, "PRIVMSG");
    
    if (e.meat.indexOf (client.prefix) == 0)
    {
        try
        {
            var v = eval(e.meat.substring (client.prefix.length,
                                           e.meat.length));
        }
        catch (ex)
        {
            this.say (e.user.nick + ": " + String(ex));
            return false;
        }
        
        if (typeof (v) != "undefined")
        {						
            if (v != null)                
                v = String(v);
            else
                v = "null";
            
            var rsp = e.user.nick + ", your result is,";
            
            if (v.indexOf ("\n") != -1)
                rsp += "\n";
            else
                rsp += " ";
            
            this.say (rsp + v);
        }
    }

    return true;
    
}

CIRCChannel.prototype.onNotice = function my_notice (e)
{

    e.user.display (e.meat, "NOTICE", e.user.nick);
    
}

CIRCChannel.prototype.onCTCPAction = function my_caction (e)
{

    e.user.display (e.CTCPData, "ACTION");

}

CIRCChannel.prototype.onJoin = function my_cjoin (e)
{

    this.display(e.user.nick + " has joined " + e.channel.name,
                 "JOIN");
    if (client.lastListType == "chan-users")
        updateList();
    
}

CIRCChannel.prototype.onPart = function my_cpart (e)
{

    this.display (e.user.nick + " has left " + e.channel.name, "PART");
    if (client.lastListType == "chan-users")
        updateList();
    
}

CIRCChannel.prototype.onKick = function my_ckick (e)
{

    this.display (e.lamer.nick + " was booted from " + e.channel.name +
                  " by " + e.user.nick + " (" + e.reason + ")", "KICK");
    if (client.lastListType == "chan-users")
        updateList();
    
}

CIRCUser.prototype.onPrivmsg = function my_cprivmsg (e)
{
    
    this.display (e.meat, "PRIVMSG");
    
}

CIRCUser.prototype.onNotice = function my_notice (e)
{

    this.display (e.meat, "NOTICE");
    
}    

CIRCUser.prototype.onNick = function my_unick (e)
{

    this.parent.parent.display (e.oldNick + " is now known as " +
                                e.user.nick, "NICK");
    if (client.lastListType.search ("users") != -1)
        updateList();
    
}

CIRCUser.prototype.onQuit = function my_quit (e)
{

    this.parent.parent.display (e.user.nick + " has left " +
                                e.server.parent.name + " (" + e.reason + ")",
                                "QUIT");
    if (client.lastListType.search ("users") != -1)
        updateList();
    
}

function onCommand()
{
    var btn = document.getElementById ("btnCommand");
    
    eval (btn.getAttribute("command"));
    
}

function onInputLine(line)
{

    if (line[0] == client.COMMAND_CHAR)
    {
        var ary = line.substr(1, line.length).match (/(\S+)? ?(.*)/);
        var cmd = ary[1];

        var destMethod = "onInput" + ary[1][0].toUpperCase() +
            ary[1].substr (1, ary[1].length).toLowerCase();
        var type = "input-" + ary[1].toLowerCase();
        var ev = new CEvent ("client", type, client, destMethod);

        ev.cmd = cmd;
        ev.inputData =  ary[2] ? ary[2] : "";

        ev.network = client.network;
        ev.server = client.network.primServ;
        ev.channel = client.channel;

        client.eventPump.addEvent (ev);
        
    }
    else
        if (client.channel)
        {
            client.channel.display (line, "PRIVMSG", "!ME");
            client.channel.say (line);
        }
    
}

client.onInputMe = function cli_ime (e)
{
    if (e.channel)
    {
        e.channel.act (e.inputData);
        client.channel.display (e.inputData, "ACTION", "!ME");
    }
}

client.onInputNick = function cli_inick (e)
{

    if (!e.inputData)
        return false;
    
    if (e.server) 
        e.server.sendData ('NICK ' + e.inputData + '\\n');
    else
        CIRCNetwork.prototype.INITIAL_NICK = e.inputData;
    
}

client.onInputName = function cli_iname (e)
{

    if (!e.inputData)
        return false;
    
    CIRCNetwork.prototype.INITIAL_NAME = e.inputData;
    
}

client.onInputDesc = function cli_idesc (e)
{

    if (!e.inputData)
        return false;
    
    CIRCNetwork.prototype.INITIAL_DESC = e.inputData;
    
}
    
client.onInputAlias = function cli_ialias (e)
{
    var ary = e.inputData.match (/(\S+)? ?(.*)/);
    if (!ary)
        return false;

    if (!ary[2])
        client.removeAlias (ary[1]);
    else
        client.addAlias (ary[1], ary[2]);
    
}

client.onInputRaw = function cli_iraw (e)
{

    client.primNet.primServ.sendData (e.inputData + "\n");
    
}

client.onInputEval = function cli_ieval (e)
{

    try
    {
        rv = String(eval (e.inputData));
        if (rv.indexOf ("\n") == -1)
            client.display ("(" + e.inputData + ") " + rv, "EVAL");
        else
            client.display ("(" + e.inputData + ")\n" + rv, "EVAL");
    }
    catch (ex)
    {
        client.display (ex, "ERROR");
    }    
    
}
    
client.onInputJ = client.onInputJoin = function cli_ijoin (e)
{
    if (!e.network || !e.network.isConnected())
        return false;
    
    var name = e.inputData.match(/\S+/);
    if (!name)
        return false;

    e.channel = e.network.primServ.addChannel (String(name));
    setCurrentChannel (e.channel);
    client.lastListType = "chan-users";
    updateList();
    e.channel.join();
    
}

client.onInputP = client.onInputPart = client.onInputLeave =
function cli_ipart (e)
{
    if (!e.channel)
        return false;

    e.channel.part();    
    
}

function onListNetworks ()
{
    client.lastListType = "networks";
    updateListNow();
    
}

function onListUsers ()
{
    var quickList = document.getElementById("QuickList");

    if (!client.network || !client.network.isConnected())
    {
        listClear (quickList);
        client.lastListType = "none";
        return true;
    }

    client.lastListType = "users";
    updateListNow();
    
}

function onListChannels ()
{
    var quickList = document.getElementById("QuickList");
    
    if (!client.network || !client.network.isConnected())
    {
        listClear (quickList);
        client.lastListType = "none";
        return true;
    }

    client.lastListType = "channels";
    updateListNow();
    
}

function onListChanUsers ()
{
    var quickList = document.getElementById("QuickList");    
    
    if (!client.channel)
    {
        listClear (quickList);
        client.lastListType = "none";
        return true;
    }
    
    client.lastListType = "chan-users";    
    updateListNow();
    
}

function onListClick (e)
{
    var name = e.target.options[e.target.selectedIndex].text;
    var ary = name.match(/\[.*\] (.*)/);
    var name = (ary) ? ary[1] : name;

    switch (client.lastListType)
    {
        case "networks":
            setCurrentNetwork (name);
            break;

        case "users":
            setCurrentUser (name);
            break;
            
        case "channels":
            setCurrentChannel (name);
            break;

        case "chan-users":
            setCurrentCUser (name);
            break;

        default:
            break;
            
    }
    
}

function onActListClick (e)
{
    var name = e.target.options[e.target.selectedIndex].text;
    var ary = name.match(/\[.*\] (.*)/);
    var name = (ary) ? ary[1] : name;

    displayHistory (client.actList[name].source);
    
}


function onNickClick (e)
{

    dd (dumpObjectTree (e));
    
}
