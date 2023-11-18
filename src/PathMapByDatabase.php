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

use OutOfRangeException;
use SFW2\Database\DatabaseInterface;
use SFW2\Database\Exception;
use SFW2\Routing\PathMap\PathMapInterface;

class PathMapByDatabase implements PathMapInterface {

    protected array $pathMap = [];

    /**
     * @param DatabaseInterface $database
     * @throws Exception
     */
    public function __construct(protected DatabaseInterface $database) {
        $this->loadRootPath($this->pathMap);
    }

    /**
     * @throws Exception
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
     * @throws Exception
     */
    protected function loadPath(array &$map, int $parentId, string $prefix = '/'): void {

        $res = $this->database->select("SELECT `Id`, `Name` FROM `{TABLE_PREFIX}_path` WHERE `ParentPathId` = %s", [$parentId]);

        foreach($res as $item) {
            $map[$prefix . $item['Name']] = $item['Id'];
            $this->loadPath($map, (int)$item['Id'], $prefix . $item['Name'] . '/');
        }
    }

    /**
     * @throws Exception
     */
    public function updateModificationDateRecursive(string $path): void {
        if(!isset($this->pathMap[$path])) {
            return;
        }

        // TODO Consider to save id in tmp and execute UPDATE ... SET ... WHERE Id IN(tmp...)
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
     */
    protected function updateModificationDate(int $pathId): void {
        $this->database->update("UPDATE `{TABLE_PREFIX}_path` SET `ModificationDate` = NOW() WHERE `Id` = %s", [$pathId]);
    }

    public function hasPath(string $path): bool {
        return isset($this->pathMap[$path]);
    }

    public function getPathId(string $path): int {
        if(!$this->hasPath($path)) {
            throw new OutOfRangeException("invalid path <$path> given");
        }
        return $this->pathMap[$path];
    }

    public function getPath(int $pathId): string {
        $res = array_search($pathId, $this->pathMap);
        if($res === false) {
            throw new OutOfRangeException("path for id <$pathId> does not exists");
        }
        return $res;
    }

    public function getPathIdOfParentPath(string $currentPath): int {
        $chunks =  explode('/', $currentPath);
        if($chunks[1] == '') {
            throw new OutOfRangeException("invalid path <$currentPath> given");
        }
        return $this->getPathId('/' . $chunks[1]);
    }
}
