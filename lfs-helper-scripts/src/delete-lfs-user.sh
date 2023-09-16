#!/bin/bash
# Delete build user
source "${S_LIB_PATH}"/script-helper.sh


title "DELETE LFS USER"
check_lfs_user
check_cmd_for_failure


sudo userdel -r lfs
