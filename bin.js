#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const listDeps = require('.');

program
    .name('list-deps')
    .description('List imported JavaScript dependencies')
    .version('0.1.2')
    .argument(
        '<root-file-path>',
        'Root file from which to search for dependencies',
    )
    .option(
        '-e --extensions <extensions...>',
        'File extensions to look for when resolving modules',
        ['js'],
    )
    .action((rootFilePath, { extensions }) => {
        const { skippedModules, dependencies } = listDeps(rootFilePath, extensions);

        if (skippedModules.length > 0) {
            console.warn(chalk.bgYellow(` ${skippedModules.length} Modules skipped `));
            for (const modulePath of skippedModules) {
                console.warn(modulePath);
            }
        }

        console.log(chalk.bgGreen(` ${dependencies.length} Dependencies found `))
        for (const dependency of dependencies) {
            console.log(dependency);
        }
    })
    .parse()