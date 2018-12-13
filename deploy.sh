#!/bin/bash

if [ -z ${1:-} ]; then
  echo "Usage: $0 [VERSION_TAG]"
  echo "Example: $0 v1.2"
  exit 1
fi

set -e # Exits if a command errors
set -u # Errors if variable is unbound
set -x # Print executed commands

VERSION=$1
COMMIT=$(git rev-parse HEAD)
BRANCH=gh-pages
REPO_DIR=$(git rev-parse --show-toplevel)
TMP_DIR="/tmp/$(basename $REPO_DIR)__${BRANCH}__$$"

yarn build

git clone -b "$BRANCH" "$REPO_DIR" "$TMP_DIR"
cp -R -v "$REPO_DIR"/build/* "$TMP_DIR"
git -C "$TMP_DIR" add .
git -C "$TMP_DIR" commit -m "$VERSION [$COMMIT]"
git -C "$TMP_DIR" push origin "$BRANCH" # Local push to $REPO_DIR

git -C "$REPO_DIR" tag "$VERSION"
git -C "$REPO_DIR" push origin "$BRANCH" # Pushes gh-pages
git -C "$REPO_DIR" push origin "$VERSION" # Pushes tag
