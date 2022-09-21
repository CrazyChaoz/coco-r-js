#!/bin/bash

executions=10
declare -a runtime

for (( i = 0; i < $executions; i++ )); do
  start=`date +%s.%N`
  /home/kemp/Downloads/node-v18.2.0-linux-x64/bin/node /home/kemp/Downloads/node-v18.2.0-linux-x64/lib/node_modules/npm/bin/npm-cli.js run regenerate_coco --scripts-prepend-node-path=auto
  end=`date +%s.%N`
  runtime[$i]=$( echo "$end - $start" | bc -l )
done

min=${runtime[0]}
max=${runtime[0]}
avg=0

for (( i = 0; i < $executions; i++ )); do
    if (( $(echo "${runtime[$i]} < $min" | bc -l) )); then
        min=${runtime[$i]}
    fi

    if (( $(echo "${runtime[$i]} > $max" | bc -l) )); then
      max=${runtime[$i]}
    fi
    avg=$(echo "$avg+${runtime[$i]}" | bc -l)
done

avg=$(echo "$avg / $executions" | bc -l)

echo "min"
echo $min
echo "max"
echo $max
echo "avg"
echo $avg