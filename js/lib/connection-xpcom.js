/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 *
 * The contents of this file are subject to the Mozilla Public
 * License Version 1.1 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of
 * the License at http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS
 * IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * rights and limitations under the License.
 *
 * The Original Code is JSIRC Library
 *
 * The Initial Developer of the Original Code is New Dimensions Consulting,
 * Inc. Portions created by New Dimensions Consulting, Inc. are
 * Copyright (C) 1999 New Dimenstions Consulting, Inc. All
 * Rights Reserved.
 *
 * Contributor(s): 
 *
 *
 * Contributor(s):
 *  Robert Ginda, rginda@ndcico.com, original author
 *  Peter Van der Beken, peter.vanderbeken@pandora.be, necko-only version
 *
 * depends on utils.js, XPCOM, and the XPCOM component
 *  component://misc/bs/connection
 *
 * sane wrapper around the insane bsIConnection component.  This
 * component needs to be replaced, or at least fixed, so this wrapper
 * will hopefully make it easy to do this in the future.
 *
 */

function toScriptableInputStream (i)
{
    var si = Components.classes["component://netscape/scriptableinputstream"];
    
    si = si.createInstance();
    si = si.QueryInterface(Components.interfaces.nsIScriptableInputStream);
    si.init(i);

    return si;
    
}

function CBSConnection ()
{
    var sockServiceClass =
        Components.classesByID["{c07e81e0-ef12-11d2-92b6-00105a1b0d64}"];
    
    if (!sockServiceClass)
        throw ("Couldn't get socket service class.");
    
    var sockService = sockServiceClass.getService();
    if (!sockService)
        throw ("Couldn't get socket service.");

    this._sockService = sockService.QueryInterface
        (Components.interfaces.nsISocketTransportService);

}

CBSConnection.prototype.connect = function(host, port, bind, tcp_flag)
{
    if (typeof tcp_flag == "undefined")
		tcp_flag = false;
    
    this.host = host;
    this.port = port;
    this.bind = bind;
    this.tcp_flag = tcp_flag;

    this._channel = this._sockService.createTransport (host, port, null, -1, 0, 0);
    if (!this._channel)
        throw ("Error opening channel.");

    this._inputStream =
        toScriptableInputStream(this._channel.openInputStream (0, 0));
    if (!this._inputStream)
        throw ("Error getting input stream.");

    this._outputStream = this._channel.openOutputStream(0);
    if (!this._outputStream)
        throw ("Error getting output stream.");

    this.isConnected = true;

    return this.isConnected;
  
}

CBSConnection.prototype.disconnect = function()
{
    
    if (this.isConnected) {
        this.isConnected = false;
        this._inputStream.Close();
        this._outputStream.Close();
    }

}

CBSConnection.prototype.sendData = function(str)
{
    if (!this.isConnected)
        throw "Not Connected.";

    var rv = false;
    
    try
    {
        this._outputStream.Write(str, str.length);
        rv = true;
    }
    catch (ex)
    {
        if (typeof ex != "undefined")
        {
            this.isConnected = false;
            throw (ex);
        }
        else
            rv = false;
    }
    
    return rv;
}

CBSConnection.prototype.readData = function(timeout)
{
    if (!this.isConnected)
        throw "Not Connected.";

    var rv, av;

    try {
        av = this._inputStream.available();
        if (av)
            rv = this._inputStream.read (av);
        else
            rv = "";
    } catch (ex) {
        dd ("*** Caught " + ex + " while reading.")
        if (typeof ex != "undefined") {
            this.isConnected = false;
            throw (ex);
        } else {
            rv = "";
        }
    }
    
    return rv;
}
