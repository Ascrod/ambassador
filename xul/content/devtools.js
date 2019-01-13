/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

function initDevtools()
{
    XPCOMUtils.defineLazyModuleGetter(this, "ScratchpadManager","resource://devtools/client/scratchpad/scratchpad-manager.jsm");
    XPCOMUtils.defineLazyModuleGetter(this, "BrowserToolboxProcess", "resource://devtools/client/framework/ToolboxProcess.jsm");
    Object.defineProperty(this, "HUDService", {
        get: function HUDService_getter() {
            let devtools = Components.utils.import("resource://devtools/shared/Loader.jsm", {}).devtools;
            return devtools.require("devtools/client/webconsole/hudservice");
        },
        configurable: true,
        enumerable: true
    });
}
