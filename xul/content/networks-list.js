/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MEDIATOR_CONTRACTID   = "@mozilla.org/appshell/window-mediator;1";
const nsIWindowMediator     = Components.interfaces.nsIWindowMediator;
const NETWORK_WINDOWTYPE     = "irc:ambassador:networks";

var ASSERT = function(cond, msg) { if (!cond) { alert(msg); } return cond; }
var client;

// To be able to load static.js, we need a few things defined first:
function CIRCNetwork() {}
function CIRCServer() {}
function CIRCChannel() {}
function CIRCUser() {}
function CIRCChanUser() {}
function CIRCDCCUser() {}
function CIRCDCCChat() {}
function CIRCDCCFile() {}
function CIRCDCCFileTransfer() {}
function CIRCSTS() {}

// Stores network item data.
function NetworkObject(name, displayName)
{
    this.name = name;
    this.displayName = displayName || name;
    this.servers = new Array();
    return this;
};

// Returns the network item tree label.
NetworkObject.prototype.getLabel =
function no_getLabel()
{
    return this.name;
}

// Returns the network item header text.
NetworkObject.prototype.getPrettyName =
function no_getPrettyName()
{
    return getMsg(MSG_NETWORKS_FMT_DISPLAY_NETWORK,
                  this.name);
}

// Stores server item data.
function ServerObject(hostname, port, isSecure, network)
{
    this.hostname = hostname;
    this.port = port;
    if (isSecure)
        this.isSecure = isSecure;
    this.network = network;
    return this;
};

// Returns the server item tree label.
ServerObject.prototype.getLabel =
function so_getLabel()
{
    return this.hostname + ":" + this.port;
}

// Returns the server item header text.
ServerObject.prototype.getPrettyName =
function so_getPrettyName()
{
    return getMsg(MSG_NETWORKS_FMT_DISPLAY_SERVER,
                  [this.network, this.getLabel()]);
}

// Maintains network data stored in the tree.
function NetworkTree()
{
    this.treeObj = document.getElementById("network-tree-object");
    this.tree = document.getElementById("network-tree");
}

// Returns the tree object's selected index.
NetworkTree.prototype.selectedIndex =
function ntree_selectedIndex()
{
    return this.treeObj.view.selection.currentIndex;
}

// Returns the selected item's parent index.
NetworkTree.prototype.selectionParentIndex =
function ntree_selectionParentIndex()
{
    var index = this.selectedIndex();
    if (index < 0)
        return index;
    return this.treeObj.view.getParentIndex(index);
}

// Returns the index of the next visible sibling row below |row|.
NetworkTree.prototype.getNextSibling =
function ntree_getNextSibling(row)
{
    var rowLevel = this.treeObj.view.getLevel(row);
    for (var i = row + 1; i < this.treeObj.view.rowCount; i++)
    {
        var nextLevel = this.treeObj.view.getLevel(i);
        if (nextLevel == rowLevel)
            return i;
        if (nextLevel < rowLevel)
            break;
    }

    return -1;
}

// Returns the index of the next visible sibling row above |row|.
NetworkTree.prototype.getPrevSibling =
function ntree_getPrevSibling(row)
{
    var rowLevel = this.treeObj.view.getLevel(row);
    for (var i = row - 1; i >= 0; i--)
    {
        var prevLevel = this.treeObj.view.getLevel(i);
        if (prevLevel == rowLevel)
            return i;
        if (prevLevel < rowLevel)
            break;
    }

    return -1;
}

