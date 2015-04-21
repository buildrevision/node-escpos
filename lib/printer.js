var usb    = require('usb'),
	 	util   = require('util'),
		events = require('events');


/**
 * Creates a new Printer object that is ready to connect to an attached USB escpos printer.
 *
 * You can get the vendorId and productId by issuing this command on the command line:
 * `lsusb`
 *
 * You can get the usbEndpoint by issuing this command on the command line:
 * `sudo lsusb -vvv -d ****:**** | grep bEndpointAddress | grep OUT`
 *
 * @class
 * @property {number} [vendorId=0x04b8] The USB Vendor ID of the printer to connect to.
 * @property {number} [productId=0x0202] The USB Product ID of the printer to connect to.
 * @property {number} [usbEndpoint=1] The output USB Endpoint Index of the printer to connect to.
 */
var Printer = function (vendorId, productId, usbEndpoint) {

	this.vendorId = vendorId || 0x04b8;
	this.productId = productId || 0x0202;
	this.usbEndpoint = usbEndpoint || 1;

	this._device = undefined;

}


// Inherit from EventEmitter
util.inherits(Printer, events.EventEmitter);


/**
  * Establish a connection with the printer.
  * Printer must be connected before issuing any print or disconnect commands.
  *
  * @param {number} [vendorId=0x04b8] The USB Vendor ID of the printer to connect to.
  * @param {number} [productId=0x0202] The USB Product ID of the printer to connect to.
  * @param {number} [usbEndpoint=1] The output USB Endpoint Index of the printer to connect to.
  */
Printer.prototype.connect = function (vendorId, productId, usbEndpoint, callback) {

	vendorId = vendorId || this.vendorId;
	productId = productId || this.productId;
	usbEndpoint = usbEndpoint || this.usbEndpoint

	var device = usb.findByIds(vendorId, productId);

	device.open();

	var iface = device.interface(this.userEndpoint);

	if (iface.isKernelDriverActive()) {
		iface.detachKernelDriver();
	}

	iface.claim();

	this._device = device;

	if (callback)
		callback();

	this.emit('connect');

}

/**
  * Disconnect from a printer.
  * Printer must be connected before calling disconnect.
  */
Printer.prototype.disconnect = function (callback) {

	var self = this;

	callback = callback || function () {}

	self._device.interfaces[0].release(function (error) {

		if (error) {

			if (callback)
				callback(error)

			self.emit('error', error);

		}

		else {

			self._device.interfaces[0].attachKernelDriver();

			self._device.close();

			self._device = undefined;

			if (callback)
				callback()

			self.emit('disconnect');

		}

	});

}


/**
  * Execute a printjob using a connected printer.
  * Printer must be connected before attempting a print.
  *
  * @param {Printjob} printjob Printjob to be executed by this printer.
  */
Printer.prototype.print = function (printjob, callback) {

	var printer 	= this._device.interfaces[0].endpoint( this.usbEndpoint ),
			printData = printjob.printData(),
			self 			= this;

	printer.transfer(printData, function() {

		if (callback)
			callback()

		self.emit('print');

	});

}


module.exports = Printer;
