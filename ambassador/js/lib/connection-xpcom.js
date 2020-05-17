/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const NS_ERROR_MODULE_NETWORK = 2152398848;

const NS_ERROR_UNKNOWN_HOST = NS_ERROR_MODULE_NETWORK + 30;
const NS_ERROR_CONNECTION_REFUSED = NS_ERROR_MODULE_NETWORK + 13;
const NS_ERROR_NET_TIMEOUT = NS_ERROR_MODULE_NETWORK + 14;
const NS_ERROR_OFFLINE = NS_ERROR_MODULE_NETWORK + 16;
const NS_ERROR_NET_RESET = NS_ERROR_MODULE_NETWORK + 20;
const NS_ERROR_UNKNOWN_PROXY_HOST = NS_ERROR_MODULE_NETWORK + 42;
const NS_ERROR_PROXY_CONNECTION_REFUSED = NS_ERROR_MODULE_NETWORK + 72;

// Offline error constants:
const NS_ERROR_BINDING_ABORTED = NS_ERROR_MODULE_NETWORK + 2;
const NS_ERROR_ABORT = 0x80004004;

const NS_NET_STATUS_RESOLVING_HOST = NS_ERROR_MODULE_NETWORK + 3;
const NS_NET_STATUS_CONNECTED_TO = NS_ERROR_MODULE_NETWORK + 4;
const NS_NET_STATUS_SENDING_TO = NS_ERROR_MODULE_NETWORK + 5;
const NS_NET_STATUS_RECEIVING_FROM = NS_ERROR_MODULE_NETWORK + 6;
const NS_NET_STATUS_CONNECTING_TO = NS_ERROR_MODULE_NETWORK + 7;

// Security error class constants:
const ERROR_CLASS_SSL_PROTOCOL = 1;
const ERROR_CLASS_BAD_CERT = 2;

// Security Constants.
const STATE_IS_BROKEN = 1;
const STATE_IS_SECURE = 2;
const STATE_IS_INSECURE = 3;

const STATE_SECURE_LOW = 1;
const STATE_SECURE_HIGH = 2;

const STATE_SECURE_KEYSIZE = 128;

const nsIScriptableInputStream = Components.interfaces.nsIScriptableInputStream;

const nsIBinaryInputStream = Components.interfaces.nsIBinaryInputStream;
const nsIBinaryOutputStream = Components.interfaces.nsIBinaryOutputStream;

function toSInputStream(stream, binary)
{
    var sstream;

    if (binary)
    {
        sstream = Components.classes["@mozilla.org/binaryinputstream;1"];
        sstream = sstream.createInstance(nsIBinaryInputStream);
        sstream.setInputStream(stream);
    }
    else
    {
        sstream = Components.classes["@mozilla.org/scriptableinputstream;1"];
        sstream = sstream.createInstance(nsIScriptableInputStream);
        sstream.init(stream);
    }

    return sstream;
}

function toSOutputStream(stream, binary)
{
    var sstream;

    if (binary)
    {
        sstream = Components.classes["@mozilla.org/binaryoutputstream;1"];
        sstream = sstream.createInstance(Components.interfaces.nsIBinaryOutputStream);
        sstream.setOutputStream(stream);
    }
    else
    {
        sstream = stream;
    }

    return sstream;
}

/* This object implements nsIBadCertListener2
 * The idea is to suppress the default UI's alert box
 * and allow the exception to propagate normally
 */
function BadCertHandler()
{
}

BadCertHandler.prototype.getInterface =
function badcert_getinterface(aIID)
{
    return this.QueryInterface(aIID);
}

BadCertHandler.prototype.QueryInterface =
function badcert_queryinterface(aIID)
{
    if (aIID.equals(Components.interfaces.nsIBadCertListener2) ||
        aIID.equals(Components.interfaces.nsIInterfaceRequestor) ||
        aIID.equals(Components.interfaces.nsISupports))
    {
        return this;
    }

    throw Components.results.NS_ERROR_NO_INTERFACE;
}

/* Returning true in the following two callbacks
 * means suppress default the error UI (modal alert).
 */
BadCertHandler.prototype.notifyCertProblem =
function badcert_notifyCertProblem(socketInfo, sslStatus, targetHost)
{
    return true;
}

