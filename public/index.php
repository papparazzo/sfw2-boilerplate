<?php

use SFW2\Boilerplate\Bootstrap;

require __DIR__ . '/../vendor/autoload.php';

$boot = new Bootstrap($_SERVER, $_GET, $_POST);
$boot->run('../config');
