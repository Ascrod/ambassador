/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var client;
var server;
var certificate;

const STATE_IS_BROKEN = 1;
const STATE_IS_SECURE = 2;
const STATE_IS_INSECURE = 3;

const STATE_SECURE_LOW = 1;
const STATE_SECURE_HIGH = 2;

function onLoad()
{
    client = window.arguments[0].client;
    window.dd = client.mainWindow.dd;
    window.getMsg = client.mainWindow.getMsg;

    var opener = window.arguments[0].opener;
    if (opener)
    {
        // Force the window to be the right size now, not later.
        window.sizeToContent();

        // Position it centered over, but never up or left of parent.
        var sx = Math.max((opener.outerWidth  - window.outerWidth ) / 2, 0);
        var sy = Math.max((opener.outerHeight - window.outerHeight) / 2, 0);
        window.moveTo(opener.screenX + sx, opener.screenY + sy);
    }

    server = window.arguments[0].server;
    certificate = server.connection.getCertificate();
    var info = server.connection.getSecurityInfo();

    setText("security-hostname-value",  server.hostname);
    setText("security-cipher-value",    info.cipherSuite);
    setText("security-keysize-value",   info.keyLength);
    setText("security-protocol-value",  info.protocolVersion);

    var stateText = null;
    switch (info.state[0])
    {
        case STATE_IS_BROKEN:
            stateText = client.mainWindow.MSG_SECURITY_BROKEN;
            break;
        case STATE_IS_INSECURE:
            stateText = client.mainWindow.MSG_SECURITY_INSECURE;
            break;
        case STATE_IS_SECURE:
            if (info.state[1] == STATE_SECURE_HIGH)
                stateText = client.mainWindow.MSG_SECURITY_STRONG;
            else
                stateText = client.mainWindow.MSG_SECURITY_WEAK;
            break;
    }

    setText("security-status-value", stateText);

    var ctStatus =
        document.getElementById("security-certificate-transparency");
    if (info.certificateTransparency) {
        ctStatus.hidden = false;
        ctStatus.value = client.mainWindow["MSG_TRANSPARENCY_" +
            info.certificateTransparency.toUpper()];
    } else {
      ctStatus.hidden = true;
    }
}

function setText(id, value)
{
    var element = document.getElementById(id);
    if (!element)
        return;
    if (element.localName == "textbox" || element.localName == "label")
        element.value = value;
    else {
        if (element.hasChildNodes())
            element.removeChild(element.firstChild);
        var textNode = document.createTextNode(value);
        element.appendChild(textNode);
    }
}
