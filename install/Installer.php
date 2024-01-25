<?php

/*
 *  Project:    sfw2-boilerplate
 *
 *  Copyright (C) 2020 Stefan Paproth <pappi-@gmx.de>
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as
 *  published by the Free Software Foundation, either version 3 of the
 *  License, or (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/agpl.txt>.
 *
 */

namespace SFW2\Install;

use Composer\IO\IOInterface;
use Symfony\Component\Yaml\Yaml;

use Exception;
use mysqli;
use Locale;

class Installer
{

    protected IOInterface $ioInterface;

    public function __construct(IOInterface $ioInterface)
    {
        $this->ioInterface = $ioInterface;
    }

    /**
     * @throws Exception
     */
    public function install(): void
    {
        $this->ioInterface->write('This will set up a new web page project');
        $config = $this->getConfigArray();
        $this->setUpDatabase($config);
        // TODO: run npm install!

        $this->cleaningUp('install');
    }

    protected function getConfigArray(): array
    {
        $host = $this->ioInterface->ask('installation host (domain)? ');
        $dbHost = $this->ioInterface->ask("database host? [$host] ", $host);
        $dbName = $this->ioInterface->ask("database name?");

        // TODO: Validate input!
        $config = [
            'database' => [
                'dsn'     => "mysql:dbname=$dbName;host=$dbHost",
                'user'    => $this->ioInterface->ask('database user? '),
                'pwd'     => $this->ioInterface->ask('database pwd? '),
                'options' => [],
                'prefix'  => $this->ioInterface->ask('database prefix? ')
            ],
            'site' => [
                'offline'            => true,
                'debugMode'          => false,
                'offlineBypassToken' => md5(openssl_random_pseudo_bytes(64))
            ],
            'project' => [
                'title'                  => $this->ioInterface->ask('project title? '),
                'sub_title'              => $this->ioInterface->ask('project sub title? '),
                'webmaster_mail_address' => "webmaster@$host",
                'default_sender_address' => "noreply@$host",
            ],
            'misc' => [
                'timeZone'    => $this->ioInterface->ask('time zone? [' . date_default_timezone_get() . ']', date_default_timezone_get()),
                'locale'      => $this->ioInterface->ask('locale? [' . Locale::getDefault() . ']', Locale::getDefault()),
                'memoryLimit' => '256M'
            ],
            'pathes' => [
                'tmp'        => 'tmp/',
                'log'        => 'weblog/',
                'data'       => 'data/',
                'templates'  => [
                    "SFW2\\Base" => "../templates/",
                ],
                'middleware' => []
            ]
        ];
        file_put_contents('config/config.yaml', Yaml::dump($config));
        return [
            'host' => $dbHost,
            'user' => $config['database']['user'],
            'pwd' => $config['database']['pwd'],
            'db' => $dbName,
            'prefix' => $config['database']['prefix']
        ];
    }

    /**
     * @throws Exception
     */
    protected function setUpDatabase(array $dbConfig): void
    {
        $handle = new mysqli("p:{$dbConfig['host']}", $dbConfig['user'], $dbConfig['pwd']);
        $err = mysqli_connect_error();
        if ($err) {
            throw new Exception("Could not connect to database <$err>");
        }
        $handle->query("set names 'utf8';");

        $stmt = str_replace('{DATABASE_NAME}', $dbConfig['db'], file_get_contents(__DIR__ . '/database.sql'));
        $stmt = str_replace('{TABLE_PREFIX}', $dbConfig['prefix'], $stmt);

        if ($handle->multi_query($stmt) === false) {
            throw new Exception('Could not create database');
        }
    }

    protected function cleaningUp(string $path): void
    {
        array_map('unlink', glob("$path/*"));
        rmdir($path);
    }
}
