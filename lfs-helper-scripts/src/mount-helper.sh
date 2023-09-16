#!/bin/bash
# Set mount point and mount variable
source "${S_LIB_PATH}"/script-helper.sh


source_me
check_lfs_var


get_disk


title "MOUNT"
echo "Mount point:" "${LFS}"
mkdir -pv "${LFS}"
sudo mount -v -t ext4 "${disk}" "${LFS}"
