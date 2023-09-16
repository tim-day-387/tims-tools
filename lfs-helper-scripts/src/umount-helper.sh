#!/bin/bash
# Unset mount point and mount variable
source "${S_LIB_PATH}"/script-helper.sh


source_me
check_lfs_var
check_lfs_mount
check_cmd_for_failure


sudo umount "${LFS}"
unset LFS
