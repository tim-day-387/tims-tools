#!/bin/bash
# Disable swapping for given file
source "${S_LIB_PATH}"/script-helper.sh


get_disk


sudo /sbin/swapoff -v "${disk}"
