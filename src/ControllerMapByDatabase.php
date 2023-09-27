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
use SFW2\Routing\ControllerMap\ControllerMapInterface;

class ControllerMapByDatabase implements ControllerMapInterface {

    public function __construct(
        protected DatabaseInterface $database
    ) {
    }

    /**
     * @param int $pathId
     * @return array[]
     * @throws \SFW2\Database\Exception
     * @throws \JsonException
     */
    public function getControllerRulsetByPathId(int $pathId): array {
        $stmt = /** @lang MySQL */
            "SELECT `ClassName` AS " . self::CLASS_NAME . ", `JsonData` AS " . self::ADDITIONAL_DATA . ' ' .
            "FROM `{TABLE_PREFIX}_path` AS `ctrlMap` " .
            "LEFT JOIN `{TABLE_PREFIX}_controller_template` AS `ctrlTempl` " .
            "ON `ctrlMap`.`ControllerTemplateId` = `ctrlTempl`.`Id` " .
            "WHERE `ctrlMap`.`Id` = '%s' ";

        $res = $this->database->selectRow($stmt, [$pathId]);

        if(empty($res)) {
            throw new OutOfRangeException("no entry found for path <$pathId>");
        }

        $res[self::ADDITIONAL_DATA] = json_decode(
            json: $res[self::ADDITIONAL_DATA],
            associative:  true,
            flags:  JSON_THROW_ON_ERROR
        );

        return $res;
    }
}
