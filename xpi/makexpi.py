"""
Rewrite of ChatZilla's makexpi.sh into python

This code isnt especially pythonic, as I have
tried to follow the code and control flow from
the original shell script
"""

import os
import os.path
import sys
import shutil
import re
import zipfile
from os.path import join as joinpath

# Set up settings and paths for finding files.
pwd = os.path.dirname(__file__)
if pwd == '':
    pwd = os.getcwd()
else:
    os.chdir(pwd)

def getenv(var, default, dir=False):
    """
    Grab an environment variable, or a default
    """
    try:
        value = os.environ[var]
    except KeyError:
        value = default
    if dir:
        if not os.path.isabs(value):
            value = os.path.normpath(joinpath(pwd, value))
        else:
            value = os.path.normpath(value)
    
    return value


debug     = int(getenv('DEBUG',     0))
fedir     = getenv('FEDIR',     joinpath(pwd, '..'), dir=True)
configdir = getenv('CONFIGDIR', joinpath(pwd, 'config'), dir=True)
xpifiles  = getenv('XPIFILES',  joinpath(pwd, 'resources'), dir=True)
xpiroot   = getenv('XPIROOT',   joinpath(pwd, 'xpi-tree'), dir=True)
jarroot   = getenv('JARROOT',   joinpath(pwd, 'jar-tree'), dir=True)
localedir = getenv('LOCALEDIR', joinpath(fedir, 'locales'), dir=True)

# Display all the settings and paths if we're in debug mode.
if debug > 0:
	print "$DEBUG     = %s" % debug
	print "$FEDIR     = %s" % fedir
	print "$CONFIGDIR = %s" % configdir
	print "$XPIFILES  = %s" % xpifiles
	print "$XPIROOT   = %s" % xpiroot
	print "$JARROOT   = %s" % jarroot
	print "$LOCALEDIR = %s" % localedir

# append the config dir to path before importing the utils
sys.path.append(configdir)

from Preprocessor import preprocess
from JarMaker import JarMaker

## define functions to replace the OS calls from makexpi.sh

def echo(str):
    """
    print a string without a newline or trailing space
    
    generally used in place of "echo -n" from the original code
    """
    sys.stdout.write(str)

def rm(path):
    """
    remove file or directory, recurses on directory
    
    This will fail silently if the file is not found
    but any other exceptions will be raised
    """
    try:
        if os.path.isdir(path):
            shutil.rmtree(path)
        else:
            os.remove(path)
    except WindowsError, ex:
        if ex.errno != 2:
            raise
def mkdir(dir):
    """
    acts like mkdir -p
    """
    try:
        os.makedirs(dir)
    except os.error:
        pass # dont error out if there dir already exists

def copy(src, dst):
    """
    copy file
    """
    shutil.copy(src, dst)

def move(src, dst):
    """
    move file
    """
    shutil.move(src, dst)
    
def sed((pattern, replacement), input, output):
    """
    similar functionality to unix command 'sed'
    """
    regex = re.compile(pattern)
    for line in input:
        line = regex.sub(replacement, line)
        output.write(line)
        
def zip(filename, source_dir, include=None, exclude=None):
    """
    create a zip file of a directory's contents
    
    include and exclude are filtering functions, they will
    be passed the basename of each file in the directory
    and should either return true or false if the file
    should be included or excluded respectively
    """
    z = zipfile.ZipFile(filename, 'w', zipfile.ZIP_DEFLATED)
    for dirpath, dirnames, filenames in os.walk(source_dir):
        for filename in filenames:
            if include is not None and not include(filename) \
            or exclude is not None and exclude(filename):
                continue
            full_filename = joinpath(dirpath, filename)
            offset = len(os.path.commonprefix([source_dir,full_filename])) + 1
            archive_filename = full_filename[offset:]
            z.write(full_filename, archive_filename)
    z.close()

## Begin real program ##

try:
    arg1 = sys.argv[1]
except IndexError:
    arg1 = ""

if arg1 == "clean":
    echo("Cleaning up files")
    echo(".")
    rm(xpiroot)
    echo(".")
    rm(jarroot)
    print(". done.")
    
    sys.exit()

# Check directory setup.
if not os.path.isdir(fedir):
    print "ERROR: Base ChatZilla directory (FEDIR) not found."
    sys.exit(1)
if not os.path.isdir(configdir):
    print "ERROR: mozilla/config directory (CONFIGDIR) not found."
    sys.exit(1)

# Extract version number.
version = None
version_pattern = re.compile(r'const __cz_version\s+=\s*\"([^\"]+)\"')
for line in open(joinpath(fedir, 'xul', 'content', 'static.js'), 'r'):
    match = version_pattern.match(line)
    if match is None:
        continue
    version = match.group(1)
    break
if version is None:
    print("ERROR: Unable to get version number.")
    sys.exit(1)

print "Beginning build of ChatZilla %s..." % version


# Set up XPI name.
xpiname = "chatzilla-%s.xpi" % version
# Check for an existing XPI file and print a warning.
if os.path.exists(joinpath(pwd,xpiname)):
    print "  WARNING: output XPI will be overwritten."

# Check for required directory layouts.
echo("  Checking XPI structure")
echo(".")
if not os.path.isdir(xpiroot):
    mkdir(xpiroot)
echo(".")
if not os.path.isdir(joinpath(xpiroot, 'chrome')):
    mkdir(joinpath(xpiroot, 'chrome'))