// Add an object to the tree.
NetworkTree.prototype.addObject =
function ntree_addObject(data, parentItem)
{
    var treeContainer = document.createElement("treeitem");
    var treeNode = document.createElement("treerow");
    var treeCell = document.createElement("treecell");

    var label = data.getLabel();
    treeCell.setAttribute("label", label);
    treeContainer.data = data;
    treeContainer.cell = treeCell;

    treeContainer.appendChild(treeNode);
    treeNode.appendChild(treeCell);

    if (!parentItem)
    {
        this.tree.appendChild(treeContainer);
    }
    else
    {
        if (!("treeChildren" in parentItem) || !parentItem.treeChildren)
        {
            parentItem.treeChildren = document.createElement("treechildren");
            parentItem.appendChild(parentItem.treeChildren);
            var parentIndex = this.treeObj.view.getIndexOfItem(parentItem);
            this.treeObj.view.toggleOpenState(parentIndex);
        }
        parentItem.setAttribute("container", "true");
        parentItem.treeChildren.appendChild(treeContainer);
    }

    // Select the new item.
    var i = this.treeObj.view.getIndexOfItem(treeContainer);
    this.treeObj.view.selection.select(i);

    return treeContainer;
}

// Removes the selected object from the tree.
NetworkTree.prototype.removeSelectedObject =
function ntree_removeSelectedObject()
{
    var networkItem = this.treeObj.view.getItemAtIndex(this.selectedIndex());
    var parentIndex = this.selectionParentIndex();

    /* Select a new item before removing the current item.
     * Start by getting the next sibling down.
     * If we don't have one, get the next sibling up.
     * If we have no siblings, get the parent.
     * If we have no selectable parent, select nothing.
     */
    var row = this.selectedIndex();
    var i = this.getNextSibling(row);
    if (i < 0)
        i = this.getPrevSibling(row);
    if (i < 0)
        i = this.selectionParentIndex();
    this.treeObj.view.selection.select(i);

    if (networkItem.data instanceof NetworkObject)
    {
        this.tree.removeChild(networkItem);
    }
    else
    {
        var parentItem = this.treeObj.view.getItemAtIndex(parentIndex);
        parentItem.treeChildren.removeChild(networkItem);
        if (parentItem.treeChildren.childElementCount == 0)
        {
            parentItem.removeChild(parentItem.treeChildren);
            delete parentItem.treeChildren;
            parentItem.setAttribute("container", "true");
            if (this.treeObj.view.isContainerOpen(parentIndex))
                this.treeObj.view.toggleOpenState(parentIndex);
        }
    }
}

// Loads the data for the selected item.
NetworkTree.prototype.loadData =
function ntree_loadData()
{
    var item = this.treeObj.view.getItemAtIndex(this.selectedIndex());

    var networkEditor = document.getElementById("network-editor-box");
    var serverEditor = document.getElementById("server-editor-box");

    if (item.data instanceof NetworkObject)
    {
        networkEditor.style.display = null;

        var editName = document.getElementById("editor-network-name");
        var editDisplayName = document.getElementById("editor-network-displayname");

        editName.value = item.data.name;
        editDisplayName.value = item.data.displayName;
    }
    else
    {
        serverEditor.style.display = null;

        var editHostname = document.getElementById("editor-server-hostname");
        var editPort = document.getElementById("editor-server-port");
        var editSecure = document.getElementById("editor-server-isSecure");

        editHostname.value = item.data.hostname;
        editPort.value = item.data.port;
        editSecure.checked = item.data.isSecure;
    }
}

// Actual network window itself.
function NetworkWindow()
{
    // Not loaded until the network list and objects have been created in |onLoad|.
    this.loaded = false;

    /* NETWORK TREE: Stores all the network and server objects we're using.
     *
     * Each tree item contains a |NetworkObject| with the item's "real" data, which is
     * then displayed in the window and modified by the user.
     */
    this.networkTree = null;

    /* TOOLTIPS: Special tooltips for network settings.
     * 
     * Timer:     return value from |setTimeout| whenever used. There is only 
     *            ever one timer going for the tooltips.
     * Showing:   stores visibility of the tooltip.
     * ShowDelay: ms delay which them mouse must be still to show tooltips.
     * HideDelay: ms delay before the tooltips hide themselves.
     */
    this.tooltipTimer = 0;
    this.tooltipShowing = false;
    this.tooltipShowDelay = 1000;
    this.tooltipHideDelay = 20000;
    this.tooltipBug418798 = false;
}
NetworkWindow.prototype.TYPE = "NetworkWindow";

