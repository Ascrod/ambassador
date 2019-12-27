# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

installer:
	@$(MAKE) -C ambassador/installer installer

package:
	@$(MAKE) -C ambassador/installer

package-compare:
	@$(MAKE) -C ambassador/installer package-compare

stage-package:
	@$(MAKE) -C ambassador/installer stage-package

sdk:
	@$(MAKE) -C ambassador/installer make-sdk

install::
	@$(MAKE) -C ambassador/installer install

clean::
	@$(MAKE) -C ambassador/installer clean

distclean::
	@$(MAKE) -C ambassador/installer distclean

source-package::
	@$(MAKE) -C ambassador/installer source-package

upload::
	@$(MAKE) -C ambassador/installer upload

source-upload::
	@$(MAKE) -C ambassador/installer source-upload

hg-bundle::
	@$(MAKE) -C ambassador/installer hg-bundle

l10n-check::
	@$(MAKE) -C ambassador/locales l10n-check

