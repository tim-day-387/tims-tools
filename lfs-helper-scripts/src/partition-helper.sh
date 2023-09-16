#!/bin/bash
# Wrapper to fdisk
source "${S_LIB_PATH}"/script-helper.sh


get_disk


title "PARTITION MAKER"
sudo fdisk "${disk}"
