#!/bin/bash
BASE="http://localhost:3001"
PASSED=0 FAILED=0 TOKEN=""
GREEN='\033[0;32m' RED='\033[0;31m' CYAN='\033[0;36m' NC='\033[0m' BOLD='\033[1m'

log() { echo -e "\n${CYAN}=== $1 ===${NC}"; }

test_api() {
  local m=$1 e=$2 d=$3 x=$4 a=$5 desc=$6
  local h="-H 'Content-Type: application/json'"
  [ "$a" = "yes" ] && h="$h -H 'Authorization: Bearer $TOKEN'"
  local cmd="curl -s -w '\n%{http_code}' $h"
  [ "$m" != "GET" ] && cmd="$cmd -X $m"
  [ -n "$d" ] && cmd="$cmd -d '$d'"
  cmd="$cmd '$BASE$e'"
  local r=$(eval $cmd 2>/dev/null)
  local c=$(echo "$r" | tail -1)
  local ok=0
  for ec in $(echo $x | tr ',' ' '); do [ "$c" = "$ec" ] && ok=1; done
  if [ $ok -eq 1 ]; then
    echo -e "  ${GREEN}✓${NC} $desc"
    PASSED=$((PASSED+1))
  else
    echo -e "  ${RED}✗${NC} $desc (got $c)"
    FAILED=$((FAILED+1))
  fi
}

echo -e "\n${BOLD}🧪 MUSCLEMAP TEST SUITE v3${NC}"

log "HEALTH"
test_api GET /api/health "" 200 no "Health check"

log "AUTH"
U="test_$$_$RANDOM"
E="$U@test.local"
P="Test123!"
r=$(curl -s -X POST -H 'Content-Type: application/json' -d "{\"username\":\"$U\",\"email\":\"$E\",\"password\":\"$P\"}" "$BASE/api/auth/register")
if echo "$r" | grep -q token; then
  TOKEN=$(echo "$r" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  echo -e "  ${GREEN}✓${NC} Register: $U"
  PASSED=$((PASSED+1))
else
  echo -e "  ${RED}✗${NC} Register failed"
  exit 1
fi
test_api POST /api/auth/login "{\"email\":\"$E\",\"password\":\"$P\"}" 200 no "Login"
test_api GET /api/profile "" 401 no "No token rejected"

log "PROFILE"
test_api GET /api/profile "" 200 yes "Get profile"
test_api PUT /api/profile '{"age":25}' 200 yes "Update profile"

log "ARCHETYPES"
test_api GET /api/archetypes "" 200 no "List archetypes"
test_api POST /api/archetypes/select '{"archetypeId":"bodybuilder"}' 200 yes "Select archetype"

log "JOURNEY"
test_api GET /api/journey/paths "" 200 yes "Get paths"
test_api POST /api/journey/switch '{"archetype":"gymnast"}' 200 yes "Switch archetype"

log "EXERCISES"
test_api GET /api/exercises "" 200 no "List exercises"

log "WORKOUTS"
test_api GET /api/workouts "" 200 yes "Get workouts"
test_api POST /api/workout/complete '{"duration_minutes":45}' 200 yes "Complete workout"

log "CREDITS"
test_api GET /api/credits/pricing "" 200 no "Get pricing"
test_api GET /api/credits/balance "" 200 yes "Get balance"

log "PROGRESSION"
test_api GET /api/progression/mastery-levels "" 200 no "Mastery levels"
test_api GET /api/progression/achievements "" 200 yes "Achievements"
test_api GET /api/progression/leaderboard "" 200 no "Leaderboard"
test_api GET /api/progress/stats "" 200 yes "Progress stats"

log "COMPETITIONS"
test_api GET /api/competitions "" 200 no "List competitions"

# Create a competition to get an ID (avoid hardcoded /1)
CNAME="Test_${RANDOM}_${RANDOM}"
create_comp () {
  local payload="$1"
  curl -s -w '\n%{http_code}' \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $TOKEN" \
    -X POST -d "$payload" \
    "$BASE/api/competitions" 2>/dev/null
}

resp=$(create_comp "{\"name\":\"$CNAME\",\"type\":\"weekly\",\"goal_tu\":50}")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')

if [ "$code" != "200" ]; then
  resp=$(create_comp "{\"name\":\"$CNAME\",\"type\":\"weekly\",\"goalTU\":50}")
  code=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | sed '$d')
fi

