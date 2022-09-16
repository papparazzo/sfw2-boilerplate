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

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `{DATABASE_NAME}` DEFAULT CHARACTER SET utf8 COLLATE utf8_unicode_ci;
USE `{DATABASE_NAME}`;

CREATE TABLE IF NOT EXISTS `{TABLE_PREFIX}_controller_template` (
    `Id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `ClassName` varchar(256) COLLATE utf8_unicode_ci NOT NULL,
    `DisplayName` varchar(256) COLLATE utf8_unicode_ci NOT NULL,
    `Description` text COLLATE utf8_unicode_ci NOT NULL,
    `Data` text COLLATE utf8_unicode_ci NOT NULL,
    PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS `{TABLE_PREFIX}_path` (
    `Id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `ParentPathId` int(11) UNSIGNED DEFAULT NULL,
    `Name` varchar(25) COLLATE utf8_unicode_ci NOT NULL,
    `ControllerTemplateId` int(10) UNSIGNED NOT NULL,
    `JsonData` text CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
    `ModificationDate` date DEFAULT NULL,
    PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

INSERT INTO `{TABLE_PREFIX}_path` (`Id`, `ParentPathId`, `Name`, `ControllerTemplateId`, `JsonData`, `ModificationDate`) VALUES
(0, NULL, 'home', 1, '[\"home\"]', NULL),

COMMIT;
