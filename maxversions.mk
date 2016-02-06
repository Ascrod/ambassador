#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


SEAMONKEY_VERSION := $(shell cat $(topsrcdir)/../suite/config/version.txt)
FIREFOX_VERSION := $(shell cat $(topsrcdir)/browser/config/version.txt)

# For extensions we require a max version that is compatible across security releases.
# FIREFOX_MAXVERSION and SEAMONKEY_MAXVERSION is our method for doing that.
# Alpha versions 10.0a1 and 10.0a2 aren't affected
# For Seamonkey, 2.17 becomes 2.17.*, 2.17.1 becomes 2.17.*
# For Firefox, 10.0 becomes 10.*, 10.0.1 becomes 10.*
SEAMONKEY_MAXVERSION := $(SEAMONKEY_VERSION)
ifneq (a,$(findstring a,$(SEAMONKEY_VERSION)))
SEAMONKEY_MAXVERSION := $(shell echo $(SEAMONKEY_VERSION) | sed 's|\(^[0-9]*.[0-9]*\).*|\1|' ).*
endif

FIREFOX_MAXVERSION := $(FIREFOX_VERSION)
ifneq (a,$(findstring a,$(FIREFOX_VERSION)))
FIREFOX_MAXVERSION := $(shell echo $(FIREFOX_VERSION) | sed 's|\(^[0-9]*\)\.\([0-9]*\).*|\1|' ).*
endif

