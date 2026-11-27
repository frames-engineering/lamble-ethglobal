#!/usr/bin/env bash
set -euo pipefail

: "${VERCEL_TOKEN:?Set the VERCEL_TOKEN production secret}"
: "${VERCEL_ORG_ID:?Set the VERCEL_ORG_ID production variable}"
: "${VERCEL_PROJECT_ID:?Set the VERCEL_PROJECT_ID production variable}"

domain=lamble.fun

vercel_api() {
  local endpoint=$1
  shift
  curl --fail --silent --show-error --max-time 30 \
    --header "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com${endpoint}?teamId=${VERCEL_ORG_ID}" "$@"
}

current_deployment() {
  vercel_api "/v4/aliases/$domain" | jq -er --arg project "$VERCEL_PROJECT_ID" \
    'select(.projectId == $project) | .deploymentId | select(type == "string" and startswith("dpl_"))'
}

main_head() {
  gh api "repos/$GITHUB_REPOSITORY/git/ref/heads/main" --jq .object.sha
}

promote() {
  vercel promote "$1" --scope inventionshub --token "$VERCEL_TOKEN" --timeout 2m
}

wait_for_alias() {
  for attempt in {1..12}; do
    if [[ $(current_deployment) == "$1" ]]; then
      return 0
    fi
    sleep 5
  done
  echo "Production alias did not switch to $1." >&2
  return 1
}

restore_previous() {
  echo "Restoring $previous."
  promote "$previous"
  wait_for_alias "$previous"
  node scripts/deploy/smoke.mjs "https://$domain"
  echo "Restored and verified $previous."
}

head=$(main_head)
if [[ $head != "$GITHUB_SHA" ]]; then
  echo "Skipping superseded main commit $GITHUB_SHA."
  exit 0
fi

project=$(vercel_api "/v9/projects/$VERCEL_PROJECT_ID")
if ! jq -e '.name == "lamble-ethglobal" and .autoAssignCustomDomains == false' <<< "$project" >/dev/null; then
  echo "Disable Auto-assign Custom Production Domains for the Lamble Vercel project before deploying." >&2
  exit 1
fi

previous=$(current_deployment)
vercel_api "/v13/deployments/$previous" |
  jq -e --arg project "$VERCEL_PROJECT_ID" \
    '.projectId == $project and .target == "production" and .readyState == "READY"' >/dev/null

request=$(jq -n --arg project "$VERCEL_PROJECT_ID" --arg sha "$GITHUB_SHA" \
  --argjson repo "$GITHUB_REPOSITORY_ID" '{name: "lamble-ethglobal", project: $project, target: "production",
    gitSource: {type: "github", repoId: $repo, ref: "main", sha: $sha}}')
candidate=$(vercel_api /v13/deployments --url-query forceNew=1 \
  --header 'Content-Type: application/json' --data "$request" |
  jq -er '.id | select(type == "string" and startswith("dpl_"))')
echo "Waiting for staged Vercel deployment $candidate."

for attempt in {1..60}; do
  state=$(vercel_api "/v13/deployments/$candidate" --url-query withGitRepoInfo=true |
    jq -er --arg project "$VERCEL_PROJECT_ID" --arg sha "$GITHUB_SHA" \
      'select(.projectId == $project and .target == "production" and .gitSource.sha == $sha) | .readyState')
  case "$state" in
    READY) break ;;
    ERROR|CANCELED) echo "Build of $candidate ended in $state." >&2; exit 1 ;;
  esac
  sleep 15
done
if [[ $state != READY ]]; then
  echo "Timed out waiting for $candidate." >&2
  exit 1
fi

active=$(current_deployment)
if [[ $active == "$candidate" ]]; then
  echo "The staged deployment unexpectedly serves production. Check Vercel domain auto-assignment." >&2
  restore_previous
  exit 1
fi
if [[ $active != "$previous" ]]; then
  echo "Production changed while $candidate was staged. Leaving $active live." >&2
  exit 1
fi

head=$(main_head)
if [[ $head != "$GITHUB_SHA" ]]; then
  echo "Leaving superseded deployment $candidate staged."
  exit 0
fi

if promote "$candidate" && wait_for_alias "$candidate" &&
  node scripts/deploy/smoke.mjs "https://$domain" && [[ $(current_deployment) == "$candidate" ]]; then
  exit 0
fi

active=$(current_deployment)
if [[ $active == "$candidate" ]]; then
  echo "Production verification failed." >&2
  restore_previous
else
  echo "Production verification failed. The live alias points to $active. Check Vercel for a pending promotion." >&2
fi
exit 1
