$i = 0
$executions = 20
$sw = @()
for($i=0 ; $i -lt $executions; $i++) {
    $sw += [Diagnostics.Stopwatch]::StartNew()
    #insert command here
    $sw[$i].Stop()
}

$min = $sw[0].ElapsedMilliseconds
$max = $sw[0].ElapsedMilliseconds
$avg = 0

for($i=0 ; $i -lt $executions; $i++) {
    if($sw[$i].ElapsedMilliseconds -lt $min){
        $min = $sw[$i].ElapsedMilliseconds
    }

    if($sw[$i].ElapsedMilliseconds -gt $max){
        $max = $sw[$i].ElapsedMilliseconds
    }

    $avg += $sw[$i].ElapsedMilliseconds
}

$avg = $avg / $executions

""
""
"Min"
$min
"Max"
$max
"Average"
$avg