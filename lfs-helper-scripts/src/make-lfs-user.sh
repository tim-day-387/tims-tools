#!/bin/bash
# Create build user
source "${S_LIB_PATH}"/script-helper.sh


title "CREATE LFS USER"
check_lfs_user_dne
check_cmd_for_failure


sudo groupadd lfs
sudo useradd -s /bin/bash -g lfs -m -k /dev/null lfs
sudo passwd lfs


title "CREATE BASH FILES"
sudo -u lfs "${S_PATH}"/create-bash-files.sh
