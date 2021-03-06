var fs = require("fs");
var path = require("path");
var util = require("util");
var _ = require("lodash");
var logger = require("./logger");
var prependFile = require('prepend-file');

var SELEMIUM_VER_STR_TMPLT = "./node_modules/selenium-server/lib/runner/selenium-server-standalone-%s.jar"
var CHROMEDRIVER_LOCATION = "./node_modules/chromedriver/lib/chromedriver/chromedriver";
var PHANTOMJS_LOCATION = "./node_modules/phantomjs/bin/phantomjs";
// throws file read/write exceptions, JSON parse exceptions
module.exports = function (sourceConfigPath, tempAssetPath, options) {
  var currentPath = process.cwd();
  var conf = require(path.resolve(currentPath + '/' + sourceConfigPath));
  var newSourceConfigPath = path.basename(sourceConfigPath);

  if (options.syncBrowsers) {
    if (!conf.test_settings.default.globals) {
      conf.test_settings.default.globals = {};
    }
    conf.test_settings.default.globals.syncModeBrowserList = options.syncBrowsers.split(",");
  }

  if (options.localSeleniumPort) {
    // Local-testing selenium port (non-sauce)
    // Tell nightwatch to both start and connect to a selenium server on port {seleniumPort}
    conf.selenium.port = options.localSeleniumPort;
    conf.test_settings.default.selenium_port = options.localSeleniumPort;

    if (options.localSeleniumVersion) {
      conf.selenium.server_path = util.format(SELEMIUM_VER_STR_TMPLT, options.localSeleniumVersion);
    }
  }

  if (options.isChromedriverPresent) {
    // append chrome driver location if user specifies chromedriver in conf to use
    if (!conf.selenium.cli_args) {
      // create structure if not defined
      conf.selenium.cli_args = {};
    }

    if (!conf.selenium.cli_args["webdriver.chrome.driver"]) {
      // don't overwrite user value
      conf.selenium.cli_args["webdriver.chrome.driver"] = CHROMEDRIVER_LOCATION;
    }
  }

  if (options.isPhantomjsPresent) {
    // append phantomjs location if user specifies phantomjs in conf to use 
    if (!conf.test_settings.phantomjs) {
      // create structure if not defined
      conf.test_settings.phantomjs = {
        desiredCapabilities: {
          browserName: "phantomjs"
        }
      };
    }
    if (!conf.test_settings.phantomjs.desiredCapabilities["phantomjs.binary.path"]) {
      // don't overwrite user value
      conf.test_settings.phantomjs.desiredCapabilities["phantomjs.binary.path"] = PHANTOMJS_LOCATION;
    }
  }

  var confClone = _.cloneDeep(conf);
  if(options.repetition > 0) {
    confClone.output_folder = confClone.output_folder + '/Run-' + (options.repetition + 1);
  }
  _.merge(confClone.test_settings[options.executor], options.executorCapabilities);
  // Write all the above details to a temporary config file, then return the temporary filename
  var tempConfigPath = path.resolve(tempAssetPath + '/' + newSourceConfigPath);
  fs.writeFileSync(tempConfigPath, JSON.stringify(confClone), "utf8");

  if (path.extname(tempConfigPath) === '.js') {
    try {
      prependFile.sync(tempConfigPath, 'module.exports = ');
      logger.log('Convert to .js format if the orginal nightwatch config is .js format.');
    } catch (err) {
      throw new Error("Cannot convert nightwatch config to .js file: " + err.toString());
    }
  }

  return tempConfigPath;
};
