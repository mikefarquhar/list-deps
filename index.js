const fs = require('fs');
const path = require('path');

const singleLineCommentRegexp = /\/\/.*/g;
const multiLineCommentRegexp = /\/\*[\s\S]*?\*\//g;
const importRegexp = /^\s*import[\s\S]*?['"`](\S*)['"`]/gm;
const exportRegexp = /^\s*export[\s\S]*?from\s*['"`](\S*)['"`]/gm;
const dynamicImportRegexp = /import\(\s*['"`](.*)['"`]\s*\)/g;
const requireRegexp = /require\(\s*['"`](.*)['"`]\s*\)/g;

/**
 * Extract the list of dependencies accessible from a root file.
 * 
 * @param {string} rootFilePath File path to start searching from.
 * @param {string[]} extensions List of file extensions to resolve. Defaults to ['js'].
 * @returns {{
 *   skippedModules: string[],
 *   dependencies: string[],
 * }} The modules skipped while searching, and the list of dependencies found.
 */
function listDeps(rootFilePath, extensions = ['js']) {
    const context = {
        extensions,
        rootDir: path.dirname(path.resolve(rootFilePath)),
        skippedModules: new Set(),
        visitedModules: new Set(),
        dependencies: new Set(),
    };

    followDependencies(context, rootFilePath);

    const skippedModules = Array
        .from(context.skippedModules)
        .sort();

    const dependencies = Array
        .from(context.dependencies)
        .sort();

    return { skippedModules, dependencies };
}

function followDependencies(context, modulePath) {
    if (context.visitedModules.has(modulePath)) {
        return;
    }

    context.visitedModules.add(modulePath);

    const [filePath, fileText] = loadFile(context, modulePath);
    const currentFolder = path.dirname(filePath);

    for (const relativeImport of iterAll(
        processImports(context, importRegexp, fileText),
        processImports(context, exportRegexp, fileText),
        processImports(context, dynamicImportRegexp, fileText),
        processImports(context, requireRegexp, fileText),
    )) {
        const referencedModulePath = path.join(currentFolder, relativeImport);
        followDependencies(context, referencedModulePath);
    }
}

function loadFile(context, modulePath) {
    for (const filePath of pathVariants(context, modulePath)) {
        try {
            const fileText = fs.readFileSync(filePath, 'utf-8')
                .replaceAll(singleLineCommentRegexp, '')
                .replaceAll(multiLineCommentRegexp, '');

            return [filePath, fileText];
        } catch { /* ignore */ }
    }

    const relativePath = path.relative(context.rootDir, modulePath);
    if (hasNoExtension(relativePath) || hasAllowedExtension(context, relativePath)) {
        context.skippedModules.add(relativePath);
    }

    return [modulePath, ''];
}

function* pathVariants(context, modulePath) {
    if (hasAllowedExtension(context, modulePath)) {
        yield modulePath;
    }

    for (const extension of context.extensions) {
        yield `${modulePath}.${extension}`;
    }

    for (const extension of context.extensions) {
        yield `${modulePath}/index.${extension}`;
    }
}

function hasNoExtension(filePath) {
    return path.basename(filePath).split('.').length <= 1
}

function hasAllowedExtension({ extensions }, filePath) {
    const extension = path.basename(filePath).split('.').slice(1).join('.');
    return extension.length > 0 && extensions.includes(extension);
}

function* iterAll(...iterables) {
    for (const iterable of iterables) {
        yield* iterable;
    }
}

function* processImports(context, regexp, fileText) {
    for (const match of fileText.matchAll(regexp)) {
        const imported = match[1];

        if (imported.startsWith('.')) {
            yield imported;
        } else {
            let importParts = imported.split('/');

            if (importParts[0].startsWith('@')) {
                context.dependencies.add(`${importParts[0]}/${importParts[1]}`);
            } else {
                context.dependencies.add(`${importParts[0]}`)
            }
        }
    }
}

module.exports = listDeps;