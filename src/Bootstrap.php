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
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use Psr\SimpleCache\CacheInterface;
use SFW2\Authority\Permission\Permission;
use SFW2\Config\Config;
use SFW2\Config\Exceptions\ContainerException;
use SFW2\Core\Handlebars\HandlebarsFactory;
use SFW2\Core\Handlebars\LoaderType;
use SFW2\Core\Permission\PermissionInterface;
use SFW2\Core\Utils\DateTimeHelper;
use SFW2\Core\Utils\Mailer;
use SFW2\Database\DatabaseInterface;
use SFW2\Database\Exception;
use SFW2\Routing\Dispatcher;
use SFW2\Routing\Middleware\Error;
use SFW2\Routing\Middleware\Offline;
use SFW2\Routing\PathMap\PathMapInterface;
use SFW2\Routing\Render\RenderComposite;
use SFW2\Routing\Render\RenderHtml;
use SFW2\Routing\Render\RenderJson;
use SFW2\Routing\Render\RenderXml;
use SFW2\Routing\ResponseEngine;
use SFW2\Routing\Runner;
use SFW2\Session\Middleware\XSRFTokenHandler;
use SFW2\Session\Session;
use SFW2\Database\Database;

use SFW2\Routing\Router;

use ErrorException;
use SFW2\Session\SessionInterface;
use SFW2\Session\SessionSimpleCache;
use SFW2\Session\XSRFToken;
use Symfony\Component\Yaml\Yaml;

class Bootstrap {

    protected Container $container;

    public function __construct(protected string $rootPath) {
    }

    /**
     * @throws DependencyException
     * @throws Exception
     * @throws NotFoundException
     * @throws InvalidArgumentException
     * @throws ContainerException
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    #[NoReturn]
    public function run(string $configFile): void
    {
        $configFile = $this->rootPath . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . $configFile;
        $container = $this->getContainer($configFile);
        $this->setUpEnvironment($container);

        /** @var Database $database */
        $database = $container->get(DatabaseInterface::class);

        /** @var Session $session */
        $session = $container->get(SessionInterface::class);

        $controllerMap = new ControllerMapByDatabase($database);
        $pathMap = new PathMapByDatabase($database);
        $psr17Factory = new Psr17Factory();

        $hfactory = $container->get(HandlebarsFactory::class);
        $handlebars = $hfactory->getHandlebars(LoaderType::TEMPLATE_LOADER);

        $render = new RenderComposite();
        $render->addEngines(
            new RenderJson(),
            new RenderXml($handlebars),
            new RenderHtml($handlebars, 'skeleton')
        );

        $responseEngine = new ResponseEngine($render, $psr17Factory);

        $router = new Router(new Runner($controllerMap, $container, $responseEngine), $pathMap);
        $router->addMiddleware(new Offline($container->get(CacheInterface::class), $container));
        $this->loadMiddleware($container, $router);
        $router->addMiddleware(new XSRFTokenHandler(new XSRFToken(new SessionSimpleCache($session))));
        $router->addMiddleware(new Error($responseEngine, $container, $container->get(LoggerInterface::class)));

        $creator = new ServerRequestCreator(
            $psr17Factory, // ServerRequestFactory
            $psr17Factory, // UriFactory
            $psr17Factory, // UploadedFileFactory
            $psr17Factory  // StreamFactory
        );

        $request = $creator->fromGlobals();
        $request = $request->withAttribute('sfw2_project', $container->get('project'));

        $response = $router->handle($request);

        $dispatcher = new Dispatcher();
        $dispatcher->dispatch($response);
    }

    /**
     * @throws NotFoundException
     * @throws DependencyException
     */
    protected function loadMiddleware(Container $container, Router $router): void
    {
        $w = $container->get('pathes.middleware');
        foreach($w as $class => $i) {
            $router->addMiddleware($container->get($class));
        }
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    protected function setUpEnvironment(Container $container): void
    {
        if($container->get('site.debugMode')) {
            error_reporting(E_ALL);
            ini_set('display_errors', true);
        } else {
            error_reporting(0);
            ini_set('display_errors', false);
        }

        set_error_handler([$this, 'errorHandler']);
        mb_internal_encoding('UTF-8');
        ini_set('memory_limit', $container->get('misc.memoryLimit'));
        ini_set(LC_ALL, $container->get('misc.locale'));
        setlocale(LC_TIME, $container->get('misc.locale') . ".UTF-8");
        setlocale(LC_CTYPE, $container->get('misc.locale'));
        date_default_timezone_set($container->get('misc.timeZone'));
    }

    /**
     * TODO delete tmp before deploying
     * Be aware that the container is compiled once and never updated!
     *
     * Therefore:
     *
     * - in production you should clear that directory every time you deploy
     * - in development you should not compile the container
     *
     * @throws ErrorException
     */
    protected function enableCompilation(ContainerBuilder $builder, array $config): void
    {
        if($config['site.debugMode']) {
            return;
        }
        $tmpPath = $this->rootPath . DIRECTORY_SEPARATOR . $config['pathes.tmp'];

        if(!is_dir($tmpPath) && !mkdir($tmpPath)) {
            throw new ErrorException();
        }
        $builder->enableCompilation($tmpPath);
        $builder->writeProxiesToFile(true, "$tmpPath/proxies");
    }

    /**
     * @throws ContainerException
     * @throws \Exception
     */
    protected function getContainer(string $configFile): Container
    {
        $builder = new ContainerBuilder();
        $config = (new Config(Yaml::parseFile($configFile)))->getAsArray();

        $this->enableCompilation($builder, $config);

        $builder->addDefinitions($config);
        $builder->addDefinitions([
            SessionInterface::class => function () {
                return new Session();
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
            DateTimeHelper::class => function (ContainerInterface $ci) {
                return new DateTimeHelper(
                    $ci->get('misc.timeZone'),
                    $ci->get('misc.locale')
                );
            },
            PathMapInterface::class => function (DatabaseInterface $database) {
                return new PathMapByDatabase($database);
            },
            CacheInterface::class => function (SessionInterface $session) {
                return new SessionSimpleCache($session);
            },
            LoggerInterface::class => function () {
                return new NullLogger();
            },
            PermissionInterface::class => function(SessionInterface $session, DatabaseInterface $database) {
                return new Permission($session, $database);
            },
            Mailer::class => function(ContainerInterface $ci) {
                /** @var HandlebarsFactory $handlebars */
                $handlebars = $ci->get(HandlebarsFactory::class);
                return new Mailer(
                    $ci->get('project.default_sender_address'),
                    [$ci->get('project.webmaster_mail_address')],
                    $handlebars->getHandlebars(LoaderType::TEMPLATE_LOADER),
                    $handlebars->getHandlebars(LoaderType::STRING_LOADER)
                );
            },
            HandlebarsFactory::class => function(ContainerInterface $ci) {
                return new HandlebarsFactory($ci->get('pathes.templates'), 'SFW2\Base');
            }
        ]);
        return $builder->build();
    }

    /**
     * @throws ErrorException
     */
    public function errorHandler($errno, $errstr, $errfile, $errline): bool {
        if(!(error_reporting() & $errno)) {
            return false;
        }
        throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
    }
}
