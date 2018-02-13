'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var videojs = _interopDefault(require('video.js'));

var version = "1.0.6";

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

    var clientTimestamp = Math.floor(Date.now() / 1000);
    var serverTimestamp = options.serverTimestamp;
    var clientServerTimeDifference = serverTimestamp ? clientTimestamp - serverTimestamp : 0;

    this.player = player;
    this.options = options;
    this.tnsTimer = null;
    this.clientServerTimeDifference = clientServerTimeDifference;
    this.currentTime = null;
  }

  /**
   * Returned valid fts value
   *
   * @function getValidFts
   *
   * @param {number}  currentTime
   *                  Current video content time in sec
   *
   * @param {number}  vts
   *                  Current user time in sec
   *
   * @param {number}  clientServerTimeDifference
   *                  Difference between client and server timestamp
   *
   * @param {boolean} live
   *                  true if video is LIVE or DVR
   *
   * @return {number} fts
   */


  HeartbeatTnsCounter.prototype.getValidFts = function getValidFts(currentTime, vts, clientServerTimeDifference, live) {
    var fts = currentTime;

    if (live) {
      if (fts < 0) {
        // DVR position
        fts = vts + fts - clientServerTimeDifference;
      } else {
        // live without DVR
        fts = vts - clientServerTimeDifference;
      }
    }

    return fts;
  };

  /**
   * Try to start counter
   *
   * @function requestTnsTimerStarting
   */


  HeartbeatTnsCounter.prototype.requestTnsTimerStarting = function requestTnsTimerStarting() {
    this.stopTNSTimer();
    this.startTNSTimer();
  };

  /**
   * Will start heartbeat TNS catalog counter timer
   *
   * @function startTNSTimer
   */


  HeartbeatTnsCounter.prototype.startTNSTimer = function startTNSTimer() {
    var _this = this;

    var TNSCatalogCounter = function TNSCatalogCounter() {

      var currentTime = Math.round(_this.player.currentTime());

      if (_this.currentTime !== null && _this.currentTime === currentTime) {
        return;
      }

      _this.currentTime = currentTime;

      var clientServerTimeDifference = _this.clientServerTimeDifference;
      var vts = Math.floor(Date.now() / 1000);
      var live = _this.options.live;
      var fts = _this.getValidFts(currentTime, vts, clientServerTimeDifference, live);

      var tnsParams = {
        catid: _this.options.catid,
        vcid: _this.options.vcid,
        vcver: _this.options.vcver,
        fts: fts,
        vts: vts,
        evtp: _this.options.live ? 1 : 2,
        dvtp: _this.options.dvtp,
        adid: _this.options.adid,
        advid: _this.options.advid,
        idfa: _this.options.idfa,
        dvid: _this.options.dvid,
        mac: _this.options.mac,
        app: _this.options.app
      };

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

    this.player.on('playing', function () {
      _this2.requestTnsTimerStarting();
    });

    this.player.on('ended', function () {
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

module.exports = heartbeatTnsCounter;
