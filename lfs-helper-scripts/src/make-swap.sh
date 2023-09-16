#!/bin/bash
# Create swap partition on given file
source "${S_LIB_PATH}"/script-helper.sh


get_disk


sudo mkswap "${disk}"
