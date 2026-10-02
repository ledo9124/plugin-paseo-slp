#!/usr/bin/env bash
# Waits on test agents (cwd containing $SLP_TEST_DIR, default "slp-test").
# Exits 2 when one has a pending question or permission, 0 when all are idle
# on 3 checks in a row (15 s apart), 1 on timeout (40 min).
dir="${SLP_TEST_DIR:-slp-test}"
calm=0
for i in $(seq 1 160); do
  out=$( { paseo ls --json 2>/dev/null; echo '@@@'; paseo permit ls --json 2>/dev/null; } | DIR="$dir" node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  const [a,p]=s.split("@@@");const ag=JSON.parse(a);
  const list=(Array.isArray(ag)?ag:ag.agents||[]).filter(x=>String(x.cwd||"").toLowerCase().includes(process.env.DIR.toLowerCase()));
  const ids=[...new Set(list.map(x=>x.id))];let perms=[];
  try{const pj=JSON.parse(p||"[]");perms=Array.isArray(pj)?pj:pj.permissions||pj.items||[];}catch{}
  const mine=perms.filter(x=>ids.some(id=>JSON.stringify(x).includes(id)));
  const busy=list.filter(x=>!["idle","closed"].includes(x.status)).length;
  console.log((mine.length?"Q":"-")+" "+busy);});')
  set -- $out
  if [ "$1" = "Q" ]; then echo "question pending after $((i*15))s"; exit 2; fi
  if [ "$2" = "0" ]; then calm=$((calm+1)); else calm=0; fi
  [ $calm -ge 3 ] && { echo "settled after $((i*15))s"; exit 0; }
  sleep 15
done
echo timeout; exit 1
