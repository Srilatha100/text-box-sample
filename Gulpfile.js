"use strict";

const path = require("path");
const zip = require("gulp-zip");
const gulp = require("gulp");
const webpack = require("webpack");
const del = require("del");
const gulpSlash = require("gulp-slash");
const xml2js = require("gulp-xml2js");
const change = require("gulp-change");
const rename = require("gulp-rename");
const transformXml = require("./scripts/GenerateTypings");

const pkg = require("./package.json");

const projectPath = pkg.config.projectPath ? gulpSlash(pkg.config.projectPath) : path.join(__dirname, "./dist/MxTestProject");
const widgetsFolder = path.join(projectPath, "/widgets/");

function clean() {
    return del([
        "./dist/" + pkg.version + "/*.*",
        "./dist/tmp/**/*.*",
        "./dist/tsc/**/*.*",
        "./dist/testresults/**/*.*",
        `${pkg.config.projectPath}/deployment/web/widgets/*.*`,
        widgetsFolder + "/" + pkg.widgetName + ".mpk"
    ], { force: true });
}

function createMpkFile() {
    return gulp
        .src("./dist/tmp/widgets/**/*")
        .pipe(zip(pkg.widgetName + ".mpk"))
        .pipe(gulp.dest(widgetsFolder))
        .pipe(gulp.dest("./dist/" + pkg.version));
}

function copyToDeployment() {
    return gulp
        .src("./dist/tmp/widgets/**/*")
        .pipe(gulp.dest(`${pkg.config.projectPath}/deployment/web/widgets`));
}

function runWebpack(config, cb) {
    webpack(config, (err, stats) => {
        if (err) {
            cb(new Error(`Webpack: ${err}`));
        }
        const output = stats.toString({ colors: true, modules: false });
        console.log(`Webpack output:\n${output}`);
        cb();
    });
}

function bundle(cb) {
    const config = require("./webpack.config");
    runWebpack(config, cb);
}

function productionBundle(cb) {
    const config = require("./webpack.config");
    config.mode = "production";
    runWebpack(config, cb);
}

function checkDependencies(cb) {
    require("check-dependencies").sync({
        packageDir: "./package.json",
        scopeList: ["devDependencies"],
        install: true
    });
    cb();
}

function generateTypings() {
    return gulp
        .src(`src/${pkg.widgetName}.xml`)
        .pipe(xml2js())
        .pipe(change(content => transformXml(content, pkg.widgetName)))
        .pipe(rename(`${pkg.widgetName}Props.d.ts`))
        .pipe(gulp.dest(`./typings`));
}

const build = gulp.series(clean, generateTypings, checkDependencies, bundle, createMpkFile, copyToDeployment);

const productionBuild = gulp.series(clean, generateTypings, checkDependencies, productionBundle, createMpkFile, copyToDeployment);

function watch() {
    return gulp.watch("./src/**/*", { ignoreInitial: false }, build);
}

exports.default = watch;
exports.watch = watch;
exports.build = build;
exports.release = productionBuild;
