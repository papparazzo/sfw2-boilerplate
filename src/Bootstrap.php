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

use DI\Container;
use DI\ContainerBuilder;
use DI\DependencyException;
use DI\NotFoundException;
use InvalidArgumentException;
use JetBrains\PhpStorm\NoReturn;
use Nyholm\Psr7\Factory\Psr17Factory;
use Nyholm\Psr7Server\ServerRequestCreator;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;

use Psr\Container\NotFoundExceptionInterface;
use Psr\Log\NullLogger;
use SFW2\Authority\Middleware\Authorisation; // FIXME: use namespace from config.yaml
use SFW2\Authority\Permission\Permission;
use SFW2\Authority\Permission\PermissionException;
use SFW2\Config\Config;
use SFW2\Config\Exceptions\ContainerException;
use SFW2\Database\DatabaseInterface;
use SFW2\Database\Exception;
use SFW2\Menu\Middleware\MenuMiddleware; // FIXME: use namespace from config.yaml
use SFW2\Routing\Dispatcher;
use SFW2\Routing\Middleware\Error;       // FIXME: use namespace from config.yaml
use SFW2\Routing\Middleware\Offline;     // FIXME: use namespace from config.yaml
use SFW2\Routing\Render\RenderComposite;
use SFW2\Routing\Render\RenderHtml;
use SFW2\Routing\Render\RenderJson;
use SFW2\Routing\Render\RenderXml;
use SFW2\Routing\ResponseEngine;
use SFW2\Routing\Runner;
use SFW2\Routing\TemplateLoader;
use SFW2\Session\Session;
use SFW2\Database\Database;

use SFW2\Routing\Router;

use ErrorException;
use SFW2\Session\SessionSimpleCache;
use Symfony\Component\Yaml\Yaml;

class Bootstrap {

    protected Container $container;

    protected string $rootPath;

    protected array $server;

    protected array $get;

    protected array $post;

    /**
     * @param array $server
     * @param array $get
     * @param array $post
     * @param string $configFile
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     * @throws ContainerException
     */
    public function __construct(array $server, array $get, array $post, string $configFile) {
        $this->rootPath  = __DIR__;
        $this->server    = $server;
        $this->get       = $get;
        $this->post      = $post;
        $this->container = $this->getContainer($configFile);

        $this->setUpEnvironment();
    }

    /**
     * @throws DependencyException
     * @throws Exception
     * @throws NotFoundException
     * @throws InvalidArgumentException
     * @throws PermissionException
     */
    #[NoReturn]
    public function run(): void {
        /** @var Database $database */
        $database = $this->container->get(DatabaseInterface::class);

        /** @var Session $session */
        $session = $this->container->get(Session::class);

        $logger = new NullLogger(); // FIXME Replace this

        $controllerMap = new ControllerMapByDatabase($database);
        $pathMap = new PathMapByDatabase($database);
        $psr17Factory = new Psr17Factory();

        $templateLoader = new TemplateLoader($this->container->get('pathes.templates'), 'SFW2\Boilerplate');
        $render = new RenderComposite();
        $render->addEngines(
            new RenderJson(),
            new RenderXml($templateLoader),
            new RenderHtml($templateLoader, 'skeleton')
        );

        $responseEngine = new ResponseEngine($render, $psr17Factory);

        $router = new Router(new Runner($controllerMap, $this->container, $responseEngine), $pathMap);
        // TODO: get middlewares from config and iterate!
        $router->addMiddleware(new Offline(new SessionSimpleCache($session), $this->container));
        $router->addMiddleware(new MenuMiddleware($database, $pathMap));
        $router->addMiddleware(new Authorisation(new Permission($database)));
        $router->addMiddleware(new Error($responseEngine, $this->container, $logger));

        $creator = new ServerRequestCreator(
            $psr17Factory, // ServerRequestFactory
            $psr17Factory, // UriFactory
            $psr17Factory, // UploadedFileFactory
            $psr17Factory  // StreamFactory
        );

        $request = $creator->fromGlobals();
        $request = $request->withAttribute('sfw2_project', $this->container->get('project'));

        $response = $router->handle($request);

        $x = new Dispatcher();
        $x->dispatch($response);
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    protected function setUpEnvironment(): void {
        if($this->container->get('site.debugMode')) {
            error_reporting(E_ALL);
            ini_set('display_errors', true);
        } else {
            error_reporting(0);
            ini_set('display_errors', false);
        }

        set_error_handler([$this, 'errorHandler']);
        mb_internal_encoding('UTF-8');
        ini_set('memory_limit', $this->container->get('misc.memoryLimit'));
        ini_set(LC_ALL, $this->container->get('misc.locale'));
        setlocale(LC_TIME, $this->container->get('misc.locale') . ".UTF-8"); // FIXME ???
        setlocale(LC_CTYPE, $this->container->get('misc.locale'));
        date_default_timezone_set($this->container->get('misc.timeZone'));
    }

    /**
     * @throws ContainerException
     * @throws \Exception
     */
    protected function getContainer(string $configFile): Container {
        $builder = new ContainerBuilder();
        $builder->addDefinitions((new Config(Yaml::parseFile($configFile)))->getAsArray());
        $builder->addDefinitions([
            'session.servername' => $this->server['SERVER_NAME'],

            Session::class => function (ContainerInterface $ci) {
                return new Session($ci->get('session.servername'));
            },
            DatabaseInterface::class => function (ContainerInterface $ci) {
                return new Database(
                    $ci->get('database.dsn'),
                    $ci->get('database.user'),
                    $ci->get('database.pwd'),
                    $ci->get('database.options'),
                    $ci->get('database.prefix')
                );
            },
        ]);
        return $builder->build();
    }

    /**
     * @throws NotFoundExceptionInterface
     * @throws DependencyException
     * @throws ErrorException
     */
    public function errorHandler($errno, $errstr, $errfile, $errline): bool {
        if(!$this->container->get('site.debugMode')) {
            return true;
        }

        if(!(error_reporting() & $errno)) {
            return false;
        }
        throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
    }
}