echo(".")
if not os.path.isdir(joinpath(xpiroot, 'chrome', 'icons')):
    mkdir(joinpath(xpiroot, 'chrome', 'icons'))
echo(".")
if not os.path.isdir(joinpath(xpiroot, 'chrome', 'icons', 'default')):
    mkdir(joinpath(xpiroot, 'chrome', 'icons', 'default'))
echo(".")
if not os.path.isdir(joinpath(xpiroot, 'components')):
    mkdir(joinpath(xpiroot, 'components'))
print ".           done"

echo("  Checking JAR structure")
echo(".")
if not os.path.isdir(jarroot):
    mkdir(jarroot)
print ".               done"

# Make Firefox updates.
echo("  Updating Firefox Extension files")
echo(".")
install_rdf_outfile = open(joinpath(xpiroot, 'install.rdf'), 'w')
preprocess(
    includes = [joinpath(xpifiles, 'install.rdf')],
    defines  = {'CHATZILLA_VERSION': version},
    output   = install_rdf_outfile,
    line_endings = 'lf'
)
install_rdf_outfile.close()
echo(".")
copy(
    joinpath(xpifiles, 'chatzilla-window.ico'),
    joinpath(xpiroot,'chrome','icons','default','chatzilla-window.ico')
)
echo(".")
copy(
    joinpath(xpifiles, 'chatzilla-window.xpm'),
    joinpath(xpiroot,'chrome','icons','default','chatzilla-window.xpm')
)
echo(".")
copy(
    joinpath(xpifiles, 'chatzilla-window16.xpm'),
    joinpath(xpiroot,'chrome','icons','default','chatzilla-window16.xpm')
)
print ".  done"

# Make Mozilla Suite updates.
echo("  Updating Mozilla Extension files")
echo(".")
install_js_infile = open(joinpath(xpifiles, 'install.js'), 'r')
install_js_outfile = open(joinpath(xpiroot, 'install.js'), 'w')
sed(
    ('@REVISION@', version),
    input = install_js_infile,
    output = install_js_outfile,
)
install_js_infile.close()
install_js_outfile.close()
echo(".")
move(
    joinpath(fedir,'xul','content','contents.rdf'),
    joinpath(fedir,'xul','content','contents.rdf.in')
)
contents_rdf_infile = open(joinpath(fedir,'xul','content','contents.rdf.in'), 'rb')
contents_rdf_outfile = open(joinpath(fedir,'xul','content','contents.rdf'), 'wb')
sed(
    (r'chrome:displayName="[^\"]+"', r'chrome:displayName="ChatZilla %s"' % version),
    input = contents_rdf_infile,
    output = contents_rdf_outfile
)
contents_rdf_infile.close()
contents_rdf_outfile.close()
rm(joinpath(fedir,'xul','content','contents.rdf.in'))
print ".    done"

# Create JAR.
echo("  Constructing JAR package")
echo(".")
jm = JarMaker()
jm.outputFormat = 'jar'
jm.useChromeManifest = True
jm.useJarfileManifest = False
jm.makeJar(
    infile = open(joinpath(fedir, 'jar.mn'),'r'),
    jardir = jarroot,
    sourcedirs = [fedir]
)
echo(".")
jm.makeJar(
    infile = open(joinpath(fedir, 'sm', 'jar.mn'),'r'),
    jardir = jarroot,
    sourcedirs = [joinpath(fedir, 'sm')]
)
echo(".")
jm.makeJar(
    infile = open(joinpath(fedir, 'ff', 'jar.mn'),'r'),
    jardir = jarroot,
    sourcedirs = [joinpath(fedir, 'ff')]
)
echo(".")
localejar_outfile = open(joinpath(localedir, 'jar.mn.pp'), 'w')
preprocess(
    includes = [joinpath(localedir, 'jar.mn')],
    defines  = {'AB_CD': 'en-US'},
    output   = localejar_outfile,
    line_endings = 'lf'
)
localejar_outfile.close()
# define a preprocessor var for the next call to makeJar
jm.pp.context['AB_CD'] = 'en-US'
localejar_infile = open(joinpath(localedir,'jar.mn.pp'), 'r')
jm.makeJar(
    infile = localejar_infile,
    jardir = jarroot,
    sourcedirs = [localedir],
    localedirs = [joinpath(localedir, 'en-US')]
)
localejar_infile.close()
rm(joinpath(localedir, 'jar.mn.pp'))
echo(".")
print ".         done"

# Make XPI.
echo("  Constructing XPI package")
echo(".")
copy(
    joinpath(jarroot, 'chatzilla.jar'),
    joinpath(xpiroot, 'chrome')
)
echo(".")
copy(
    joinpath(fedir, 'js', 'lib', 'chatzilla-service.js'),
    joinpath(xpiroot, 'components')
)
echo(".")
move(
    joinpath(jarroot, '..', 'chrome.manifest'),
    joinpath(xpiroot, 'chrome.manifest')
)
echo(".")
os.chmod(
    joinpath(xpiroot, 'chrome', 'chatzilla.jar'),
    0664
)
echo(".")
os.chmod(
    joinpath(xpiroot, 'components', 'chatzilla-service.js'),
    0664
)
echo(".")
zip(
    filename = os.path.normpath(joinpath(pwd, xpiname)),
    source_dir = xpiroot,
    include = lambda fn: True,
    exclude = lambda fn: fn.startswith('log')
)
print ".        done"

print "Build of ChatZilla %s...         ALL DONE" % version
