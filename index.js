let Service, Characteristic
const packageJson = require('./package.json')
const request = require('request')

module.exports = function (homebridge) {
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory('homebridge-http-ipcamera-battery', 'iPCameraBattery', iPCameraBattery)
}

function iPCameraBattery (log, config) {
  this.log = log

  this.name = config.name
  this.apiroute = config.apiroute
  this.pollInterval = config.pollInterval || 300

  this.manufacturer = config.manufacturer || packageJson.author
  this.serial = config.serial || packageJson.version
  this.model = config.model || packageJson.name
  this.firmware = config.firmware || packageJson.version

  this.timeout = config.timeout || 3000

  this.service = new Service.BatteryLevel(this.name)
  
  this.BatteryLevel = 0
}

iPCameraBattery.prototype = {

  identify: function (callback) {
    this.log('Identify.')
    callback()
  },

  _httpRequest: function (url, callback) {
    request({
      url: url,
      body: null,
      method: 'GET',
      timeout: this.timeout
    },
    function (error, response, body) {
      callback(error, response, body)
    })
  },

  _getStatus: function (callback) {
    const url = this.apiroute + '/parameters'
    this.log.debug('Getting status: %s', url)

    this._httpRequest(url, function (error, response, responseBody) {
      if (error) {
        this.log.warn('Error getting status: %s', error.message)
        //this.service.getCharacteristic(Characteristic.BatteryLevel, this.BatteryLevel)
        this.BatteryLevel = 0
        callback(error)
      } else {
        this.log.debug('Device response: %s', responseBody)
        try {
          const json = JSON.parse(responseBody)
          //this.service.getCharacteristic(Characteristic.BatteryLevel).updateValue(json.BatteryLevel)
          var batteryString = ""
          batteryString = json.battery
          this.BatteryLevel = batteryString.replace(" %", "")
          this.log.debug('Updated BatteryLevel to: %s', this.BatteryLevel)
          callback()
        } catch (e) {
          this.log.warn('Error parsing status: %s', e.message)
        }
      }
    }.bind(this))
  },

  getServices: function () {
    this.informationService = new Service.AccessoryInformation()
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial)
      .setCharacteristic(Characteristic.FirmwareRevision, this.firmware)

    // Set the Battery Level
    this.service.setCharacteristic(Characteristic.BatteryLevel, this.BatteryLevel);
    // Set the Status Low Battery
    if(this.BatteryLevel <= 10) {
      this.service.setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
    }
    else {
      this.service.setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
    }

    this._getStatus(function () {})

    setInterval(function () {
      this._getStatus(function () {})
    }.bind(this), this.pollInterval * 1000)

    return [this.informationService, this.service]
  }
}
