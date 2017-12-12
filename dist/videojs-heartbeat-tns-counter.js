/**
 * videojs-heartbeat-tns-counter
 * @version 1.0.2
 * @copyright 2017 Sergey Gromkov <sgromkov@gmail.com>
 * @license MIT
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('video.js')) :
	typeof define === 'function' && define.amd ? define(['video.js'], factory) :
	(global.videojsHeartbeatTnsCounter = factory(global.videojs));
}(this, (function (videojs) { 'use strict';

videojs = videojs && videojs.hasOwnProperty('default') ? videojs['default'] : videojs;

var version = "1.0.2";

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();





var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

// Default options for the plugin.
var defaults = {
  catid: null,
  vcid: null,
  vcver: 0,
  fts: null,
  vts: null,
  evtp: null,
  dvtp: getDeviceType(),
  adid: null,
  advid: null,
  idfa: null,
  dvid: null,
  mac: null,
  app: null,
  TnsAccount: null,
  tmsec: null,
  interval: 30000,
  live: false,
  dvr: false,
  serverTimestamp: 0
};

// Cross-compatibility for Video.js 5 and 6.
var registerPlugin = videojs.registerPlugin || videojs.plugin;
// const dom = videojs.dom || videojs;

/**
 * Returned device type id for "dvtp" tns param.
 *
 * @function getDeviceType
 * @return {number}
 *          Device type id
 */
function getDeviceType() {
  if (navigator.userAgent.match(/Android( |%20)|iPhone|iPad|iPod|Tizen|Phone/i)) {
    if (navigator.userAgent.match(/iPhone|iPod|iPad/i)) {
      return 2;
    }

    if (navigator.userAgent.match(/Android/i)) {
      return 3;
    }

    if (navigator.userAgent.match(/Windows/i)) {
      return 4;
    }

    if (navigator.userAgent.match(/Tizen/i)) {
      return 7;
    }
  } else {
    return 1;
  }
}

/**
 * Class representing a heartbeat TNS counter plugin
 */

