<?php
$file = getcwd() . '/data/scores.json';
$contents = file_get_contents($file, TRUE);

$json = json_decode($contents, TRUE);

$scores_lookup = array();
foreach ($json['scores'] as $key => $value) {
  $scores_lookup[$value['id']] = $key;
}


if (!empty($_GET['id'])) {
  $id = htmlspecialchars($_GET['id'], ENT_QUOTES, 'UTF-8');
  if (!array_key_exists($id, $scores_lookup)) {
    $scores_lookup[] = $id;
  }

  $index = $scores_lookup[$id];


  if (!empty($_GET['type'])) {
    $update_type = $_GET['type'];

    switch ($update_type) {
      case 'hit':
      case 'miss':
      case 'maybe':
        $json['scores'][$index][$update_type] += 1;
    }
  }
}

$json_output = json_encode($json);

$fp = fopen($file, 'w');
fwrite($fp, $json_output);
fclose($fp);