/* Updates the tooltip state, either showing or hiding it. */
NetworkWindow.prototype.setTooltipState =
function pwin_setTooltipState(visible)
{
    // Shortcut: if we're already in the right state, don't bother.
    if (this.tooltipShowing == visible)
        return;
    
    var tt = document.getElementById("abNetworkTip");
    
    // If we're trying to show it, and we have a reference object
    // (this.tooltipObject), we are ok to go.
    if (visible && this.tooltipObject)
    {
        /* Get the boxObject for the reference object, as we're going to
         * place to tooltip explicitly based on this.
         */
        var tipobjBox = this.tooltipObject.boxObject;
        
        // Adjust the width to that of the reference box.
        tt.sizeTo(tipobjBox.width, tt.boxObject.height);
        /* show tooltip using the reference object, and it's screen 
         * position. NOTE: Most of these parameters are supposed to affect
         * things, and they do seem to matter, but don't work anything like
         * the documentation. Be careful changing them.
         */
        tt.openPopup(this.tooltipObject, "after_start", 0, 0, false, false);
        
        // Set the timer to hide the tooltip some time later...
        // (note the fun inline function)
        this.tooltipTimer = setTimeout(setTooltipState, this.tooltipHideDelay, 
                                       this, false);
        this.tooltipShowing = true;
    }
    else
    {
        /* We're here because either we are meant to be hiding the tooltip,
         * or we lacked the information needed to show one. So hide it.
         */
        tt.hidePopup();
        this.tooltipShowing = false;
    }
}

/** Window event handlers **/

/* Loads the networks list. */
NetworkWindow.prototype.onLoad =
function nwin_onLoad()
{
    client = window.arguments[1];
    client.networkWindow = window;

    initMessages();

    // Use the window mediator service to prevent mutliple instances.
    var windowMediator = Components.classes[MEDIATOR_CONTRACTID];
    var windowManager = windowMediator.getService(nsIWindowMediator);
    var enumerator = windowManager.getEnumerator(NETWORK_WINDOWTYPE);

    enumerator.getNext();
    if (enumerator.hasMoreElements())
    {
        window.close();
        return;
    }

    // The list of objects we're tracking.
    this.networkTree = new NetworkTree();

    // Populate the objects list.
    client.networkList.forEach(function (net)
    {
        if (net.isDeleted)
            return;

        var no = new NetworkObject(net.name, net.displayName);
        var obj = this.networkTree.addObject(no);
        net.servers.forEach(function (serv)
        {
            var so = new ServerObject(serv.hostname, serv.port, serv.isSecure, net.name);
            this.networkTree.addObject(so, obj);
        }, this);
    }, this);

    // Select the first item in the list.
    if (this.networkTree.treeObj.view.rowCount > 0)
        this.networkTree.treeObj.view.selection.select(0);
    else
        this.networkTree.treeObj.view.selection.select(-1);

    this.onSelectObject();

    // We're done, without error, so it's safe to show the stuff.
    document.getElementById("loadDeck").selectedIndex = 1;
    // This allows [OK] to actually save, without this it'll just close.
    this.loaded = true;

    // Force the window to be the right size now, not later.
    window.sizeToContent();

    // Center window.
    if (("arguments" in window) && (0 in window.arguments))
    {
        var ow = window.arguments[0];
 
        window.moveTo(ow.screenX + Math.max((ow.outerWidth  - window.outerWidth ) / 2, 0),
                      ow.screenY + Math.max((ow.outerHeight - window.outerHeight) / 2, 0));
    }
}

/* Closing the window. Clean up. */
NetworkWindow.prototype.onClose =
function nwin_onClose()
{
    if (client)
        delete client.networksWindow;
}

/* OK button. */
NetworkWindow.prototype.onOK =
function nwin_onOK()
{
    var networkList = new Array();

    this.networkTree.tree.childNodes.forEach(function (net)
    {
        net.data.name = net.data.name.toLowerCase();
        net.treeChildren.childNodes.forEach(function (serv)
        {
            // Delete the network attribute before saving.
            delete serv.data.network;
            net.data.servers.push(serv.data);
        });
        networkList.push(net.data);
    });

    client.networkList = networkList;

    // Save the list and update client.networks
    try
    {
        networksSaveList();
    }
    catch (e)
    {
        alert(getMsg(MSG_NETWORKS_ERR_SAVE, e));
        return false;
    }

    networksSyncFromList();
    window.close();
    return true;
}

