# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

installer:
	@$(MAKE) -C application/chatzilla/installer installer

package:
	@$(MAKE) -C application/chatzilla/installer

package-compare:
	@$(MAKE) -C application/chatzilla/installer package-compare

stage-package:
	@$(MAKE) -C application/chatzilla/installer stage-package

sdk:
	@$(MAKE) -C application/chatzilla/installer make-sdk

install::
	@$(MAKE) -C application/chatzilla/installer install

clean::
	@$(MAKE) -C application/chatzilla/installer clean

distclean::
	@$(MAKE) -C application/chatzilla/installer distclean

source-package::
	@$(MAKE) -C application/chatzilla/installer source-package

upload::
	@$(MAKE) -C application/chatzilla/installer upload

source-upload::
	@$(MAKE) -C application/chatzilla/installer source-upload

hg-bundle::
	@$(MAKE) -C application/chatzilla/installer hg-bundle

l10n-check::
	@$(MAKE) -C application/chatzilla/locales l10n-check

