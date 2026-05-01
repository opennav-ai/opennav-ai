#!/bin/sh
set -eu

script_dir=$(CDPATH= cd "$(dirname "$0")" && pwd)
repo_dir=$(CDPATH= cd "$script_dir/.." && pwd)
opennav_package_dir="$repo_dir/packages/opennav"
opennav_dist_dir="$opennav_package_dir/dist"

mkdir -p "$opennav_dist_dir"
cp "$repo_dir/LICENSE" "$opennav_dist_dir/LICENSE"
cp "$opennav_package_dir/README.md" "$opennav_dist_dir/README.md"
