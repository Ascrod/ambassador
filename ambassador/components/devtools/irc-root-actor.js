/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Actors for UXP Developer Tools, for example the root actor or tab
 * list actor.
 */

var { Ci, Cc } = require("chrome");
var Services = require("Services");
var DevToolsUtils = require("devtools/shared/DevToolsUtils");
var promise = require('promise');
var { RootActor } = require("devtools/server/actors/root");
var { DebuggerServer } = require("devtools/server/main");
var { BrowserTabList, BrowserTabActor, BrowserAddonList } = require("devtools/server/actors/webbrowser");

/**
 * Create the root actor for Ambassador.
 *
 * @param aConnection       The debugger connection to create the actor for.
 * @return                  The IRC actor for the connection.
 */
function createRootActor(aConnection) {
  let parameters = {
    tabList: new IRCTabList(aConnection),
    addonList: new BrowserAddonList(aConnection),
    globalActorFactories: DebuggerServer.globalActorFactories,
    onShutdown: sendShutdownEvent,
  };

  // Create the root actor and set the application type
  let rootActor = new RootActor(aConnection, parameters);
  if (DebuggerServer.chromeWindowType) {
    rootActor.applicationType = DebuggerServer.chromeWindowType.split(":")[0];
  }

  return rootActor;
}
createRootActor.isIrcRootActor = true;

function getChromeWindowTypes() {
  /** @return the list of main windows, see isMainWindow */
  function getMainWindows() {
    let found = [];
    let windows = Services.wm.getEnumerator(null);
    while (windows.hasMoreElements()) {
      let win = windows.getNext();
      if (isMainWindow(win)) {
        found.push(win);
      }
    }
    return found;
  }

  /**
   * Check if the window is the "main window" by checking if the host part
   * matches the basename of the filename.
   *
   * @param aWindow       The window to check
   */
  function isMainWindow(aWindow) {
    let urlParser = Cc["@mozilla.org/network/url-parser;1?auth=no"]
                      .getService(Ci.nsIURLParser);
    let baseName, bnpos = {}, bnlen = {};
    let path = aWindow.location.pathname;
    urlParser.parseFilePath(path, path.length, {}, {}, bnpos, bnlen, {}, {});
    baseName = path.substr(bnpos.value, bnlen.value);
    return (aWindow.location.hostname == baseName);
  }

  return getMainWindows().map((win) => {
    return win.document.documentElement.getAttribute("windowtype");
  });
}

/**
 * Returns the window type of the passed window.
 */
function appShellDOMWindowType(aWindow) {
  // This is what nsIWindowMediator's enumerator checks.
  return aWindow.document.documentElement.getAttribute('windowtype');
}

/**
 * Send a debugger shutdown event to all main windows.
 */
function sendShutdownEvent() {
  let windowTypes = getChromeWindowTypes();
  for (let type of windowTypes) {
    let enumerator = Services.wm.getEnumerator(type);
    while (enumerator.hasMoreElements()) {
      let win = enumerator.getNext();
      let evt = win.document.createEvent("Event");
      evt.initEvent("Debugger:Shutdown", true, false);
      win.document.documentElement.dispatchEvent(evt);
    }
  }
}

/**
 * The live list of tabs for Ambassador. The term tab is taken from
 * Firefox tabs, where each browser tab shows up as a tab in the debugger.
 * This is not the case for Ambassador, so we will be iterating the content
 * windows and presenting them as tabs instead.
 *
 * @param aConnection       The connection to create the tab list for.
 */
function IRCTabList(aConnection) {
  this._connection = aConnection;
  this._actorByBrowser = new Map();

  // These windows should be checked for browser elements

  this._checkedWindows = new Set(getChromeWindowTypes());
}

