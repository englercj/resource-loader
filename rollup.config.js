import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

const plugins = [
    resolve(),
    commonjs(),
    babel()
];
const sourcemap = true;
const freeze = false;
const input = 'src/index.js';
const bundleInput = 'src/bundle.js';
const external = Object.keys(pkg.dependencies);
const compiled = (new Date()).toUTCString().replace(/GMT/g, "UTC");

const banner = `/*!
 * ${pkg.name} - v${pkg.version}
 * https://github.com/pixijs/pixi-sound
 * Compiled ${compiled}
 *
 * ${pkg.name} is licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license
 */`;

export default [
    {
        input,
        plugins,
        external,
        output: [
            {
                banner,
                file: 'dist/resource-loader.cjs.js',
                format: 'cjs',
                freeze,
                sourcemap,
            },
            {
                banner,
                file: 'dist/resource-loader.esm.js',
                format: 'esm',
                freeze,
                sourcemap,
            }
        ]
    },
    {
        input: bundleInput,
        plugins,
        output: {
            banner,
            name: 'Loader',
            file: 'dist/resource-loader.js',
            format: 'iife',
            freeze,
            sourcemap,
        }
    },
    {
        input: bundleInput,
        plugins: [].concat(plugins, terser({
            output: {
                comments(node, comment) {
                    return comment.line === 1;
                },
            },
            compress: {
                drop_console: true,
            },
        })),
        output: {
            banner,
            name: 'Loader',
            file: 'dist/resource-loader.min.js',
            format: 'iife',
            freeze,
            sourcemap,
        }
    }
];
