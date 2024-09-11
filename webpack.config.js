'use strict'

const path = require('path');
const autoprefixer = require('autoprefixer');
const miniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
    mode: 'development',
    entry: function() {
        return {
            main: './src/js/main.js',
            custom: './src/js/custom.js',
        };
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'public/js'),
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
