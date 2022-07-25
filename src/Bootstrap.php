<?php

/**
 *  SFW2 - SimpleFrameWork
 *
 *  Copyright (C) 2017  Stefan Paproth
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

use SFW2\Routing\Request;
use SFW2\Routing\Resolver\Resolver;
use SFW2\Routing\ControllerMap\ControllerMapInterface;
use SFW2\Routing\PathMap\PathMap;
use SFW2\Routing\PathMap\PathMapLoaderInterface;

use SFW2\Core\Database;
use SFW2\Core\Session;
use SFW2\Core\Config;
use SFW2\Core\Permission\PermissionInterface;

use SFW2\Authority\Permission\Permission;
use SFW2\Authority\User;

use SFW2\Menu\Menu\Menu;

use Dice\Dice;
use ErrorException;

class Bootstrap {

    protected Dice $container;

    protected string $rootPath;

    protected array $server;

    protected array $get;

    protected array $post;

    protected ContainerInterface $config;

    /**
     * @param array $server
     * @param array $get
     * @param array $post
     * @param \Psr\Container\ContainerInterface $config
     */
    public function __construct(array $server, array $get, array $post, ContainerInterface $config) {
        $this->container = new Dice;
        $this->rootPath = __DIR__;
        $this->server   = $server;
        $this->get      = $get;
        $this->post     = $post;
        $this->config   = $config;
    }

    /**
     * @return void
     * @throws \Psr\Container\ContainerExceptionInterface
     * @throws \Psr\Container\NotFoundExceptionInterface
     */
    public function run(): void {
        $this->setUpEnvironment();
        $this->setUpContainer();
        $this->setUpRuntime();

        $response = $this->container->create(ResponseHandler::class);
        $session = $this->container->create(Session::class);
        $request = $this->container->create(Request::class);

        $curPath = $request->getPath();

        if($this->isOffline($session)) {
            $result = $response->getOffline();
        } else {
            $resolver = $this->container->create(Resolver::class);
            $result = $response->getContent($request, $resolver);
        }
        $path = $this->container->create(PathMap::class);
        $pathId = $path->getPathId($curPath);

        $pathMap = $this->container->create(PathMapByDatabase::class);

        if($result->hasModifiedData()) {
            $pathMap->updateModificationDateRecursive($curPath);
        }

        $dispatcher = $this->container->create(Dispatcher::class);
        $dispatcher->dispatch($pathId, $result, $this->container);
    }

    /**
     * @throws \Psr\Container\ContainerExceptionInterface
     * @throws \Psr\Container\NotFoundExceptionInterface
     */
    protected function setUpEnvironment(): void {
        if($this->config->get('site:debugMode')) {
            error_reporting(E_ALL);
            ini_set('display_errors', true);
        } else {
            error_reporting(0);
            ini_set('display_errors', false);
        }

        set_error_handler([$this, 'errorHandler']);
        mb_internal_encoding('UTF-8');
        ini_set('memory_limit', $this->config->get('misc:memoryLimit'));
        ini_set(LC_ALL, $this->config->get('misc:locale'));
        setlocale(LC_TIME, $this->config->get('misc:locale') . ".UTF-8"); // FIXME ???
        setlocale(LC_CTYPE, $this->config->get('misc:locale'));
        date_default_timezone_set($this->config->get('misc:timeZone'));
    }

    protected function setUpContainer() {
        $this->container->addRules([
            Session::class => [
                'shared' => true,
                'constructParams' => [
                    $this->server['SERVER_NAME']
                ]
            ],
            Database::class => [
                'shared' => true,
                'constructParams' => [
                    $this->config->get('database:host'),
                    $this->config->get('database:user'),
                    $this->config->get('database:pwd'),
                    $this->config->get('database:db'),
                    $this->config->get('database:prefix')
                ]
            ],
            Request::class => [
                'shared' => true,
                'constructParams' => [
                    $this->server,
                    $this->get,
                    $this->post
                ]
            ],
            Resolver::class => [
                'shared' => true,
                'substitutions' => [
                    Dice::class => $this->container,
                    ControllerMapInterface::class => [Dice::INSTANCE => ControllerMapByDatabase::class],
                    AbstractPathMap::class => [Dice::INSTANCE => PathMapByDatabase::class],
                    PermissionInterface::class => [Dice::INSTANCE => Permission::class]
                ]
            ],
            PathMap::class => [
                'shared' => true,
                'constructParams' => ['/'],
                'substitutions' => [
                    PathMapLoaderInterface::class => [Dice::INSTANCE => PathMapByDatabase::class]
                ]
            ],
            Menu::class => [
                'shared' => true,
                'substitutions' => [
                    PermissionInterface::class => [Dice::INSTANCE => Permission::class]
                ]
            ],
            Permission::class => [
                'shared' => true
            ],
            PathMapByDatabase::class => [
                'shared' => true
            ]
        ]);
    }

    protected function setUpRuntime() {
        $session = $this->container->create(Session::class);
        $currentUser = $session->getGlobalEntry(User::class);
        $this->container->addRules([
            User::class => [
                'shared' => true,
                'constructParams' => [$currentUser]
            ]
        ]);
    }

    protected function isOffline(Session $session): bool {
        if(!$this->config->getVal('site', 'offline')) {
            return false;
        }

        if($session->isGlobalEntrySet('bypass')) {
            return false;
        }

        if(
            isset($this->get['bypass']) &&
            $this->get['bypass'] == $this->config->getVal('site', 'offlineBypassToken')
        ) {
            $session->setGlobalEntry('bypass', true);
            return false;
        }
        return true;
    }

    /**
     * @throws \ErrorException
     * @throws \Psr\Container\NotFoundExceptionInterface
     * @throws \Psr\Container\ContainerExceptionInterface
     */
    public function errorHandler($errno, $errstr, $errfile, $errline): bool {
        if(!$this->config->get('site:debugMode')) {
            return true;
        }

        if(!(error_reporting() & $errno)) {
            return false;
        }
        throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
    }

}
