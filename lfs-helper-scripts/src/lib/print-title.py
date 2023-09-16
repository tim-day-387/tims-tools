#!/usr/bin/python3
# Pretty print titles in scripts


import sys

BUFFER_LEN = 35
title_len = BUFFER_LEN

if len(sys.argv) > 1:
    title_len = title_len - len(sys.argv[1]) - 2

for i in range(BUFFER_LEN):
    print("*", end="")

if len(sys.argv) > 1:
    print(" " + sys.argv[1] + " ", end="")

for i in range(title_len):
    print("*", end="")

print("")