/* Cancel button. */
NetworkWindow.prototype.onCancel =
function nwin_onCancel()
{
    window.close();
    return true;
}

/* Restore Defaults button. */
NetworkWindow.prototype.onRestore =
function nwin_onRestore()
{
    // Ask for confirmation
    if (!confirm(MSG_NETWORKS_RESTORE))
        return;

    // Repopulate the tree
    while (this.networkTree.treeObj.view.rowCount > 0)
    {
        this.networkTree.tree.removeChild(this.networkTree.tree.lastChild);
    }

    var networks = networksGetDefaults();
    var networkList = new Array();
    for (var name in networks)
        networkList.push(networks[name]);

    networkList.forEach(function (net)
    {
        var no = new NetworkObject(net.name, net.displayName);
        var obj = this.networkTree.addObject(no);
        net.servers.forEach(function (serv)
        {
            var so = new ServerObject(serv.hostname, serv.port, serv.isSecure, net.name);
            this.networkTree.addObject(so, obj);
        }, this);
    }, this);

    // Select the first item in the list.
    if (this.networkTree.treeObj.view.rowCount > 0)
        this.networkTree.treeObj.view.selection.select(0);
    else
        this.networkTree.treeObj.view.selection.select(-1);

    this.onSelectObject();
}

/** Tooltips' event handlers **/

NetworkWindow.prototype.onMouseOver =
function pwin_onMouseOver(object)
{
    this.tooltipObject = object;
    this.tooltipTitle = object.getAttribute("tooltiptitle");
    this.tooltipText = object.getAttribute("tooltipcontent");
    // Reset the timer now we're over a new pref.
    clearTimeout(this.tooltipTimer);
    this.tooltipTimer = setTimeout(setTooltipState, this.tooltipShowDelay, 
                                   this, true);
}

NetworkWindow.prototype.onMouseMove =
function pwin_onMouseMove(object)
{
    // If the tooltip isn't showing, we need to reset the timer.
    if (!this.tooltipShowing)
    {
        clearTimeout(this.tooltipTimer);
        this.tooltipTimer = setTimeout(setTooltipState, this.tooltipShowDelay, 
                                       this, true);
    }
}

NetworkWindow.prototype.onMouseOut =
function pwin_onMouseOut(object)
{
    // Left the pref! Hide tooltip, and clear timer.
    this.setTooltipState(false);
    clearTimeout(this.tooltipTimer);
}

NetworkWindow.prototype.onTooltipPopupShowing =
function pwin_onTooltipPopupShowing(popup)
{
    if (!this.tooltipText)
        return false;
    
    var fChild = popup.firstChild;
    var diff = popup.boxObject.height - fChild.boxObject.height;
    
    // Setup the labels...
    var ttt = document.getElementById("abNetworkTipTitle");
    ttt.firstChild.nodeValue = this.tooltipTitle;
    var ttl = document.getElementById("abNetworkTipLabel");
    ttl.firstChild.nodeValue = this.tooltipText;

    /* In Gecko 1.9, the popup has done no layout at this point, unlike in
     * earlier versions. As a result, the box object of all the elements
     * within it are 0x0. It also means the height of the labels isn't
     * updated. To deal with this, we avoid calling sizeTo with the box
     * object (as it's 0) and instead just force the popup height to 0 -
     * otherwise it will only ever get bigger each time, never smaller.
     */
    if (popup.boxObject.width == 0)
        this.tooltipBug418798 = true;

    if (this.tooltipBug418798)
        popup.height = 0;
    else
        popup.sizeTo(popup.boxObject.width, fChild.boxObject.height + diff);

    return true;
}

/** Components' event handlers **/

