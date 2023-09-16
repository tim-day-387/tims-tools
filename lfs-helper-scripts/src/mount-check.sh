#!/bin/bash
# Check mount point and mount variable
source "${S_LIB_PATH}"/script-helper.sh


check_lfs_var
check_cmd_for_failure
check_lfs_mount
check_cmd_for_failure


echo "Everything seems fine."
