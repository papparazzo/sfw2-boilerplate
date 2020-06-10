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

class Installer {

    protected IOInterface $ioInterface;

    public function __construct(IOInterface $ioInterface) {
        $this->ioInterface = $ioInterface;
    }

    public function install() : void {
        $this->ioInterface->write('This will set up a new web page project');
        file_put_contents('config/config.yaml', Yaml::dump($this->getConfigArray()));
    }

    protected function getConfigArray() : array {
        $host = $this->ioInterface->ask('installation host? ');
        // TODO: Validate input!
        return [
            'database' => [
                'host'   => $this->ioInterface->ask('database host? [localhost]', 'localhost'),
                'user'   => $this->ioInterface->ask('database user? '),
                'pwd'    => $this->ioInterface->ask('database pwd? '),
                'db'     => $this->ioInterface->ask('database name? '),
                'prefix' => $this->ioInterface->ask('database prefix? ')
            ],

            'site' => [
                'offline'            => true,
                'debugMode'          => false,
                'offlineBypassToken' => md5(openssl_random_pseudo_bytes(64))
            ],

            'project' => [
                'title'          => $this->ioInterface->ask('project title? '),
                'eMailWebMaster' => "webmaster@$host",
            ],
            'defEMailAddr' => [
                'addr' => "noreply@$host",
                'name' => 'noreply'
            ],

            'misc' => [
                'timeZone'    => $this->ioInterface->ask('time zone? [' . date_default_timezone_get() . ']', date_default_timezone_get()),
                'locale'      => $this->ioInterface->ask('locale? [' .  locale_get_default() . ']', locale_get_default()),
                'memoryLimit' => '256M'
            ],
        ];
    }
}