COMP_ID=""
if [ "$code" = "200" ]; then
  COMP_ID=$(python3 - <<PY2
import json,sys
try:
  b=json.loads(sys.stdin.read() or "{}")
except Exception:
  b={}
cid = (b.get("data") or {}).get("id") or b.get("id") or ((b.get("data") or {}).get("competition") or {}).get("id")
print(cid or "")
PY2
<<<"$body")
  if [ -n "$COMP_ID" ]; then
    echo -e "  ${GREEN}✓${NC} Create competition"
    PASSED=$((PASSED+1))
  else
    echo -e "  ${RED}✗${NC} Create competition (no id in response)"
    FAILED=$((FAILED+1))
  fi
else
  echo -e "  ${RED}✗${NC} Create competition (got $code)"
  FAILED=$((FAILED+1))
fi

if [ -n "$COMP_ID" ]; then
  test_api GET "/api/competitions/$COMP_ID" "" 200 no "Competition details"
  test_api POST "/api/competitions/$COMP_ID/join" "" "200,400" yes "Join competition"
else
  echo -e "  ${RED}✗${NC} Competition details (skipped, no competition id)"
  FAILED=$((FAILED+1))
  echo -e "  ${RED}✗${NC} Join competition (skipped, no competition id)"
  FAILED=$((FAILED+1))
fi

log "HIGH FIVES"
test_api GET /api/highfives/stats "" 200 yes "HF stats"
test_api GET /api/highfives/users "" 200 yes "HF users"
test_api POST /api/highfives/send '{}' 400 yes "Reject empty HF"

log "SETTINGS"
test_api GET /api/settings "" 200 yes "Get settings"
test_api GET /api/settings/themes "" 200 no "Get themes"
test_api PATCH /api/settings '{"theme":"dark"}' 200 yes "Set theme"

log "LOCATIONS"
test_api GET "/api/locations/nearby?lat=40.7&lng=-74.0" "" 200 no "Nearby"

log "COMMUNITY"
test_api GET /api/community/feed "" 200 no "Feed"
test_api GET /api/community/percentile "" 200 yes "Percentile"

log "I18N"
test_api GET /api/i18n/languages "" 200 no "Languages"

log "ALTERNATIVES"
test_api GET /api/alternatives/seated "" 200 no "Seated"
test_api GET /api/alternatives/low-impact "" 200 no "Low-impact"

log "CLEANUP"
sqlite3 musclemap.db "DELETE FROM competition_entries WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'test_%');" 2>/dev/null
sqlite3 musclemap.db "DELETE FROM users WHERE username LIKE 'test_%';" 2>/dev/null
sqlite3 musclemap.db "DELETE FROM competitions WHERE name='Test';
sqlite3 musclemap.db "DELETE FROM competitions WHERE name LIKE 'Test_%';" 2>/dev/null" 2>/dev/null
echo -e "  ${GREEN}✓${NC} Cleaned up"

echo -e "\n${BOLD}==============================${NC}"
T=$((PASSED+FAILED))
echo -e "📊 RESULTS: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC} / $T total"
echo -e "${BOLD}==============================${NC}"
[ $FAILED -eq 0 ] && echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}" || echo -e "${RED}⚠️ SOME TESTS FAILED${NC}"
exit $FAILED

log "MESSAGING"
test_api GET /api/messaging/conversations "" 200 yes "List conversations"
test_api POST /api/messaging/blocks '{"user_id":1}' 200 yes "Block user"
test_api GET /api/messaging/blocks "" 200 yes "List blocks"

log "ECONOMY"
test_api GET /api/economy/pricing "" 200 no "Get pricing"
test_api GET /api/economy/wallet "" 200 yes "Get wallet"
test_api GET /api/economy/transactions "" 200 yes "Get transactions"

log "SKINS"
test_api GET /api/skins "" 200 no "List skins"
test_api GET /api/skins/categories "" 200 no "Skin categories"
test_api GET /api/skins/owned "" 200 yes "Owned skins"
test_api GET /api/skins/equipped "" 200 yes "Equipped skins"
test_api GET /api/skins/unlockable "" 200 yes "Unlockable skins"

log "BULLETIN"
test_api GET /api/bulletin/equipment-types "" 200 no "Equipment types"
test_api GET /api/bulletin/1/posts "" 200 no "Location posts"
test_api GET /api/bulletin/1/equipment "" 200 no "Location equipment"
