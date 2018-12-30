/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

const MEDIATOR_CONTRACTID =
    "@mozilla.org/appshell/window-mediator;1";
const ASS_CONTRACTID =
    "@mozilla.org/appshell/appShellService;1";

const APP_CLINE_SERVICE_CONTRACTID =
    "@mozilla.org/commandlinehandler/general-startup;1?type=chat-app";
const APP_CLINE_SERVICE_CID =
    Components.ID("{ae6ad015-433b-42ab-9afc-1636af5a7fc4}");
const ADDON_CLINE_SERVICE_CONTRACTID =
    "@mozilla.org/commandlinehandler/general-startup;1?type=chat-addon";
const ADDON_CLINE_SERVICE_CID =
    Components.ID("{38a95514-1dd2-11b2-97e7-9da958640f2c}");

const STANDARDURL_CONTRACTID =
    "@mozilla.org/network/standard-url;1";
const IOSERVICE_CONTRACTID =
    "@mozilla.org/network/io-service;1";

const IRCPROT_HANDLER_CONTRACTID =
    "@mozilla.org/network/protocol;1?name=irc";
const IRCSPROT_HANDLER_CONTRACTID =
    "@mozilla.org/network/protocol;1?name=ircs";
const IRCPROT_HANDLER_CID =
    Components.ID("{f21c35f4-1dd1-11b2-a503-9bf8a539ea39}");
const IRCSPROT_HANDLER_CID =
    Components.ID("{f21c35f4-1dd1-11b2-a503-9bf8a539ea3a}");

const IRC_MIMETYPE = "application/x-irc";
const IRCS_MIMETYPE = "application/x-ircs";

//XXXgijs: Because necko is annoying and doesn't expose this error flag, we
//         define our own constant for it. Throwing something else will show
//         ugly errors instead of seeminly doing nothing.
const NS_ERROR_MODULE_NETWORK_BASE = 0x804b0000;
const NS_ERROR_NO_CONTENT = NS_ERROR_MODULE_NETWORK_BASE + 17;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

function spawnChatZilla(uri, count)
{
    const wm = Cc[MEDIATOR_CONTRACTID].getService(Ci.nsIWindowMediator);
    const ass = Cc[ASS_CONTRACTID].getService(Ci.nsIAppShellService);
    const hiddenWin = ass.hiddenDOMWindow;

    // Ok, not starting currently, so check if we've got existing windows.
    const w = wm.getMostRecentWindow("irc:ambassador");

    // Claiming that a ChatZilla window is loading.
    if ("ChatZillaStarting" in hiddenWin)
    {
        dump("ab-service: Ambassador claiming to be starting.\n");
        if (w && ("client" in w) && ("initialized" in w.client) &&
            w.client.initialized)
        {
            dump("ab-service: It lied. It's finished starting.\n");
            // It's actually loaded ok.
            delete hiddenWin.ChatZillaStarting;
        }
    }

    if ("ChatZillaStarting" in hiddenWin)
    {
        count = count || 0;

        if ((new Date() - hiddenWin.ChatZillaStarting) > 10000)
        {
            dump("ab-service: Continuing to be unable to talk to existing window!\n");
        }
        else
        {
            // We have a ChatZilla window, but we're still loading.
            hiddenWin.setTimeout(function wrapper(count) {
                    spawnChatZilla(uri, count + 1);
                }, 250, count);
            return true;
        }
    }

    // We have a window.
    if (w)
    {
        dump("ab-service: Existing, fully loaded window. Using.\n");
        // Window is working and initialized ok. Use it.
        w.focus();
        if (uri)
            w.gotoIRCURL(uri);
        return true;
    }

    dump("ab-service: No windows, starting new one.\n");
    // Ok, no available window, loading or otherwise, so start ChatZilla.
    const args = new Object();
    if (uri)
        args.url = uri;

    hiddenWin.ChatZillaStarting = new Date();
    hiddenWin.openDialog("chrome://ambassador/content/ambassador.xul", "_blank",
                 "chrome,menubar,toolbar,status,resizable,dialog=no",
                 args);

    return true;
}

function AddonCommandLineService()
{
}

AddonCommandLineService.prototype =
{
    /* nsISupports */
    QueryInterface: XPCOMUtils.generateQI([Ci.nsICommandLineHandler]),
    classID: ADDON_CLINE_SERVICE_CID,

    /* nsICommandLineHandler */
    handle(cmdLine)
    {
        var uri;
        try
        {
            uri = cmdLine.handleFlagWithParam("chat", false);
        }
        catch (e)
        {
        }

        if (uri || cmdLine.handleFlag("chat", false))
        {
            spawnChatZilla(uri || null)
            cmdLine.preventDefault = true;
        }
    },

    helpInfo: "  --chat [<ircurl>]                            Start with an IRC chat client.\n",
};

