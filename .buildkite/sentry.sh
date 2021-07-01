STAGE=$BUILDKITE_BRANCH
if [ "$STAGE" = 'master' ]; then
  STAGE='production'
fi

if [ "$STAGE" != 'production' ]; then
  echo 'Stage '$STAGE' unknown, skipping Sentry'
  exit 0
fi

curl -sSf -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer '"$SENTRY_API_TOKEN2" \
  --request POST \
  --data '{"version": "'"$BUILDKITE_COMMIT"'"}' \
  https://sentry.io/api/0/projects/gies-den-broeder/bussenbot/releases/
