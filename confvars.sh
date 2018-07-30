#! /bin/sh
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Application Basename and Vendor
# MOZ_APP_BASENAME and MOZ_APP_VENDOR must not have spaces.
MOZ_APP_NAME=chatzilla
MOZ_APP_BASENAME=$MOZ_APP_NAME
MOZ_APP_VERSION=`cat ${_topsrcdir}/$MOZ_BUILD_APP/config/version.txt`
MOZ_APP_VERSION_DISPLAY=$MOZ_APP_VERSION

# Application ID
# This is a unique identifier used for the application
# Most frequently the AppID is used for targetApplication
# in extensions and for chrome manifests
MOZ_APP_ID={59c81df5-4b7a-477b-912d-4e0fdf64e5f2}

# Use static Application INI File
MOZ_APP_STATIC_INI=1

# Application Branding
MOZ_BRANDING_DIRECTORY=$MOZ_BUILD_APP/branding

# Set the chrome packing format
# Possible values are omni, jar, and flat
# Currently, only omni and flat are supported
MOZ_CHROME_FILE_FORMAT=omni

# Set the default top-level extensions
MOZ_EXTENSIONS_DEFAULT=" gio"

# Fold Libs
if test "$OS_TARGET" = "WINNT" -o "$OS_TARGET" = "Darwin"; then
  MOZ_FOLD_LIBS=1
fi

MOZ_UPDATER=1

# Other features
MOZ_WEBRTC=
MOZ_WEBGL_CONFORMANT=1
MOZ_DEVTOOLS=1
MOZ_JSDOWNLOADS=1
MOZ_MAINTENANCE_SERVICE=
MOZ_SERVICES_HEALTHREPORT=
MOZ_SERVICES_SYNC=
MOZ_ADDON_SIGNIN=0
MOZ_REQUIRE_SIGNING=0
