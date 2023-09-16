#!/bin/bash
# Enable swapping for given file
source "${S_LIB_PATH}"/script-helper.sh


get_disk


sudo /sbin/swapon -v "${disk}"