/**
 * Wraps up various mechanics of sockets for easy consumption by other code.
 *
 * @param binary Provide |true| or |false| here to override the automatic
 *               selection of binary or text streams. This should only ever be
 *               specified as |true| or omitted, otherwise you will be shooting
 *               yourself in the foot on some versions - let the code handle
 *               the choice unless you know you need binary.
 */
function CBSConnection (binary)
{
    /* Since 2003-01-17 18:14, Mozilla has had this contract ID for the STS.
     * Prior to that it didn't have one, so we also include the CID for the
     * STS back then - DO NOT UPDATE THE ID if it changes in Mozilla.
     */
    const sockClassByName =
        Components.classes["@mozilla.org/network/socket-transport-service;1"];
    const sockClassByID =
        Components.classesByID["{c07e81e0-ef12-11d2-92b6-00105a1b0d64}"];

    var sockServiceClass = (sockClassByName || sockClassByID);

    if (!sockServiceClass)
        throw ("Couldn't get socket service class.");

    var sockService = sockServiceClass.getService();
    if (!sockService)
        throw ("Couldn't get socket service.");

    this._sockService = sockService.QueryInterface
        (Components.interfaces.nsISocketTransportService);

    /* Note: as part of the mess from bug 315288 and bug 316178, ChatZilla now
     *       uses the *binary* stream interfaces for all network
     *       communications.
     *
     *       However, these interfaces do not exist prior to 1999-11-05. To
     *       make matters worse, an incompatible change to the "readBytes"
     *       method of this interface was made on 2003-03-13; luckly, this
     *       change also added a "readByteArray" method, which we will check
     *       for below, to determine if we can use the binary streams.
     */

    // We want to check for working binary streams only the first time.
    if (CBSConnection.prototype.workingBinaryStreams == -1)
    {
        CBSConnection.prototype.workingBinaryStreams = false;

        if (typeof nsIBinaryInputStream != "undefined")
        {
            var isCls = Components.classes["@mozilla.org/binaryinputstream;1"];
            var inputStream = isCls.createInstance(nsIBinaryInputStream);
            if ("readByteArray" in inputStream)
                CBSConnection.prototype.workingBinaryStreams = true;
        }
    }

    /*
     * As part of the changes in Gecko 1.9, invalid SSL certificates now
     * produce a horrible error message. We must look up the toolkit version
     * to see if we need to catch these errors cleanly - see bug 454966.
     */
    if (!("strictSSL" in CBSConnection.prototype))
    {
        CBSConnection.prototype.strictSSL = false;
        var app = getService("@mozilla.org/xre/app-info;1", "nsIXULAppInfo");
        if (app && ("platformVersion" in app) &&
            compareVersions("1.9", app.platformVersion) >= 0)
        {
            CBSConnection.prototype.strictSSL = true;
        }
    }

    this.wrappedJSObject = this;
    if (typeof binary != "undefined")
        this.binaryMode = binary;
    else
        this.binaryMode = this.workingBinaryStreams;

    if (!ASSERT(!this.binaryMode || this.workingBinaryStreams,
                "Unable to use binary streams in this build."))
    {
        throw ("Unable to use binary streams in this build.");
    }
}

CBSConnection.prototype.workingBinaryStreams = -1;