// Selected an item in the tree.
NetworkWindow.prototype.onSelectObject =
function nwin_onSelectObject()
{
    var rv = new Object();
    if ("selection" in this.networkTree.treeObj.treeBoxObject)
        this.networkTree.treeObj.treeBoxObject.selection.getRangeAt(0, rv, {});
    else
        this.networkTree.treeObj.view.selection.getRangeAt(0, rv, {});
    var networkTreeIndex = rv.value;
    var data = null;
 
    var header = document.getElementById("network-header");
    var addServButton = document.getElementById("button-add-server");
    var networkEditor = document.getElementById("network-editor-box");
    var serverEditor = document.getElementById("server-editor-box");

    networkEditor.style.display = "none";
    serverEditor.style.display = "none";

    if (networkTreeIndex == -1)
    {
        header.setAttribute("title", MSG_NETWORKS_DEFAULT);
        addServButton.setAttribute("disabled", "true");
        return;
    }

    data = this.networkTree.treeObj.view.getItemAtIndex(networkTreeIndex).data;
    addServButton.setAttribute("disabled", "false");
 
    this.networkTree.loadData();

    header.setAttribute("title", data.getPrettyName())
}

/* Add button, network item. */
NetworkWindow.prototype.onAddNetworkObject =
function nwin_onAddNetworkObject()
{
    var rv = prompt(MSG_NETWORKS_ADD);
    if (!rv)
        return;

    var obj = new NetworkObject(rv);
    this.networkTree.addObject(obj);
}

/* Add button, server item. */
NetworkWindow.prototype.onAddServerObject =
function nwin_onAddServerObject()
{
    var rv = new Object();

    rv.hostname = prompt(MSG_NETWORKS_ADD);
    if (!rv.hostname)
        return;

    /* Get the network we're adding a server to. If the selected treeitem
     * contains a NetworkObject, use it. Otherwise, it contains a
     * ServerObject, so we find the parent item and use that.
     */
    var parentIndex = this.networkTree.selectionParentIndex();
    var networkIndex = (parentIndex >= 0 ? parentIndex : this.networkTree.selectedIndex());
    var networkItem = this.networkTree.treeObj.view.getItemAtIndex(networkIndex);

    var obj = new ServerObject(rv.hostname, 6667, false, networkItem.data.name);

    this.networkTree.addObject(obj, networkItem);
}

/* Delete button. */
NetworkWindow.prototype.onDeleteObject =
function nwin_onDeleteObject()
{
    // Save current node before we re-select.
    var idx = this.networkTree.selectedIndex();
    var item = this.networkTree.treeObj.view.getItemAtIndex(idx);
 
    // Check they want to go ahead.
    if (!confirm(getMsg(MSG_NETWORKS_DELETE, item.data.getLabel())))
        return;

    this.networkTree.removeSelectedObject();
}

/* Network or server object change */
NetworkWindow.prototype.onObjectChange =
function nwin_onObjectChange(obj)
{
    var index = this.networkTree.selectedIndex();
    var item = this.networkTree.treeObj.view.getItemAtIndex(index);

    if (item.data instanceof NetworkObject)
    {
        var editName = document.getElementById("editor-network-name");
        var editDisplayName = document.getElementById("editor-network-displayname");

        item.data.name = editName.value;
        item.data.displayName = editDisplayName.value;
        item.cell.setAttribute("label", item.data.getLabel());
    }
    else
    {
        var editHostname = document.getElementById("editor-server-hostname");
        var editPort = document.getElementById("editor-server-port");
        var editSecure = document.getElementById("editor-server-isSecure");

        item.data.hostname = editHostname.value;
        item.data.port = editPort.value;
        item.data.isSecure = (obj == editSecure ? !editSecure.checked : editSecure.checked);

        // If isSecure is false, just delete it.
        if (!item.data.isSecure)
            delete item.data.isSecure;
        item.cell.setAttribute("label", item.data.getLabel());
    }

}

// End of NetworkWindow. //

// Wrap this call so we have the right |this|.
function setTooltipState(w, s)
{
        w.setTooltipState(s);
}

// And finally, we want one of these.
var gNetworkWindow = new NetworkWindow();
