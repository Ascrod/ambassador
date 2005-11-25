/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*-
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
 * The Original Code is JSIRC Sample bot.
 *
 * The Initial Developer of the Original Code is
 * New Dimensions Consulting, Inc.
 * Portions created by the Initial Developer are Copyright (C) 1999
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Robert Ginda, rginda@ndcico.com, original author
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

var LIB_PATH = "../lib/";

bot = new Object();
bot.ownerPatterns = new Array();
bot.personality = new Object();
bot.personality.hooks = new Array();
bot.prefix = "!js ";

function loadDeps()
{

    load (LIB_PATH + "utils.js");
    load (LIB_PATH + "events.js");
    load (LIB_PATH + "connection.js");
    load (LIB_PATH + "http.js");
    load (LIB_PATH + "dcc.js");
    load (LIB_PATH + "irc.js");
    load (LIB_PATH + "irc-debug.js");
    
    if (!connection_init(LIB_PATH))
        return false;
    
    return true;
    
}

function initStatic()
{
    
    if (jsenv.HAS_RHINO)
        gc = java.lang.System.gc;

    CIRCNetwork.prototype.INITIAL_NICK = "jsbot";
    CIRCNetwork.prototype.INITIAL_NAME = "XPJSBot";
    CIRCNetwork.prototype.INITIAL_DESC = "XPCOM Javascript bot";
    CIRCNetwork.prototype.INITIAL_CHANNEL = "#jsbot";

    CIRCNetwork.prototype.stayingPower = true; 
    CIRCNetwork.prototype.on433 = my_433;
    CIRCChannel.prototype.onPrivmsg = my_chan_privmsg;
    CIRCUser.prototype.onDCCChat = my_user_dccchat;
    CDCCChat.prototype.onRawData = my_dccchat_rawdata;

}

/*
 * One time initilization stuff
 */     
function init(obj)
{
    
    obj.eventPump = new CEventPump (100);

    obj.networks = new Object();
    obj.networks["hybridnet"] =
	new CIRCNetwork ("hybridnet", [{name: "irc.ssc.net", port: 6667}],
                         obj.eventPump);

    obj.networks["moznet"] =
	new CIRCNetwork ("moznet", [{name: "irc.mozilla.org", port: 6667}],
                         obj.eventPump);

    obj.networks["efnet"] =
        new CIRCNetwork ("efnet", [
                         {name: "irc.mcs.net", port: 6667},
                         {name: "irc.cs.cmu.edu",   port: 6667}],
                         obj.eventPump);

    obj.primNet = obj.networks["efnet"];
    

}

/*
 * Kick off the mainloop for the first time
 */
function go()
{

    if (!loadDeps())
        return false;
    initStatic();
    init(bot);
    if (DEBUG)
        /* hook all events EXCEPT server.poll and *.event-end types
         * (the 4th param inverts the match) */
        bot.eventPump.addHook ([{type: "poll", set: /^(server|dcc-chat)$/},
                                {type: "event-end"}], event_tracer,
                               "event-tracer", true /* negate */);

    if (typeof initPersonality == "function")
        initPersonality();
    
    bot.primNet.connect();
    rego();
    
    return true;

}

/*
 * If you didn't compile libjs with JS_HAS_ERROR_EXCEPTIONS, any error the
 * bot encounters will exit the mainloop and drop you back to a shell ("js>")
 * prompt.  You can continue the mainloop by executing this function.
 */
function rego()
{

    /* mainloop */
    while (bot.eventPump.queue.length > 0)
    {
        bot.eventPump.stepEvents();
        if (typeof gc == "function")
        {
            if ((typeof bot.lastGc == "undefined") ||
                (Number(new Date()) - bot.lastGc > 60000))
            {
                gc();
                bot.lastGc = Number(new Date());
            }
        }
    }
    dd ("No events to process.");

    return true;

}

function addOwner (pattern)
{
    bot.ownerPatterns.push (pattern);
}

function userIsOwner (user)
{
    if (!user.host)
    {
        /* we havn't got any information on this user yet.  They havn't spoken
         * yet, and we havn't /whoi's them yet.  Say no for now, but do the 
         * /whois so we'll know for sure next time.
         */
        if (user.TYPE == "IRCChanUser")
            user.parent.parent.sendData ("WHOIS " + user.nick + "\n");
        else
            user.parent.sendData ("WHOIS " + user.nick + "\n");
        return false;
    }
    
    var userString = user.nick + "!" + user.name + "@" + user.host;
    dd ("userIsOwner: checking userString `" + userString + "' against:");
    
    for (var p in bot.ownerPatterns)
        if (userString.search(bot.ownerPatterns[p]) != -1)
        {
            dd (String(bot.ownerPatterns[p]) + " passed.");
            return true;
        }
        else
            dd (String(bot.ownerPatterns[p]) + " fails.");
    
    return false;
}

