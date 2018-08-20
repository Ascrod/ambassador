/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

const MEDIATOR_CONTRACTID =
    "@mozilla.org/appshell/window-mediator;1";
const ASS_CONTRACTID =
    "@mozilla.org/appshell/appShellService;1";
const RDFS_CONTRACTID =
    "@mozilla.org/rdf/rdf-service;1";
const CATMAN_CONTRACTID =
    "@mozilla.org/categorymanager;1";

const CLINE_SERVICE_CONTRACTID =
    "@mozilla.org/commandlinehandler/general-startup;1?type=chat";
const CLINE_SERVICE_CID =
    Components.ID("{38a95514-1dd2-11b2-97e7-9da958640f2c}");
const STARTUP_CID =
    Components.ID("{ae6ad015-433b-42ab-9afc-1636af5a7fc4}");

const STANDARDURL_CONTRACTID =
    "@mozilla.org/network/standard-url;1";
const IOSERVICE_CONTRACTID =
    "@mozilla.org/network/io-service;1";

const IRCPROT_HANDLER_CONTRACTID =
    "@mozilla.org/network/protocol;1?name=irc";
const IRCSPROT_HANDLER_CONTRACTID =
    "@mozilla.org/network/protocol;1?name=ircs";
this.IRCPROT_HANDLER_CID =
    Components.ID("{f21c35f4-1dd1-11b2-a503-9bf8a539ea39}");
this.IRCSPROT_HANDLER_CID =
    Components.ID("{f21c35f4-1dd1-11b2-a503-9bf8a539ea3a}");

const IRC_MIMETYPE = "application/x-irc";
const IRCS_MIMETYPE = "application/x-ircs";

//XXXgijs: Because necko is annoying and doesn't expose this error flag, we
//         define our own constant for it. Throwing something else will show
//         ugly errors instead of seeminly doing nothing.
const NS_ERROR_MODULE_NETWORK_BASE = 0x804b0000;
const NS_ERROR_NO_CONTENT = NS_ERROR_MODULE_NETWORK_BASE + 17;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

