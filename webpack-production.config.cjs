const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

/** @type { import('webpack').Configuration } */
const config = {
  mode: 'production',
  entry: {
    index: './src/index.tsx',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: true,
                localIdentName: '[hash:base64:5]',
              },
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    extensionAlias: {
      '.js': ['.tsx', '.ts', '.js'],
    },
  },
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'docker-prod-output-static'),
    clean: true,
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      title: 'YeType',
      template: 'htmlTemplate.ejs',
    }),
  ],
  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          format: {
            comments: false,
          },
        },
      }),
      new CssMinimizerPlugin(),
    ],
  },
};

module.exports = config;