function AppCommandLineService()
{
}

AppCommandLineService.prototype =
{
    /* nsISupports */
    QueryInterface: XPCOMUtils.generateQI([Ci.nsICommandLineHandler]),
    classID: APP_CLINE_SERVICE_CID,

    /* nsICommandLineHandler */
    handle(cmdLine)
    {
        var chromeURI = cmdLine.handleFlagWithParam("chrome", false);
        if (chromeURI)
        {
            try
            {
                Services.ww.openWindow(null, chromeURI, "_blank",
                                       "chrome,dialog=no,all", null);
                cmdLine.preventDefault = true;
            }
            catch (e)
            {
            }
            return;
        }

        var uri;
        if (cmdLine.length)
        {
            var uri = cmdLine.getArgument(0);
        }

        spawnChatZilla(uri || null)
        cmdLine.preventDefault = true;
    },

    helpInfo: "",
};
function makeProtocolHandler(aProtocol, aDefaultPort, aClassID)
{
    return {
        /* nsISupports */
        QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolHandler]),
        classID: aClassID,

        /* nsIProtocolHandler */
        protocolFlags:  Ci.nsIProtocolHandler.URI_NORELATIVE |
                        Ci.nsIProtocolHandler.ALLOWS_PROXY |
                        Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE |
                        Ci.nsIProtocolHandler.URI_NON_PERSISTABLE |
                        Ci.nsIProtocolHandler.URI_DOES_NOT_RETURN_DATA,

        defaultPort: aDefaultPort,
        scheme: aProtocol,

        allowPort(port, scheme)
        {
            // Allow all ports to connect, so long as they are irc: or ircs:
            return (scheme === 'irc' || scheme === 'ircs');
        },

        newURI(spec, charset, baseURI)
        {
            const cls = Cc[STANDARDURL_CONTRACTID];
            const url = cls.createInstance(Ci.nsIStandardURL);
            const port = aDefaultPort;

            url.init(Ci.nsIStandardURL.URLTYPE_STANDARD, port, spec, charset, baseURI);

            return url.QueryInterface(Ci.nsIURI);
        },

        newChannel(URI)
        {
            const ios = Cc[IOSERVICE_CONTRACTID].getService(Ci.nsIIOService);
            if (!ios.allowPort(URI.port, URI.scheme))
                throw Cr.NS_ERROR_FAILURE;

            return new BogusChannel(URI, aClassID == IRCSPROT_HANDLER_CID);
        },
    };
}

function IRCProtocolHandler()
{
}

IRCProtocolHandler.prototype =
    makeProtocolHandler("irc", 6667, IRCPROT_HANDLER_CID);

function IRCSProtocolHandler()
{
}

IRCSProtocolHandler.prototype =
    makeProtocolHandler("ircs", 6697, IRCSPROT_HANDLER_CID);

/* Bogus IRC channel used by the IRCProtocolHandler */
function BogusChannel(URI, isSecure)
{
    this.URI = URI;
    this.originalURI = URI;
    this.isSecure = isSecure;
    this.contentType = this.isSecure ? IRCS_MIMETYPE : IRC_MIMETYPE;
}

BogusChannel.prototype =
{
    /* nsISupports */
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIChannel, Ci.nsIRequest]),

    /* nsIChannel */
    loadAttributes: null,
    contentLength: 0,
    owner: null,
    loadGroup: null,
    notificationCallbacks: null,
    securityInfo: null,

    open(observer, context)
    {
        spawnChatZilla(this.URI.spec);
        // We don't throw this (a number, not a real 'resultcode') because it
        // upsets xpconnect if we do (error in the js console).
        Components.returnCode = NS_ERROR_NO_CONTENT;
    },

    asyncOpen(observer, context)
    {
        spawnChatZilla(this.URI.spec);
        // We don't throw this (a number, not a real 'resultcode') because it
        // upsets xpconnect if we do (error in the js console).
        Components.returnCode = NS_ERROR_NO_CONTENT;
    },

    asyncRead(listener, context)
    {
        throw Cr.NS_ERROR_NOT_IMPLEMENTED;
    },

    /* nsIRequest */
    isPending()
    {
        return true;
    },

    status: Cr.NS_OK,

    cancel(status)
    {
        this.status = status;
    },

    suspend()
    {
        throw Cr.NS_ERROR_NOT_IMPLEMENTED;
    },

    resume()
    {
        throw Cr.NS_ERROR_NOT_IMPLEMENTED;
    },
};

/* entrypoint */
var components = [AddonCommandLineService, AppCommandLineService, IRCProtocolHandler, IRCSProtocolHandler];
const NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
