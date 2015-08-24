<?php
$file = getcwd() . '/data/scores.json';
$contents = file_get_contents($file, TRUE);

$json = json_decode($contents, TRUE);

if (!empty($_GET['id'])) {
  $id = htmlspecialchars($_GET['id'], ENT_QUOTES, 'UTF-8');

  $user_id = htmlspecialchars($_GET['user'], ENT_QUOTES, 'UTF-8');

  if (!empty($_GET['type'])) {
    $update_type = $_GET['type'];

    switch ($update_type) {
      case 'hit':
      case 'miss':
      case 'maybe':
        if ($id && $update_type && $user_id) {
          $json['scores'][$id][$update_type][$user_id] = $user_id;

          if (empty($json['scores'][$id]['count'][$update_type])) {
            $json['scores'][$id]['count'][$update_type] = 1;
          }
          else {
            $json['scores'][$id]['count'][$update_type]++;
          }
        }
        break;
    }
  }
}

$json_output = json_encode($json);

$fp = fopen($file, 'w');
fwrite($fp, $json_output);
fclose($fp);
