#!/bin/bash
# Simple script to list version numbers of critical development tools
source "${S_LIB_PATH}"/script-helper.sh


column_print() (
    printf "%-25s %-25s\n" "$1" "$2"
)


run_check() (
    column_print "P: $1" "O: $2"
)


# Check system type
which sw_vers > /dev/null
is_macos=$?

test -f /proc/version
is_gnulinux=$?


# General info
title "GENERAL"
if [ "${is_macos}" -eq 0 ]; then
    sw_vers
else
    cat /proc/version
fi
echo


# Symlink info
title "SYMLINKS"
MYSH=$(sh -c "echo $SHELL")
echo "/bin/sh -> ${MYSH}"
echo "${MYSH}" | grep -q bash || echo "ERROR: /bin/sh does not point to bash"
unset MYSH

if [ -h /usr/bin/yacc ]; then
  echo "/usr/bin/yacc -> $(readlink -f /usr/bin/yacc)";
elif [ -x /usr/bin/yacc ]; then
  echo yacc is "$(/usr/bin/yacc --version | head -n1)"
else
  echo "yacc not found"
fi

if [ -h /usr/bin/awk ]; then
  echo "/usr/bin/awk -> $(readlink -f /usr/bin/awk)";
elif [ -x /usr/bin/awk ]; then
  echo awk is "$(/usr/bin/awk --version | head -n1)"
else
  echo "awk not found"
fi

echo


# Compiler functionality info
title "COMPILER CHECK"

echo 'int main(){}' > dummy.c && g++ -x c++ -o dummy dummy.c

if [ -x dummy ]
  then echo "g++ compilation OK";
  else echo "g++ compilation failed";
fi

rm -f dummy.c dummy
echo


# Software check info
title "SOFTWARE CHECK"
column_print "PROGRAM" "OUTPUT"
run_check "bash" "$(bash --version | head -n1 | cut -d" " -f2-4)"
run_check "binutils" "$(ld --version | head -n1 | cut -d" " -f3-)"
run_check "coreutils" "$(chown --version | head -n1 | cut -d")" -f2)"
run_check "bison" "$(bison --version | head -n1)"
run_check "bzip2" "$(bzip2 --version 2>&1 < /dev/null | head -n1 | cut -d" " -f1,6-)"
run_check "diff" "$(diff --version | head -n1)"
run_check "find" "$(find . --version | head -n1)"
run_check "gawk" "$(gawk --version | head -n1)"
run_check "glibc" "$(ldd --version | head -n1 | cut -d" " -f2-)"
run_check "grep" "$(grep --version | head -n1)"
run_check "gzip" "$(gzip --version | head -n1)"
run_check "m4" "$(m4 --version | head -n1)"
run_check "make" "$(make --version | head -n1)"
run_check "patch" "$(patch --version | head -n1)"
run_check "python3" "$(python3 --version)"
run_check "sed" "$(sed --version | head -n1)"
run_check "tar" "$(tar --version | head -n1)"
run_check "makeinfo" "$(makeinfo --version | head -n1)"
run_check "xz" "$(xz --version | head -n1)"
run_check "gcc" "$(gcc --version | head -n1)"
run_check "g++" "$(g++ --version | head -n1)"
run_check "perl" "$(perl -V:version)"
