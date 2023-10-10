const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const { IgnorePlugin } = require('webpack');

/** @type { import('webpack').Configuration } */
const config = {
  mode: 'production',
  target: 'node',
  entry: {
    index: './src/server/prod.ts',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            configFile: 'tsconfig.server.json',
          },
        },
        exclude: /node_modules/,
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
    filename: 'index.js',
    path: path.resolve(__dirname, 'docker-prod-output-server'),
    clean: true,
  },
  plugins: [
    new IgnorePlugin({
      resourceRegExp: /^pg-native$/,
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
    ],
  },
};

module.exports = config;
