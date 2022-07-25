<?php

use SFW2\Boilerplate\Bootstrap;
use SFW2\Config\Config;
use Symfony\Component\Yaml\Yaml;

require __DIR__ . '/../vendor/autoload.php';

$boot = new Bootstrap($_SERVER, $_GET, $_POST, new Config(Yaml::parseFile('../config/config.yaml')));
$boot->run();