CBSConnection.prototype.connect =
function bc_connect(host, port, config, observer)
{
    this.host = host.toLowerCase();
    this.port = port;

    /* The APIs below want host:port. Later on, we also reformat the host to
     * strip IPv6 literal brackets.
     */
    var hostPort = host + ":" + port;

    if (!config)
        config = {};

    if (!("proxyInfo" in config))
    {
    // Lets get a transportInfo for this
    var pps = getService("@mozilla.org/network/protocol-proxy-service;1",
                         "nsIProtocolProxyService");
        var ios = getService("@mozilla.org/network/io-service;1",
                             "nsIIOService");

        /* Force Necko to supply the HTTP proxy info if desired. For none,
         * force no proxy. Other values will get default treatment.
         */
        var uri = "irc://" + hostPort;
        if ("proxy" in config)
        {
        if (config.proxy == "http")
                uri = "http://" + hostPort;
            else if (config.proxy == "none")
                uri = "";
        }

        var self = this;
        function continueWithProxy(proxyInfo)
        {
            config.proxyInfo = proxyInfo;
            try
            {
                self.connect(host, port, config, observer);
            }
            catch (ex)
            {
                if ("onSocketConnection" in observer)
                    observer.onSocketConnection(host, port, config, ex);
                return;
            }
            if ("onSocketConnection" in observer)
                observer.onSocketConnection(host, port, config);
        }

        if (uri)
        {
            uri = ios.newURI(uri, null, null);
            if ("asyncResolve" in pps)
            {
                pps.asyncResolve(uri, 0, {
                    onProxyAvailable: function(request, uri, proxyInfo, status) {
                        continueWithProxy(proxyInfo);
                    }
                });
            }
            else if ("resolve" in pps)
            {
                continueWithProxy(pps.resolve(uri, 0));
            }
            else if ("examineForProxy" in pps)
            {
                continueWithProxy(pps.examineForProxy(uri));
            }
            else
            {
                throw "Unable to find method to resolve proxies";
            }
        }
        else
        {
            continueWithProxy(null);
        }
        return true;
    }

    // Strip the IPv6 literal brackets; all the APIs below don't want them.
    if (host[0] == '[' && host[host.length - 1] == ']')
        host = host.substr(1, host.length - 2);

        /* Since the proxy info is opaque, we need to check that we got
         * something for our HTTP proxy - we can't just check proxyInfo.type.
         */
    var proxyInfo = config.proxyInfo || null;
    var usingHTTPCONNECT = ("proxy" in config) && (config.proxy == "http")
                           && proxyInfo;

    if (proxyInfo && ("type" in proxyInfo) && (proxyInfo.type == "unknown"))
        throw JSIRC_ERR_PAC_LOADING;

    /* use new necko interfaces */
    if (("isSecure" in config) && config.isSecure)
    {
        this._transport = this._sockService.
                          createTransport(["ssl"], 1, host, port,
                                          proxyInfo);

        if (this.strictSSL)
            this._transport.securityCallbacks = new BadCertHandler();
    }
    else
    {
        this._transport = this._sockService.
                          createTransport(["starttls"], 1, host, port, proxyInfo);
    }
    if (!this._transport)
        throw ("Error creating transport.");

    var openFlags = 0;

    /* no limit on the output stream buffer */
    this._outputStream =
        this._transport.openOutputStream(openFlags, 4096, -1);
    if (!this._outputStream)
        throw "Error getting output stream.";
    this._sOutputStream = toSOutputStream(this._outputStream,
                                          this.binaryMode);

    this._inputStream = this._transport.openInputStream(openFlags, 0, 0);
    if (!this._inputStream)
        throw "Error getting input stream.";
    this._sInputStream = toSInputStream(this._inputStream,
                                        this.binaryMode);

    this.connectDate = new Date();
    this.isConnected = true;

    // Bootstrap the connection if we're proxying via an HTTP proxy.
    if (usingHTTPCONNECT)
        this.sendData("CONNECT " + hostPort + " HTTP/1.1\r\n\r\n");

    return true;

}

CBSConnection.prototype.startTLS =
function bc_starttls()
{
    if (!this.isConnected || !this._transport.securityInfo)
        return;

    var secInfo = this._transport.securityInfo;
    var sockControl = secInfo.QueryInterface
        (Components.interfaces.nsISSLSocketControl);
    sockControl.StartTLS();
}

CBSConnection.prototype.listen =
function bc_listen(port, observer)
{
    var serverSockClass =
        Components.classes["@mozilla.org/network/server-socket;1"];

    if (!serverSockClass)
        throw ("Couldn't get server socket class.");

    var serverSock = serverSockClass.createInstance();
    if (!serverSock)
        throw ("Couldn't get server socket.");

    this._serverSock = serverSock.QueryInterface
        (Components.interfaces.nsIServerSocket);

    this._serverSock.init(port, false, -1);

    this._serverSockListener = new SocketListener(this, observer);

    this._serverSock.asyncListen(this._serverSockListener);

    this.port = this._serverSock.port;

    return true;
}

