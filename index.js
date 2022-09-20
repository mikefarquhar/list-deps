const fs = require('fs');
const path = require('path');

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
    const [filePath, fileText] = loadFile(context, modulePath);

    const importRegexp = /(import|export)(.*from)? ['"](.*)['"]/g;
    const dynamicImportRegexp = /import\(['"`](.*)['"`]\)/g;
    const requireRegexp = /require\(['"`](.*)['"`]\)/g;

    const currentFolder = path.dirname(filePath);

    for (const relativeImport of iterAll(
        processImports(context, importRegexp, 3, fileText),
        processImports(context, dynamicImportRegexp, 1, fileText),
        processImports(context, requireRegexp, 1, fileText),
    )) {
        const referencedModulePath = path.join(currentFolder, relativeImport);
        followDependencies(context, referencedModulePath);
    }
}

function loadFile(context, modulePath) {
    for (const filePath of pathVariants(context, modulePath)) {
        try {
            const fileText = fs.readFileSync(filePath, 'utf-8');
            return [filePath, fileText];
        } catch { /* ignore */ }
    }

    const relativePath = path.relative(context.rootDir, modulePath);
    context.skippedModules.add(relativePath);
    return [modulePath, ''];
}

function* pathVariants({ extensions }, modulePath) {
    yield modulePath;

    for (const extension of extensions) {
        yield `${modulePath}.${extension}`;
    }

    for (const extension of extensions) {
        yield `${modulePath}/index.${extension}`;
    }
}

function* iterAll(...iterables) {
    for (const iterable of iterables) {
        yield* iterable;
    }
}

function* processImports(context, regexp, matchIndex, fileText) {
    for (const match of fileText.matchAll(regexp)) {
        const imported = match[matchIndex];

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