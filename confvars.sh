#! /bin/sh
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Application Basename and Vendor
# MOZ_APP_BASENAME and MOZ_APP_VENDOR must not have spaces.
MOZ_APP_NAME=ambassador
MOZ_APP_BASENAME=$MOZ_APP_NAME
MOZ_APP_VERSION=`cat ${_topsrcdir}/$MOZ_BUILD_APP/config/version.txt`
MOZ_APP_VERSION_DISPLAY=$MOZ_APP_VERSION

# Application ID
# This is a unique identifier used for the application
# Most frequently the AppID is used for targetApplication
# in extensions and for chrome manifests
MOZ_APP_ID={4523665a-317f-4a66-9376-3763d1ad1978}

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

# Include bundled fonts
if test "$OS_ARCH" = "WINNT" -o \
        "$OS_ARCH" = "Linux"; then
  MOZ_BUNDLED_FONTS=1
fi

MOZ_UPDATER=1

# Enable any conditional code in the platform for Ambassador
ASCROD_IRC=1

# Other features
MOZ_DEVTOOLS=1
MOZ_JSDOWNLOADS=1
MOZ_ADDON_SIGNING=0
MOZ_REQUIRE_SIGNING=0
MOZ_DISABLE_PARENTAL_CONTROLS=1
MOZ_SERVICES_HEALTHREPORT=
MOZ_SERVICES_SYNC=
MOZ_MAINTENANCE_SERVICE=
MOZ_WEBRTC=
MOZ_EME=
ACCESSIBILITY=