function psn_isAddressedToMe (e)
{
    if (!e.server)
        return false;

    if ((e.type.search(/privmsg|ctcp-action/)) || (e.set != "channel") ||
        (e.meat.indexOf(bot.prefix) == 0))
        return false;

    /*
    dd ("-*- checking to see if message '" + e.meat + "' is addressed to me.");
    */
    
    var regex = new RegExp ("^\\s*" + e.server.me.nick + "\\W+(.*)", "i");
    var ary = e.meat.match(regex);

    //dd ("address match: "  + ary);
    
    if (ary != null)
    {
        e.statement = ary[1];
        return true;
    }

    bot.personality.dp.addPhrase (e.meat);
    return false;
    
}

function psn_onAddressedMsg (e)
{

    bot.eventPump.onHook (e, bot.personality.hooks);
    return false;
    
}

bot.personality.addHook =
function psn_addhook (pattern, f, name, neg, enabled)
{
    if (pattern instanceof RegExp)
        pattern = {statement: pattern};
    
    return bot.eventPump.addHook (pattern, f, name, neg, enabled,
                                  bot.personality.hooks);

}

function bot_eval(e, script)
{
    try
    {
        var v = eval(script);
    }
    catch (ex)
    {
        e.replyTo.say(e.user.nick + ": " + String(ex));
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
        
        e.replyTo.say (rsp + v);
    }
}

/*
 * The following my_* are attached to their proper objects in the init()
 * function.  This is because the CIRC* objects are not defined at load time
 * (they get defined when loadDeps() loads the irc library) and so connecting
 * them here would cause an error.
 */

/*
 * What to do when a privmsg is received on a channel
 */
function my_chan_privmsg (e)
{
    var user = e.user;
    var meat = e.meat;
    if (meat.indexOf(bot.prefix) == 0 && userIsOwner(user))
    {
        /* if last char is a continuation character, then... */
        if (meat[meat.length - 1] == '\\') {
            user.accumulatedScript = meat.substring(bot.prefix.length,
                                                    meat.length - 1);
            return false; // prevent other hooks from processing this... 
        }
        else
        {
            return bot_eval(e, meat.substring(bot.prefix.length,
                                              meat.length));
        }
    }
    else if ((typeof(user.accumulatedScript) != "undefined")  &&
             userIsOwner(user))
            /* if we were accumulating a message, add here,
             * and finish if not ends with '\'. */
    {
        var lastLine = (meat[meat.length - 1] != '\\');
        var line = meat.substring(0, meat.length - (lastLine ?  0 : 1));
        user.accumulatedScript += line;
        if (lastLine)
        {
            var script = user.accumulatedScript;
            delete user.accumulatedScript;
            return bot_eval(e, script);
        }
    }
}

/*
 * What to do when a dcc chat request reaches a user object
 */
function my_user_dccchat (e)
{
    
    if (!e.user.canDCC)
    {
        e.user.notice ("\01DCC REJECT CHAT chat\01");
        return false;
    }
    
    var c = new CDCCChat (bot.eventPump);
    
    if (!c.connect (e.user.host, e.port))
    {
        e.user.notice ("\01DCC REJECT CHAT chat\01");
        return false;
    }
    
    return true;
    
}

/*
 * What to do when our requested nickname is in use
 */
function my_433 (e)
{

    if (e.params[2] != CIRCNetwork.prototype.INITIAL_NICK)
    {
        /* server didn't like the last nick we tried, probably too long.
         * not much more we can do, bail out. */
        e.server.disconnect();
    }

    CIRCNetwork.prototype.INITIAL_NICK += "_";
    e.server.sendData ("nick " + CIRCNetwork.prototype.INITIAL_NICK + "\n");
    
}

/*
 * What to do when raw data is received on a dcc chat connection
 */
function my_dccchat_rawdata (e)
{
    
    try
    {
        var v = eval(e.data);
    }
    catch (ex)
    {
        this.say (String(ex));
        return false;
    }
    
    if (typeof (v) != "undefined")
    {						
        if (v != null)          
            v = String(v);
        else
            v = "null";
        
        this.say (v);
    }
    
}

/*
 * Wrapper around CHTTPDoc to make is simpler to use
 */
function loadHTTP (host, path, onComplete)
{
    var htdoc = new CHTTPDoc (host, path);

    htdoc.onComplete = onComplete;
    htdoc.get (bot.eventPump);

    return htdoc;
    
}