function spawnChatZilla(uri, count)
{
    const wm = Cc[MEDIATOR_CONTRACTID].getService(Ci.nsIWindowMediator);
    const ass = Cc[ASS_CONTRACTID].getService(Ci.nsIAppShellService);
    const hiddenWin = ass.hiddenDOMWindow;

    // Ok, not starting currently, so check if we've got existing windows.
    const w = wm.getMostRecentWindow("irc:chatzilla");

    // Claiming that a ChatZilla window is loading.
    if ("ChatZillaStarting" in hiddenWin)
    {
        dump("cz-service: ChatZilla claiming to be starting.\n");
        if (w && ("client" in w) && ("initialized" in w.client) &&
            w.client.initialized)
        {
            dump("cz-service: It lied. It's finished starting.\n");
            // It's actually loaded ok.
            delete hiddenWin.ChatZillaStarting;
        }
    }

    if ("ChatZillaStarting" in hiddenWin)
    {
        count = count || 0;

        if ((new Date() - hiddenWin.ChatZillaStarting) > 10000)
        {
            dump("cz-service: Continuing to be unable to talk to existing window!\n");
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
        dump("cz-service: Existing, fully loaded window. Using.\n");
        // Window is working and initialized ok. Use it.
        w.focus();
        if (uri)
            w.gotoIRCURL(uri);
        return true;
    }

    dump("cz-service: No windows, starting new one.\n");
    // Ok, no available window, loading or otherwise, so start ChatZilla.
    const args = new Object();
    if (uri)
        args.url = uri;

    hiddenWin.ChatZillaStarting = new Date();
    hiddenWin.openDialog("chrome://chatzilla/content/chatzilla.xul", "_blank",
                 "chrome,menubar,toolbar,status,resizable,dialog=no",
                 args);

    return true;
}


function CommandLineService()
{
}

CommandLineService.prototype =
{
    /* nsISupports */
    QueryInterface(iid)
    {
        if (iid.equals(Ci.nsISupports))
            return this;

        if (Ci.nsICommandLineHandler && iid.equals(Ci.nsICommandLineHandler))
            return this;

        throw Cr.NS_ERROR_NO_INTERFACE;
    },

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

    helpInfo: "-chat [<ircurl>]  Start with an IRC chat client.\n",
};


/* factory for command line handler service (CommandLineService) */
const CommandLineFactory =
{
    createInstance(outer, iid)
    {
        if (outer != null)
            throw Cr.NS_ERROR_NO_AGGREGATION;

        return new CommandLineService().QueryInterface(iid);
    },
};


function ProcessHandler()
{
}

ProcessHandler.prototype =
{
    /* nsISupports */
    QueryInterface(iid)
    {
        if (iid.equals(Ci.nsISupports) ||
            iid.equals(Ci.nsIObserver) ||
            iid.equals(Ci.nsIMessageListener))
        {
            return this;
        }

        throw Cr.NS_ERROR_NO_INTERFACE;
    },

    /* nsIObserver */
    observe(subject, topic, data)
    {
        if (topic !== "profile-after-change")
            return;

        const compMgr = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
        compMgr.registerFactory(IRCPROT_HANDLER_CID,
                                "IRC protocol handler",
                                IRCPROT_HANDLER_CONTRACTID,
                                IRCProtocolHandlerFactory);
        compMgr.registerFactory(IRCSPROT_HANDLER_CID,
                                "IRC protocol handler",
                                IRCSPROT_HANDLER_CONTRACTID,
                                IRCSProtocolHandlerFactory);
    },
};


const StartupFactory =
{
    createInstance(outer, iid)
    {
        if (outer)
            throw Cr.NS_ERROR_NO_AGGREGATION;

        if (!iid.equals(Ci.nsISupports))
            throw Cr.NS_ERROR_NO_INTERFACE;

        // startup:
        return new ProcessHandler();
    },
};

function IRCProtocolHandler(isSecure)
{
    this.isSecure = isSecure;
}

var protocolFlags = Ci.nsIProtocolHandler.URI_NORELATIVE |
                    Ci.nsIProtocolHandler.ALLOWS_PROXY;
if ("URI_DANGEROUS_TO_LOAD" in Ci.nsIProtocolHandler) {
    protocolFlags |= Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE;
}
if ("URI_NON_PERSISTABLE" in Ci.nsIProtocolHandler) {
    protocolFlags |= Ci.nsIProtocolHandler.URI_NON_PERSISTABLE;
}
if ("URI_DOES_NOT_RETURN_DATA" in Ci.nsIProtocolHandler) {
    protocolFlags |= Ci.nsIProtocolHandler.URI_DOES_NOT_RETURN_DATA;
}

IRCProtocolHandler.prototype =
{
    protocolFlags: protocolFlags,

    allowPort(port, scheme)
    {
        // Allow all ports to connect, so long as they are irc: or ircs:
        return (scheme === 'irc' || scheme === 'ircs');
    },

    newURI(spec, charset, baseURI)
    {
        const cls = Cc[STANDARDURL_CONTRACTID];
        const url = cls.createInstance(Ci.nsIStandardURL);
        const port = this.isSecure ? 6697 : 6667;

        url.init(Ci.nsIStandardURL.URLTYPE_STANDARD, port, spec, charset, baseURI);

        return url.QueryInterface(Ci.nsIURI);
    },

    newChannel(URI)
    {
        const ios = Cc[IOSERVICE_CONTRACTID].getService(Ci.nsIIOService);
        if (!ios.allowPort(URI.port, URI.scheme))
            throw Cr.NS_ERROR_FAILURE;

        return new BogusChannel(URI, this.isSecure);
    },
};


this.IRCProtocolHandlerFactory =
{
    createInstance(outer, iid)
    {
        if (outer != null)
            throw Cr.NS_ERROR_NO_AGGREGATION;

        if (!iid.equals(Ci.nsIProtocolHandler) && !iid.equals(Ci.nsISupports))
            throw Cr.NS_ERROR_INVALID_ARG;

        const protHandler = new IRCProtocolHandler(false);
        protHandler.scheme = "irc";
        protHandler.defaultPort = 6667;
        return protHandler;
    },
};

this.IRCSProtocolHandlerFactory =
{
    createInstance(outer, iid)
    {
        if (outer != null)
            throw Cr.NS_ERROR_NO_AGGREGATION;

        if (!iid.equals(Ci.nsIProtocolHandler) && !iid.equals(Ci.nsISupports))
            throw Cr.NS_ERROR_INVALID_ARG;

        const protHandler = new IRCProtocolHandler(true);
        protHandler.scheme = "ircs";
        protHandler.defaultPort = 6697;
        return protHandler;
    },
};

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

const ChatZillaModule =
{
    registerSelf(compMgr, fileSpec, location, type)
    {
        compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
        const catman = Cc[CATMAN_CONTRACTID].getService(Ci.nsICategoryManager);

        debug("*** Registering -chat handler.\n");
        compMgr.registerFactoryLocation(CLINE_SERVICE_CID,
                                            "ChatZilla CommandLine Service",
                                        CLINE_SERVICE_CONTRACTID,
                                        fileSpec, location, type);
        catman.addCategoryEntry("command-line-argument-handlers",
                                "chatzilla command line handler",
                                CLINE_SERVICE_CONTRACTID, true, true);
        catman.addCategoryEntry("command-line-handler",
                                "m-irc",
                                CLINE_SERVICE_CONTRACTID, true, true);

        debug("*** Registering irc protocol handler.\n");
            ChatZillaProtocols.initObsolete(compMgr, fileSpec, location, type);

        debug("*** Registering done.\n");
    },

    unregisterSelf(compMgr, fileSpec, location)
    {
        compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);

        const catman = Cc[CATMAN_CONTRACTID].getService(Ci.nsICategoryManager);
        catman.deleteCategoryEntry("command-line-argument-handlers",
                                   "chatzilla command line handler", true);
        catman.deleteCategoryEntry("command-line-handler",
                                   "m-irc", true);
    },

    getClassObject(compMgr, cid, iid)
    {
        // Checking if we're disabled in the Chrome Registry.
        var rv;
        try
        {
            const rdfSvc = Cc[RDFS_CONTRACTID].getService(Ci.nsIRDFService);
            const rdfDS = rdfSvc.GetDataSource("rdf:chrome");
            const resSelf = rdfSvc.GetResource("urn:mozilla:package:chatzilla");
            const resDisabled = rdfSvc.GetResource("http://www.mozilla.org/rdf/chrome#disabled");
            rv = rdfDS.GetTarget(resSelf, resDisabled, true);
        }
        catch (e)
        {
        }
        if (rv)
            throw Cr.NS_ERROR_NO_INTERFACE;

        if (cid.equals(CLINE_SERVICE_CID))
            return CommandLineFactory;

        if (cid.equals(IRCPROT_HANDLER_CID))
            return IRCProtocolHandlerFactory;

        if (cid.equals(IRCSPROT_HANDLER_CID))
            return IRCSProtocolHandlerFactory;

        if (cid.equals(STARTUP_CID))
            return StartupFactory;

        if (!iid.equals(Ci.nsIFactory))
            throw Cr.NS_ERROR_NOT_IMPLEMENTED;

        throw Cr.NS_ERROR_NO_INTERFACE;
    },

    canUnload(compMgr)
    {
        return true;
    },
};


/* entrypoint */
function NSGetModule(compMgr, fileSpec)
{
    return ChatZillaModule;
}

function NSGetFactory(cid)
{
    return ChatZillaModule.getClassObject(null, cid, null);
}
