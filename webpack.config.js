'use strict'

const path = require('path');
const autoprefixer = require('autoprefixer');
const miniCssExtractPlugin = require('mini-css-extract-plugin')
const glob = require('glob');

module.exports = {
    mode: 'development',
    entry: function() {
        return {
            sfw2_main: {
                import: './src/js/sfw2_main.js',
                dependOn: 'sfw2_shared'
            },
            ...glob.sync('./src/js/modules/**.js').reduce(
                function(obj, el) {
                    obj[path.parse(el).name] = {
                        import: el,
                        dependOn: 'sfw2_shared'
                    };
                    return obj
                },
                {}
            ),
            sfw2_shared: ['jquery', 'bootstrap']
        };
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'public/js'),
    },
    optimization: {
  //      runtimeChunk: 'single',
    },
    devServer: {
        static: path.resolve(__dirname, 'public'),
        port: 8080,
        hot: true
    },
    plugins: [
        new miniCssExtractPlugin({
            filename: "../css/bundle.css"
        })
    ],
    module: {
        rules: [{
            test: /\.handlebars$/,
            loader: "handlebars-loader"
        }, {
            test: /\.(scss)$/,
            use: [{
                loader: 'style-loader'
            }, {
                loader: miniCssExtractPlugin.loader
            }, {
                loader: 'css-loader'
            }, {
                loader: 'postcss-loader',
                options: {
                    postcssOptions: {
                        plugins: [
                            autoprefixer
                        ]
                    }
                }
            }, {
                loader: 'sass-loader'
            }]
        }, {
            test: /\.woff2?$/,
            type: "asset/resource",
            generator: {
                filename: '../fonts/[hash][ext][query]'
            }
        }, {
            test: /\.(png|svg|jpg|jpeg|gif)$/i,
            type: 'asset/resource',
            generator: {
                filename: '../img/layout/[hash][ext][query]'
            }
        }, {
            test: /\.css$/,
            use: [
                'style-loader',
                'css-loader'
            ]
        }]
    }
}
