/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Services", "resource://gre/modules/Services.jsm");

function DevToolsStartup() {}

DevToolsStartup.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsICommandLineHandler]),
  classID: Components.ID("{089694e9-106a-4704-abf7-62a88545e194}"),

  helpInfo: "",
  handle: function (cmdLine) {
    this.initialize();

    // We want to overwrite the -devtools flag and open the toolbox instead
    let devtoolsFlag = cmdLine.handleFlag("devtools", false);
    if (devtoolsFlag) {
        this.handleDevToolsFlag(cmdLine);
    }
  },

  handleDevToolsFlag: function (cmdLine) {
    Cu.import("resource://devtools/client/framework/ToolboxProcess.jsm");
    BrowserToolboxProcess.init();

    if (cmdLine.state == Ci.nsICommandLine.STATE_REMOTE_AUTO) {
      cmdLine.preventDefault = true;
    }
  },

  initialize: function() {
    var { devtools, require, DevToolsLoader } = Cu.import("resource://devtools/shared/Loader.jsm", {});
    var { DebuggerServer } = require("devtools/server/main");
    var { gDevTools } = require("devtools/client/framework/devtools");
    var HUDService = require("devtools/client/webconsole/hudservice");

    if (DebuggerServer.chromeWindowType != "irc:ambassador") {
      // Set up the server chrome window type, make sure it can't be set
      Object.defineProperty(DebuggerServer, "chromeWindowType", {
        get: () => "irc:ambassador",
        set: () => {},
        configurable: true
      });
    }

    if (gDevTools.chromeWindowType != "irc:ambassador") {
      // Set up the client chrome window type, make sure it can't be set
      Object.defineProperty(gDevTools, "chromeWindowType", {
        get: () => "irc:ambassador",
        set: () => {},
        configurable: true
      });
    }

    // Make the loader visible to the debugger by default and for the already
    // loaded instance. Ambassador now also provides the Browser Toolbox for
    // chrome debugging, which uses its own separate loader instance.
    DevToolsLoader.prototype.invisibleToDebugger = false;
    devtools.invisibleToDebugger = false;

    if (!DebuggerServer.initialized) {
      // Initialize and load the toolkit/browser actors
      DebuggerServer.init();
      DebuggerServer.addBrowserActors("irc:ambassador");
    }

    if (!DebuggerServer.createRootActor.isIrcRootActor) {
      // Register the Ambassador root actor
      DebuggerServer.registerModule("resource:///modules/irc-root-actor.js");
    }
  }
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([DevToolsStartup]);
