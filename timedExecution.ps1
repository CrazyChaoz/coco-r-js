$i = 0
$executions = 20
$sw = @()
for($i=0 ; $i -lt $executions; $i++) {
    $sw += [Diagnostics.Stopwatch]::StartNew()
    #insert command here
    C:\Users\Stefan\AppData\Roaming\JetBrains\WebStorm2021.1\node\node-v14.15.0-win-x64\node.exe C:\Users\Stefan\AppData\Roaming\JetBrains\WebStorm2021.1\node\node-v14.15.0-win-x64\node_modules\npm\bin\npm-cli.js run regenerate_coco --scripts-prepend-node-path=auto

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