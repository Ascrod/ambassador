# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

installer:
	@$(MAKE) -C application/ambassador/installer installer

package:
	@$(MAKE) -C application/ambassador/installer

package-compare:
	@$(MAKE) -C application/ambassador/installer package-compare

stage-package:
	@$(MAKE) -C application/ambassador/installer stage-package

sdk:
	@$(MAKE) -C application/ambassador/installer make-sdk

install::
	@$(MAKE) -C application/ambassador/installer install

clean::
	@$(MAKE) -C application/ambassador/installer clean

distclean::
	@$(MAKE) -C application/ambassador/installer distclean

source-package::
	@$(MAKE) -C application/ambassador/installer source-package

upload::
	@$(MAKE) -C application/ambassador/installer upload

source-upload::
	@$(MAKE) -C application/ambassador/installer source-upload

hg-bundle::
	@$(MAKE) -C application/ambassador/installer hg-bundle

l10n-check::
	@$(MAKE) -C application/ambassador/locales l10n-check

