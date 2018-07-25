#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


PALEMOON_VERSION := $(shell cat $(topsrcdir)/application/palemoon/config/version.txt)
BASILISK_VERSION := $(shell cat $(topsrcdir)/application/basilisk/config/version.txt)

# For extensions we require a max version that is compatible across security releases.
# BASILISK_MAXVERSION and PALEMOON_MAXVERSION is our method for doing that.
# Alpha versions 10.0a1 and 10.0a2 aren't affected
PALEMOON_MAXVERSION := $(PALEMOON_VERSION)
ifneq (a,$(findstring a,$(PALEMOON_VERSION)))
PALEMOON_MAXVERSION := $(shell echo $(PALEMOON_VERSION) | sed 's|\(^[0-9]*.[0-9]*\).*|\1|' ).*
endif

BASILISK_MAXVERSION := $(BASILISK_VERSION)
ifneq (a,$(findstring a,$(BASILISK_VERSION)))
BASILISK_MAXVERSION := $(shell echo $(BASILISK_VERSION) | sed 's|\(^[0-9]*\)\.\([0-9]*\).*|\1|' ).*
endif

