import videojs from 'video.js';
import {version as VERSION} from '../package.json';

// Default options for the plugin.
const defaults = {
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
const registerPlugin = videojs.registerPlugin || videojs.plugin;
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
class HeartbeatTnsCounter {
  /**
   * Plugin initialization
   *
   * @param    {Player} player
   *           A Video.js player object.
   *
   * @param    {Object} [options={}]
   *           A plain object containing options for the plugin.
   */
  constructor(player, options) {
    this.player = player;
    this.options = options;
    this.tnsTimer = null;
    this.clientServerTimeDifference = 0;
    this.allPrerollsEnded = false;
    this.prerollExists = false;

    const clientTimestamp = Math.floor(Date.now() / 1000);

    if (this.options.serverTimestamp) {
      this.clientServerTimeDifference = clientTimestamp - this.options.serverTimestamp;
    }
  }

  /**
   * Will start heartbeat TNS catalog counter timer
   *
   * @function startTNSTimer
   */
  startTNSTimer() {
    const TNSCatalogCounter = () => {
      const clientServerTimeDifference = this.clientServerTimeDifference;
      const currentTime = this.player.currentTime();

      const tnsParams = {
        catid: this.options.catid,
        vcid: this.options.vcid,
        vcver: this.options.vcver,
        fts: Math.round(currentTime),
        vts: Math.floor(Date.now() / 1000),
        evtp: this.options.live ? 1 : 2,
        dvtp: this.options.dvtp,
        adid: this.options.adid,
        advid: this.options.advid,
        idfa: this.options.idfa,
        dvid: this.options.dvid,
        mac: this.options.mac,
        app: this.options.app
      };

      if (this.options.live) {
        if (tnsParams.fts < 0) {
          // DVR position
          tnsParams.fts = tnsParams.vts + tnsParams.fts - clientServerTimeDifference;
        } else {
          // live without DVR
          tnsParams.fts = tnsParams.vts - clientServerTimeDifference;
        }
      }

      let tnsUrl = (document.location.protocol === 'https:' ? 'https://' : 'http://') +
        'www.tns-counter.ru/V13a**';

      for (const key in tnsParams) {
        if (tnsParams.hasOwnProperty(key)) {
          if (tnsParams[key] !== null && tnsParams[key] !== '') {
            tnsUrl += key + ':' + tnsParams[key] + ':';
          }
        }
      }

      tnsUrl = tnsUrl.substr(0, tnsUrl.length - 1);
      tnsUrl += '**' + this.options.TnsAccount +
        '/ru/UTF-8/tmsec=' + this.options.tmsec + '/';

      // console.log(
      //   "video time: " + currentTime,
      //   "tnsParams:",
      //   tnsParams,
      //   tnsUrl
      // );

      (new Image()).src = tnsUrl;
    };

    this.tnsTimer = setInterval(TNSCatalogCounter, this.options.interval);
    TNSCatalogCounter();
  }

  /**
   * Will stop heartbeat TNS catalog counter timer
   *
   * @function stopTNSTimer
   */
  stopTNSTimer() {
    clearInterval(this.tnsTimer);
  }

  /**
   * Function to invoke when the player is ready.
   *
   * When this function is called, the player
   * will have its DOM and child components in place.
   *
   * @function ready
   */
  ready() {
    videojs.log('heartbeatTnsCounter Plugin ENABLED!', this.options);

    this.player.addClass('vjs-videojs-heartbeat-tns-counter');

    this.player.one('prerollExists', () => {
      // console.warn('Event: prerollExists');
      this.prerollExists = true;
    });

    this.player.one('allPrerollsEnded', () => {
      // console.warn('Event: allPrerollsEnded');
      this.allPrerollsEnded = true;

      // Если был показан преролл и это не прямая трансляция,
      // Перематываем плеер на начало, т.к. из-за прероллов кадры смещаются:
      if (this.prerollExists && !this.options.live) {
        this.player.pause();
        this.player.currentTime(0);
        this.player.play();
      }

      if (!this.tnsTimerStarted) {
        this.tnsTimerStarted = true;
        this.startTNSTimer();
      }
    });

    this.player.on('play', () => {
      // console.warn('Event: Play');
      if (this.allPrerollsEnded && !this.tnsTimerStarted) {
        this.tnsTimerStarted = true;
        this.startTNSTimer();
      }
    });
    this.player.on('pause', () => {
      // console.warn('Event: Pause');
      this.tnsTimerStarted = false;
      this.stopTNSTimer();
    });
    this.player.on('ended', () => {
      // console.warn('Event: Ended');
      this.tnsTimerStarted = false;
      this.stopTNSTimer();
    });
  }
}

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
const heartbeatTnsCounter = function(options) {
  const counter = new HeartbeatTnsCounter(this, videojs.mergeOptions(defaults, options));

  this.ready(() => {
    counter.ready();
  });
};

// Register the plugin with video.js.
registerPlugin('heartbeatTnsCounter', heartbeatTnsCounter);

// Include the version number.
heartbeatTnsCounter.VERSION = VERSION;

export default heartbeatTnsCounter;