CBSConnection.prototype.accept =
function bc_accept(transport, observer)
{
    this._transport = transport;
    this.host = this._transport.host.toLowerCase();
    this.port = this._transport.port;

    var openFlags = 0;

    /* no limit on the output stream buffer */
    this._outputStream =
        this._transport.openOutputStream(openFlags, 4096, -1);
    if (!this._outputStream)
        throw "Error getting output stream.";
    this._sOutputStream = toSOutputStream(this._outputStream,
                                          this.binaryMode);

    this._inputStream = this._transport.openInputStream(openFlags, 0, 0);
    if (!this._inputStream)
        throw "Error getting input stream.";
    this._sInputStream = toSInputStream(this._inputStream,
                                        this.binaryMode);

    this.connectDate = new Date();
    this.isConnected = true;

    // Clean up listening socket.
    this.close();

    return this.isConnected;
}

CBSConnection.prototype.close =
function bc_close()
{
    if ("_serverSock" in this && this._serverSock)
        this._serverSock.close();
}

CBSConnection.prototype.disconnect =
function bc_disconnect()
{
    if ("_inputStream" in this && this._inputStream)
        this._inputStream.close();
    if ("_outputStream" in this && this._outputStream)
        this._outputStream.close();
    this.isConnected = false;
}

CBSConnection.prototype.sendData =
function bc_senddata(str)
{
    if (!this.isConnected)
        throw "Not Connected.";

    this.sendDataNow (str);
}

CBSConnection.prototype.readData =
function bc_readdata(timeout, count)
{
    if (!this.isConnected)
        throw "Not Connected.";

    var rv;

    if (!("_sInputStream" in this)) {
        this._sInputStream = toSInputStream(this._inputStream);
        dump("OMG, setting up _sInputStream!\n");
    }

    try
    {
        // XPCshell h4x
        if (typeof count == "undefined")
            count = this._sInputStream.available();
        if (this.binaryMode)
            rv = this._sInputStream.readBytes(count);
        else
            rv = this._sInputStream.read(count);
    }
    catch (ex)
    {
        dd ("*** Caught " + ex + " while reading.");
        this.disconnect();
        throw (ex);
    }

    return rv;
}

CBSConnection.prototype.startAsyncRead =
function bc_saread (observer)
{
    var cls = Components.classes["@mozilla.org/network/input-stream-pump;1"];
    var pump = cls.createInstance(Components.interfaces.nsIInputStreamPump);
    pump.init(this._inputStream, -1, -1, 0, 0, false);
    pump.asyncRead(new StreamListener(observer), this);
}

CBSConnection.prototype.sendDataNow =
function bc_senddatanow(str)
{
    var rv = false;

    try
    {
        if (this.binaryMode)
            this._sOutputStream.writeBytes(str, str.length);
        else
            this._sOutputStream.write(str, str.length);
        rv = true;
    }
    catch (ex)
    {
        dd ("*** Caught " + ex + " while sending.");
        this.disconnect();
        throw (ex);
    }

    return rv;
}

/**
 * @returns A structure containing information about the security of the connection.
 */