IRCTabList.prototype = {
  _onListChanged: null,
  _actorByBrowser: null,
  _checkedWindows: null,
  _mustNotify: false,
  _listeningToMediator: false,

  get onListChanged() {
    return this._onListChanged;
  },

  set onListChanged(v) {
    if (v !== null && typeof v !== 'function') {
      throw Error("onListChanged property may only be set to 'null' or a function");
    }
    this._onListChanged = v;
    this._checkListening();
  },

  _checkListening: function() {
    let shouldListenToMediator =
        ((this._onListChanged && this._mustNotify) ||
         this._actorByBrowser.size > 0);

    if (this._listeningToMediator !== shouldListenToMediator) {
      let op = shouldListenToMediator ? "addListener" : "removeListener";
      Services.wm[op](this);
      this._listeningToMediator = shouldListenToMediator;
    }
  },

  _notifyListChanged: function() {
    if (this._onListChanged && this._mustNotify) {
      this._onListChanged();
      this._mustNotify = false;
    }
  },

  _getTopWindow: function() {
    let winIter = Services.wm.getZOrderDOMWindowEnumerator(null, true);
    while (winIter.hasMoreElements()) {
      let win = winIter.getNext();
      if (this._checkedWindows.has(appShellDOMWindowType(win))) {
        // This is one of our windows, return it
        return win;
      }
    }
    return null;
  },

  getList: function() {
    let topWindow = this._getTopWindow();

    // Look for all browser elements in all the windows we care about
    for (let winName of this._checkedWindows) {
      let winIter = Services.wm.getEnumerator(winName);
      while (winIter.hasMoreElements()) {
        let win = winIter.getNext();
        let foundSelected = false;
        // Check for browser elements and create a tab actor for each.
        // This will catch content tabs, the message reader and the
        // multi-message reader.
        for (let browser of win.document.getElementsByTagName("browser")) {
          if (browser.currentURI.spec == "about:blank") {
            // about:blank is not particularly interesting. Don't
            // add it to the list.
            continue;
          }
          let actor = this._actorByBrowser.get(browser);
          if (!actor) {
            actor = new BrowserTabActor(this._connection,
                                        browser, null);
            this._actorByBrowser.set(browser, actor);
          }

          // Select the first visible browser in the top xul
          // window.
          let bo = browser.boxObject;
          actor.selected = foundSelected =
              win == topWindow &&
              !foundSelected &&
              bo.height > 0 &&
              bo.width > 0;
        }
      }
    }

    this._mustNotify = true;
    this._checkListening();

    return promise.resolve([...this._actorByBrowser.values()]);
  },

  onOpenWindow: DevToolsUtils.makeInfallible(function(aWindow) {
    let handleLoad = DevToolsUtils.makeInfallible(() => {
      if (this._checkedWindows.has(appShellDOMWindowType(aWindow))) {
        // This is one of our windows, we need to check for browser
        // elements. Notify is enough, iterate will do the actual actor
        // creation.
        this._notifyListChanged();
      }
    });

    // You can hardly do anything at all with a XUL window at this point; it
    // doesn't even have its document yet. Wait until its document has
    // loaded, and then see what we've got. This also avoids
    // nsIWindowMediator enumeration from within listeners (bug 873589).
    aWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                     .getInterface(Ci.nsIDOMWindow);
    aWindow.addEventListener("load", handleLoad, {capture: false, once: true});
  }, "IRCTabList.prototype.onOpenWindow"),

  onCloseWindow: DevToolsUtils.makeInfallible(function(aWindow) {
    aWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                     .getInterface(Ci.nsIDOMWindow);

    // Only handle our window types
    if (this._checkedWindows.has(appShellDOMWindowType(aWindow))) {
      return;
    }

    // nsIWindowMediator deadlocks if you call its GetEnumerator method from
    // a nsIWindowMediatorListener's onCloseWindow hook (bug 873589), so
    // handle the close in a different tick.
    Services.tm.currentThread.dispatch(DevToolsUtils.makeInfallible(() => {
      let shouldNotify = false;

      // Scan the whole map for browsers that were in this window.
      for (let [browser, actor] of this._actorByBrowser) {
        // The browser document of a closed window has no default view.
        if (!browser.ownerDocument.defaultView) {
          this._actorByBrowser.delete(browser);
          actor.exit();
          shouldNotify = true;
        }
      }

      if (shouldNotify) {
        this._notifyListChanged();
      }
      this._checkListening();
    }, "IRCTabList.prototype.onCloseWindow's delayed body"), 0);
  }, "IRCTabList.prototype.onCloseWindow"),

  onWindowTitleChange: function() {}
};

exports.register = function(handle) {
  handle.setRootActor(createRootActor);
};

exports.unregister = function(handle) {
  handle.setRootActor(null);
};
