'use strict';
const logger = require('winston');

class LbryTrnsf {
  constructor(config) {
    logger.info('[LbryTrnsf] : Initializing Modules, booting the spaceship...');
    this.config = config;
    this.init(config);
  }

  init(config) {
    logger.debug('[LbryTrnsf] : Program is initialized!');
  }

  //Functions here...

}

module.exports = LbryTrnsf;