var HeartbeatTnsCounter = function () {
  /**
   * Plugin initialization
   *
   * @param    {Player} player
   *           A Video.js player object.
   *
   * @param    {Object} [options={}]
   *           A plain object containing options for the plugin.
   */
  function HeartbeatTnsCounter(player, options) {
    classCallCheck(this, HeartbeatTnsCounter);

    this.player = player;
    this.options = options;
    this.tnsTimer = null;
    this.clientServerTimeDifference = 0;
    this.allPrerollsEnded = false;
    this.prerollExists = false;

    var clientTimestamp = Math.floor(Date.now() / 1000);

    if (this.options.serverTimestamp) {
      this.clientServerTimeDifference = clientTimestamp - this.options.serverTimestamp;
    }
  }

  /**
   * Will start heartbeat TNS catalog counter timer
   *
   * @function startTNSTimer
   */


  HeartbeatTnsCounter.prototype.startTNSTimer = function startTNSTimer() {
    var _this = this;

    var TNSCatalogCounter = function TNSCatalogCounter() {
      var clientServerTimeDifference = _this.clientServerTimeDifference;
      var currentTime = _this.player.currentTime();

      var tnsParams = {
        catid: _this.options.catid,
        vcid: _this.options.vcid,
        vcver: _this.options.vcver,
        fts: Math.round(currentTime),
        vts: Math.floor(Date.now() / 1000),
        evtp: _this.options.live ? 1 : 2,
        dvtp: _this.options.dvtp,
        adid: _this.options.adid,
        advid: _this.options.advid,
        idfa: _this.options.idfa,
        dvid: _this.options.dvid,
        mac: _this.options.mac,
        app: _this.options.app
      };

      if (_this.options.live) {
        if (tnsParams.fts < 0) {
          // DVR position
          tnsParams.fts = tnsParams.vts + tnsParams.fts - clientServerTimeDifference;
        } else {
          // live without DVR
          tnsParams.fts = tnsParams.vts - clientServerTimeDifference;
        }
      }

      var tnsUrl = (document.location.protocol === 'https:' ? 'https://' : 'http://') + 'www.tns-counter.ru/V13a**';

      for (var key in tnsParams) {
        if (tnsParams.hasOwnProperty(key)) {
          if (tnsParams[key] !== null && tnsParams[key] !== '') {
            tnsUrl += key + ':' + tnsParams[key] + ':';
          }
        }
      }

      tnsUrl = tnsUrl.substr(0, tnsUrl.length - 1);
      tnsUrl += '**' + _this.options.TnsAccount + '/ru/UTF-8/tmsec=' + _this.options.tmsec + '/';

      // console.log(
      //   "video time: " + currentTime,
      //   "tnsParams:",
      //   tnsParams,
      //   tnsUrl
      // );

      new Image().src = tnsUrl;
    };

    this.tnsTimer = setInterval(TNSCatalogCounter, this.options.interval);
    TNSCatalogCounter();
  };

  /**
   * Will stop heartbeat TNS catalog counter timer
   *
   * @function stopTNSTimer
   */


  HeartbeatTnsCounter.prototype.stopTNSTimer = function stopTNSTimer() {
    clearInterval(this.tnsTimer);
  };

  /**
   * Function to invoke when the player is ready.
   *
   * When this function is called, the player
   * will have its DOM and child components in place.
   *
   * @function ready
   */


  HeartbeatTnsCounter.prototype.ready = function ready() {
    var _this2 = this;

    videojs.log('heartbeatTnsCounter Plugin ENABLED!', this.options);

    this.player.addClass('vjs-videojs-heartbeat-tns-counter');

    this.player.one('prerollExists', function () {
      // console.warn('Event: prerollExists');
      _this2.prerollExists = true;
    });

    this.player.one('allPrerollsEnded', function () {
      // console.warn('Event: allPrerollsEnded');
      _this2.allPrerollsEnded = true;

      // Если был показан преролл и это не прямая трансляция,
      // Перематываем плеер на начало, т.к. из-за прероллов кадры смещаются:
      if (_this2.prerollExists && !_this2.options.live) {
        _this2.player.pause();
        _this2.player.currentTime(0);
        _this2.player.play();
      }

      if (!_this2.tnsTimerStarted) {
        _this2.tnsTimerStarted = true;
        _this2.startTNSTimer();
      }
    });

    this.player.on('play', function () {
      // console.warn('Event: Play');
      if (_this2.allPrerollsEnded && !_this2.tnsTimerStarted) {
        _this2.tnsTimerStarted = true;
        _this2.startTNSTimer();
      }
    });
    this.player.on('pause', function () {
      // console.warn('Event: Pause');
      _this2.tnsTimerStarted = false;
      _this2.stopTNSTimer();
    });
    this.player.on('ended', function () {
      // console.warn('Event: Ended');
      _this2.tnsTimerStarted = false;
      _this2.stopTNSTimer();
    });
  };

  return HeartbeatTnsCounter;
}();

/**
 * A video.js plugin.
 *
 * In the plugin function, the value of `this` is a video.js `Player`
 * instance. You cannot rely on the player being in a "ready" state here,
 * depending on how the plugin is invoked. This may or may not be important
 * to you; if not, remove the wait for "ready"!
 *
 * @function heartbeatTnsCounter
 * @param    {Object} [options={}]
 *           An object of options left to the plugin author to define.
 */


var heartbeatTnsCounter = function heartbeatTnsCounter(options) {
  var counter = new HeartbeatTnsCounter(this, videojs.mergeOptions(defaults, options));

  counter.ready();
};

// Register the plugin with video.js.
registerPlugin('heartbeatTnsCounter', heartbeatTnsCounter);

// Include the version number.
heartbeatTnsCounter.VERSION = version;

return heartbeatTnsCounter;

})));
