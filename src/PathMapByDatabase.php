<?php

/**
 *  SFW2 - SimpleFrameWork
 *
 *  Copyright (C) 2018  Stefan Paproth
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

namespace SFW2\Boilerplate;

use SFW2\Database\Database;
use SFW2\Routing\PathMap\PathMapLoaderInterface;

class PathMapByDatabase implements PathMapLoaderInterface {

    protected Database $database;

    protected array $pathMap = [];

    /**
     * * @param \SFW2\Database\Database $database
     * * @throws \SFW2\Database\Exception
     */
    public function __construct(Database $database) {
        $this->database = $database;
        $this->loadRootPath($this->pathMap);
    }

    public function getPathMap(): array {
        return $this->pathMap;
    }

    /**
     * @throws \SFW2\Database\Exception
     */
    protected function loadRootPath(array &$map): void {
        $item = $this->database->selectRow("SELECT `Id`, `Name` FROM `{TABLE_PREFIX}_path` WHERE `ParentPathId` IS NULL");

        $map['/'] = $item['Id'];
        $this->loadPath($map, (int)$item['Id']);
    }

    /**
     * @param array $map
     * @param int $parentId
     * @param string $prefix
     * @return void
     * @throws \SFW2\Database\Exception
     */
    protected function loadPath(array &$map, int $parentId, string $prefix = '/'): void {

        $res = $this->database->select("SELECT `Id`, `Name` FROM `{TABLE_PREFIX}_path` WHERE `ParentPathId` = '%s'", [$parentId]);

        foreach($res as $item) {
            $map[$prefix . $item['Name']] = $item['Id'];
            $this->loadPath($map, (int)$item['Id'], $prefix . $item['Name'] . '/');
        }
    }

    /**
     * @param string $path
     * @throws \SFW2\Database\Exception
     * /
    public function isValidPath(string $path): bool
    {
        $stmt = "SELECT * FROM `{TABLE_PREFIX}_path` AS `ctrlMap` WHERE `ctrlMap`.`Id` = '%s' ";

        $res = $this->database->selectRow($stmt, [$path]);
    }
*/
    public function updateModificationDateRecursive(string $path): void {
        if(!isset($this->pathMap[$path])) {
            return;
        }

        $this->updateModificationDate($this->pathMap[$path]);

        $pos = strrpos($path, '/');
        if($pos === false) {
            return;
        }
        $path = substr($path, 0, $pos);
        $this->updateModificationDateRecursive($path);
    }

    /**
     * @param int $pathId
     * @return void
     * @throws \SFW2\Database\Exception
     */
    protected function updateModificationDate(int $pathId): void {
        $this->database->update("UPDATE `{TABLE_PREFIX}_path` SET `ModificationDate` = NOW() WHERE `Id` = '%s'", [$pathId]);
    }
}