CBSConnection.prototype.getSecurityInfo =
function bc_getsecurityinfo()
{
    var rv = {
        hostName: this.host,
        cipherSuite: null,
        keyLength: null,
        protocolVersion: null,
        certTransparency: null,
        state: [STATE_IS_INSECURE]
    }

    if (!this.isConnected || !this._transport.securityInfo)
        return rv;

    const nsISSLStatusProvider = Components.interfaces.nsISSLStatusProvider;
    const nsISSLStatus = Components.interfaces.nsISSLStatus;

    // Get the actual SSL Status
    var sslSp = this._transport.securityInfo.QueryInterface(nsISSLStatusProvider);
    if (!sslSp.SSLStatus)
        return rv;
    var sslStatus = sslSp.SSLStatus.QueryInterface(nsISSLStatus);

    rv.cipherSuite = sslStatus.cipherSuite;
    rv.keyLength = sslStatus.keyLength;

    switch (sslStatus.protocolVersion)
    {
        case nsISSLStatus.SSL_VERSION_3:
            rv.protocolVersion = "SSL 3.0"
            break;
        case nsISSLStatus.TLS_VERSION_1:
            rv.protocolVersion = "TLS 1.0"
            break;
        case nsISSLStatus.TLS_VERSION_1_1:
            rv.protocolVersion = "TLS 1.1"
            break;
        case nsISSLStatus.TLS_VERSION_1_2:
            rv.protocolVersion = "TLS 1.2"
            break;
        case nsISSLStatus.TLS_VERSION_1_3:
            rv.protocolVersion = "TLS 1.3"
            break;
    }

    switch (sslStatus.certificateTransparencyStatus)
    {
        case nsISSLStatus.CERTIFICATE_TRANSPARENCY_NOT_APPLICABLE:
            // CT compliance checks were not performed,
            // do not display any status text.
            rv.certTransparency = null;
            break;
        case nsISSLStatus.CERTIFICATE_TRANSPARENCY_NONE:
            rv.certTransparency = "None";
            break;
        case nsISSLStatus.CERTIFICATE_TRANSPARENCY_OK:
            rv.certTransparency = "OK";
            break;
        case nsISSLStatus.CERTIFICATE_TRANSPARENCY_UNKNOWN_LOG:
            rv.certTransparency = "UnknownLog";
            break;
        case nsISSLStatus.CERTIFICATE_TRANSPARENCY_INVALID:
            rv.certTransparency = "Invalid";
            break;
    }

/*  State is an array with at least one item, containing a value from the
 *  |STATE_IS_*| enumeration at the top of this file. Iff this is
 *  |STATE_IS_SECURE|, the array has a second item indicating the level
 *  of security - a value from the |STATE_SECURE_*| enumeration.
 */
    if (sslStatus.protocolVersion <= nsISSLStatus.SSL_VERSION_3 || !rv.keyLength)
        rv.state = [STATE_IS_BROKEN];
    else if (sslStatus.protocolVersion <= nsISSLStatus.TLS_VERSION_1 || rv.keyLength < STATE_SECURE_KEYSIZE)
        rv.state = [STATE_IS_SECURE, STATE_SECURE_LOW];
    else
        rv.state = [STATE_IS_SECURE, STATE_SECURE_HIGH];

    return rv;
}

CBSConnection.prototype.getCertificate =
function bc_getcertificate()
{
    if (!this.isConnected || !this._transport.securityInfo.SSLStatus)
        return null;

    var sslSp = Components.interfaces.nsISSLStatusProvider;
    var sslStatus = Components.interfaces.nsISSLStatus;

    // Get the actual SSL Status
    sslSp = this._transport.securityInfo.QueryInterface(sslSp);
    sslStatus = sslSp.SSLStatus.QueryInterface(sslStatus);

    // return the certificate
    return sslStatus.serverCert;
}

function StreamListener(observer)
{
    this._observer = observer;
}

StreamListener.prototype.onStartRequest =
function sl_startreq (request, ctxt)
{
    //dd ("StreamListener::onStartRequest: " + request + ", " + ctxt);
}

StreamListener.prototype.onStopRequest =
function sl_stopreq (request, ctxt, status)
{
    //dd ("StreamListener::onStopRequest: " + request + ", " + ctxt + ", " +
    //status);
    if (this._observer)
        this._observer.onStreamClose(status);
}

StreamListener.prototype.onDataAvailable =
function sl_dataavail (request, ctxt, inStr, sourceOffset, count)
{
    ctxt = ctxt.wrappedJSObject;
    if (!ctxt)
    {
        dd ("*** Can't get wrappedJSObject from ctxt in " +
            "StreamListener.onDataAvailable ***");
        return;
    }

    if (!("_sInputStream" in ctxt))
        ctxt._sInputStream = toSInputStream(inStr, false);

    if (this._observer)
        this._observer.onStreamDataAvailable(request, inStr, sourceOffset,
                                             count);
}

function SocketListener(connection, observer)
{
    this._connection = connection;
    this._observer = observer;
}

SocketListener.prototype.onSocketAccepted =
function sl_onSocketAccepted(socket, transport)
{
    this._observer.onSocketAccepted(socket, transport);
}
SocketListener.prototype.onStopListening =
function sl_onStopListening(socket, status)
{
    delete this._connection._serverSockListener;
    delete this._connection._serverSock;
}
