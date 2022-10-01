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

use InvalidArgumentException;
use OutOfRangeException;
use SFW2\Database\Database;
use SFW2\Routing\ControllerMap\ControllerMapInterface;

class ControllerMapByDatabase implements ControllerMapInterface {

    protected Database $database;

    public function __construct(Database $database) {
        $this->database = $database;
    }

    /**
     * @param int $pathId
     * @return array[]
     * @throws \SFW2\Database\Exception
     */
    public function getControllerRulsetByPathId(int $pathId): array {
        $stmt = /** @lang MySQL */
            "SELECT `ClassName`, `JsonData` " .
            "FROM `{TABLE_PREFIX}_path` AS `ctrlMap` " .
            "LEFT JOIN `{TABLE_PREFIX}_controller_template` AS `ctrlTempl` " .
            "ON `ctrlMap`.`ControllerTemplateId` = `ctrlTempl`.`Id` " .
            "WHERE `ctrlMap`.`Id` = '%s' ";

        $res = $this->database->selectRow($stmt, [$pathId]);

        if(empty($res)) {
            throw new OutOfRangeException("no entry found for path <$pathId>");
        }

        $params = json_decode($res['JsonData'], true);

        if(!is_array($params)) {
            throw new InvalidArgumentException("invalid params given <{$res['JsonData']}>");
        }

        array_unshift($params, $pathId);

        return [
            $res['ClassName'] => [
                'constructParams' => $params
            ]
        ];
    }
}
