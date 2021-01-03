module.exports = {
    transform: {
        '^.+\\.ts?$': 'ts-jest',
    },
    testEnvironment: 'node',
    testRegex: '/src/.*\\.(test|spec)?\\.(ts|tsx|js)$',
    modulePathIgnorePatterns: ['node_modules'],
    watchPathIgnorePatterns: [
        '<rootDir>/[^/]*.js$',
        '<rootDir>/(node_modules|dist|coverage|.vscode)',
    ],
    moduleFileExtensions: ['ts', 'js'],
    silent: false,
    verbose: false,
};
