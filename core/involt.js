/*
		INVOLT FRAMEWORK CORE FILE
		Ernest Warzocha 2015
		involt.github.io
*/

//----------------------------------------------------------------------------------------------

//INVOLT SETTINGS

	/*
		CONNECTION
		Select connection type, only one can be defined at once.

		IMPORTANT:
		Serial and Bluetooth are used for Chrome App.
		isPhonegap is for mobile devices and uses BT low Energy only. Best used with Phonegap Build.
	*/
	var isSerial    = false;
	var isBluetooth = true;
	//var isPhonegap  = false; NOT AVALIABLE
	//var isOnline = false; NOT AVALIABLE
	/*
		LOADING SCREEN
		Set loaderOnLaunch to false and skip loading screen on every launch. 
		Remember to set default connection because it's not possible when app is running.
	*/
	var loaderOnLaunch = false;
	/*
		BLUETOOTH AND SERIAL DEFAULT CONNECTION
	*/
	var defaultSerialPort = "COM3";

	var defaultBtAddress = "98:D3:31:90:4C:66";
	var uuid = "00001101-0000-1000-8000-00805f9b34fb";
	var discoveryDuration = 10000;
	/*
		BITRATE
		The bitrate should remain unchanged. 
		If you have to lower the speed don't overload the port from arduino.
		Bitrate in software and hardware must be the same.
	*/
	var bitrate = 57600;
	/*
		RECEIVED VALUES UPDATE RATE
		Set update rate of read-only elements in miliseconds (lower value increases CPU usage).
	*/
	var updateRate = 50;
	/*
		DEBUG MODE
		Debug mode logs into console object data on send (buttons sends on click).
	*/
	var debugMode = true;

//----------------------------------------------------------------------------------------------

//Array of values stored for sending to device with Involt functions and HTML elements.
var digitalPins = [];
//Array of values received from device.
var analogPins = [];

//MAIN INVOLT OBJECT (COMMUNICATION BRIDGE)

var Involt =  function (){
	this.id = 0;
	this.devices = [];
	this.onSend =  function(){
		if(debugMode){
			involt.debug(digitalPins);
		};
		if (chrome.runtime.lastError) {
	    console.error("Send failed: " + chrome.runtime.lastError.message);
	  };
	};
	//arduinoSend is responsible for sending the data, involt.send is used to send as specified connection type.
	this.arduinoSend = function(pin, value){
		//convert pin and value to framework-friendly format
		var ardSend = pin+"V"+value+"\n";
		involt.send(ardSend);
	};
	this.arduinoFn = function(afn){
		var ardFN = "FN" + afn + "\n";
		involt.debug(ardFN);
		involt.send(ardFN);
	};
	this.defineElement = function(element){

		var $t = element;

		//read the classes of element and add them to object data
		var splitCss = $t.attr('class').split(' ');
		//index of the .ard class which defines Involt object
		var ardIndex = splitCss.indexOf("ard");

		//define arduino pin
		var pin       = splitCss[ardIndex+2];
		var pinNumber = parseInt(pin.substring(1,pin.length));
		$t.data("pin", pin).data("pinNumber", pinNumber);

		//define value parameter
		var value = splitCss[ardIndex+3];
		
		if (typeof value !== 'undefined') {
			//split if there are two values
			var valueSplit = value.split("-");
			//check if they are numbers and convert
			for (var i = 0; i < valueSplit.length; i++){
				var valueCheck = isNaN(valueSplit[i]);
				if (valueCheck == false) {
					valueSplit[i] = parseInt(valueSplit[i]);
				};
			};

			$t.data("value", valueSplit[0]);

			if (valueSplit.length > 1){
				$t.data("value2", valueSplit[1]);
			};
		};
		
		//html string attribute instead of sending string as value
		if($t.attr('string') !== 'undefined'){
			$t.data('value', $t.attr('string'));
		};

		//check if there is a function to send
		if($t.attr('fn') !== 'undefined'){
			$t.data('fn', $t.attr('fn'));
		};

		//add values to array
		if (pin.indexOf("A")<0){
			//define default value for digital pins
			digitalPins[pinNumber] = $t.data("value");
		}
		else if (pin.indexOf("A") == 0){
			//define analog pins variables
			analogPins[pinNumber] = pinNumber;
		};

		//find the range and step parameters and add them to data
		for (var i = 0; i < splitCss.length; i++) {

			if (splitCss[i].indexOf("range-") == 0) {
				var range = splitCss[i].split('-');
					$t.data('min', parseInt(range[1])).data('max', parseInt(range[2]));
			}

			else if (splitCss[i].indexOf("step-") == 0) {
				var step = splitCss[i].split('-');
					$t.data('step', parseInt(step[1]));
			};

		};

		//define default parameters
		if($t.hasClass("rangeslider") || $t.hasClass("knob-send") || $t.hasClass("increase") || $t.hasClass("decrease")){
			if(typeof $t.data("min") === 'undefined'){
				$t.data("min", 0);
			};
			if(typeof $t.data("max") === 'undefined'){
				$t.data("max", 255);
			};
			if(typeof $t.data("step") === 'undefined'){
				$t.data("step", 1);
			};
			if(typeof $t.data("value") === 'undefined'){
				$t.data("value", 0);
					digitalPins[pinNumber] = $t.data("value");
			};
		};

		//log the data on debug
		involt.debug($t.data());

	};
	this.onReceiveParse = function(encodedString){
		var Atest = encodedString.indexOf("A");
		var Btest = encodedString.indexOf("E");
		var Ctest = encodedString.indexOf("V");
		var Dtest = encodedString.length;

		/*
			Example block of encoded data (Pin A3 value 872):
			A3V872E
		*/

		//corrupted serial data parameters (Based on my observations)
		//remove corrupted serial data from array list
		if (  Atest == 0 && 
					Btest >= 2 && 
					Ctest >= 1 && 
					Dtest >= 4    ) {
			
			//pin counter
			var i = parseInt(encodedString.substring(1,Ctest));

			var stringValue = encodedString.substring(Ctest+1,Btest);
			var stringValueCheck = isNaN(stringValue);

			//count each analog pin number and create array of their values
			if (stringValueCheck == false){
				analogPins[i] = parseInt(stringValue);  
			}
			else {
				analogPins[i] = stringValue; 
			};

		};
	};
	this.sendConvertString = function(ardSend){

		var buf      = new ArrayBuffer(ardSend.length);
		var bufView  = new Uint8Array(buf);

		for (var i   = 0; i < ardSend.length; i++) {
			bufView[i] = ardSend.charCodeAt(i);
		};

		return buf;

	};
	this.receiveConvertString = function(receiveInfo){

		var Int8View  = new Int8Array(receiveInfo.data);
		encodedString = String.fromCharCode.apply(null, Int8View);

		return encodedString;

	};
	this.debug = function(data){
		if(debugMode){
			console.log(data);
		};
	};
};

//----------------------------------------------------------------------------------------------

//CONNECTION FUNCTIONS

//SERIAL CONNECTION

if (isSerial){

	Involt.prototype.getDevices = function(){
		var onGetDevices = function(ports){
			console.log("Available port list:");
			for (var j=0; j<ports.length; j++) {
				involt.devices[j] = ports[j].path;
				$(".loader-ports").append('<p>'+involt.devices[j]+'</p>');
				$(".loader-ports > p").click(function() {
					$(".loader-ports > p").removeClass("active-port");
					$(this).addClass("active-port");
						defaultSerialPort = $(this).html();
				});
				console.log(involt.devices[j]);
			};
		};

		chrome.serial.getDevices(onGetDevices);

	};

	Involt.prototype.connect = function(port, speed){
		var onConnect = function(connectionInfo){
			if (!connectionInfo) {
				console.error('Could not open, check if Arduino is connected, try other serial port or relaunch Chrome.');
				$("body").append('<div id="loader-error">Could not open, check if device is connected, try other serial port or relaunch Chrome.</div>');
				$("#loader-error").delay(2500).fadeOut('slow');
				return;
			}
			//Remove loader if connection is successful + hack for knob and slider
			else {
				$("#loader-bg, #loader-error").remove();
				$(".knob, .knob-send, .rangeslider").show();
			};

			console.log("Device connected:", defaultSerialPort);

			console.log("Involt connection ID:", connectionInfo.connectionId);

			involt.id = connectionInfo.connectionId;

		};
		//check if there is existing connection from previous session and disconnect (fixes reconnecting problems)
		var checkConnections = function(connectionInfo){
			if(connectionInfo){
				for(var k=0; k<connectionInfo.length; k++){
					involt.disconnect(connectionInfo[k].connectionId);
					involt.debug(connectionInfo[k]);
				};
			}
			//connect to selected port
			chrome.serial.connect(port, {bitrate: speed}, onConnect);
			
		};

		chrome.serial.getConnections(checkConnections);

	};

	Involt.prototype.disconnect = function(id){
		var onDisconnect = function(){
			console.log("disconnected from previous session (id:"+id+")");
		}

		chrome.serial.disconnect(id, onDisconnect)

	};

	Involt.prototype.send = function(sendString){

		involt.debug(sendString);

		chrome.serial.send(involt.id, involt.sendConvertString(sendString), involt.onSend);

	};

	Involt.prototype.receive = function(){
		var onReceive = function(receiveInfo) {

			if (receiveInfo.connectionId !== involt.id) return;

			var encodedString = involt.receiveConvertString(receiveInfo);

			involt.onReceiveParse(encodedString);

		};

		var onError = function (errorInfo) {
			console.error("Received error on serial connection: " + errorInfo.error);
		};

		chrome.serial.onReceive.addListener(onReceive);

		chrome.serial.onReceiveError.addListener(onError);

	};

	Involt.prototype.createLoader = function(){
		
			$(function() {
				$("body").prepend('<div id="loader-bg"><div id="loader"></div></div>');
				$("#loader").append('<div id="loader-logo"><img src="img/logo.png" alt="" /></div><div>Please select your device:</div><div class="loader-ports"></div><div id="loader-button">Connect</div>');
			
				$("#loader-button").click(function() {
					involt.connect(defaultSerialPort, bitrate);
				});
			});

	};

};

//----------------------------------------------------------------------------------------------

//BLUETOOTH CONNECTION

else if (isBluetooth){

	Involt.prototype.getDevices = function(){

		var adapterOn;

		var adapterOnLaunch = function(adapter) {
			adapterOn = adapter.available;
			if(adapterOn){
				console.log("Involt for Classic Bluetooth is running")
				console.log("Adapter " + adapter.address + ": " + adapter.name);
			}
			else{
				console.error("Bluetooth adapter is OFF. Turn ON bluetooth in your computer.")
			};
		}

		//Check if there is adapter turned ON on startup.
		chrome.bluetooth.getAdapterState(adapterOnLaunch);

		var adapterChange = function(adapter) {
			if(adapterOn != adapter.available){
				adapterOn = adapter.available;
				if(adapterOn){
					console.log("Bluetooth adapter is ON");
					console.log("Adapter " + adapter.address + ": " + adapter.name);
				}
				else{
					console.log("Bluetooth adapter is OFF");
				};
			};
		};

		//Check if adapter state is changed
		chrome.bluetooth.onAdapterStateChanged.addListener(adapterChange);

		var newDevice = function(device){
			console.log("New device found: " + device.address);
			involt.devices[device.name] = device;
			console.log(involt.devices);
		};
		var removeDevice = function(device){
			console.log("Device lost: " + device.address);
			delete involt.devices[device.name];
		};

		//Update the device list
		chrome.bluetooth.onDeviceAdded.addListener(newDevice);
		chrome.bluetooth.onDeviceChanged.addListener(newDevice);
		chrome.bluetooth.onDeviceRemoved.addListener(removeDevice);

		var bluetoothDevices = function(devices){
			console.log("Available devices:")
		  for (var i = 0; i < devices.length; i++) {
		  	involt.devices[devices[i].name] = devices[i];
		    console.log(devices[i].name, devices[i]);
		  };
		};

		chrome.bluetooth.getDevices(bluetoothDevices);

	};

	Involt.prototype.btDiscovery = function(duration){
		chrome.bluetooth.startDiscovery(function() {

			console.log("Start discovery");

		  // Stop discovery after 30 seconds.
		  setTimeout(function() {

		    chrome.bluetooth.stopDiscovery(function() {
		    	console.log("Discovery stopped");  	

		    	if(!loaderOnLaunch){
						involt.connect(defaultBtAddress, uuid);
					};

		    });

		  }, duration);

		});
	};

	Involt.prototype.connect = function(address, uuid){

		var onConnect = function() {
			if (chrome.runtime.lastError) {
				console.error("Connection failed: " + chrome.runtime.lastError.message);
			} 
			else {
				console.log("Connection established");
			}
		};

		var onCreate = function(createInfo){

			chrome.bluetoothSocket.connect(createInfo.socketId, defaultBtAddress, uuid, onConnect);
			involt.Id = createInfo.socketId;
		
		};

		chrome.bluetoothSocket.create(onCreate);

	};

	Involt.prototype.send = function(sendString){

		involt.debug(sendString);

		chrome.bluetoothSocket.send(involt.id, involt.sendConvertString(sendString), involt.onSend);

	};

	Involt.prototype.receive = function(){

		var onReceive = function(receiveInfo) {
	  	if (receiveInfo.socketId !== involt.Id) return;

	  	var encodedString = involt.receiveConvertString(receiveInfo);

			involt.onReceiveParse(encodedString);

		};

		var onError = function (errorInfo) {
			console.error("Received error on serial connection: " + errorInfo.error);
		};

		chrome.bluetoothSocket.onRecieve.addListener(onReceive);

		chrome.bluetoothSocket.onReceiveError.addListener(onError);

	};

	Involt.prototype.createLoader = function(){

	};

};

//----------------------------------------------------------------------------------------------

//INVOLT JQUERY METHODS

(function($) {

	$.fn.sendFn = function(name) {

		return this.each(function() {
			var $t = $(this);
			if (typeof name === 'undefined'){
				if (typeof $t.data('fn') !== 'undefined'){
					involt.arduinoFn($t.data('fn'));
				};
			}
			else{
				involt.arduinoFn(name);
			};
		});

	};
	
	$.fn.sendValue = function(value){

		return this.each(function() {
			var $t = $(this);
			if (typeof value === 'undefined') {
				involt.arduinoSend($t.data("pin"), digitalPins[$t.data("pinNumber")]);
			}
			else{
				involt.arduinoSend($t.data("pin"), value);
			};
			$t.not('.knob-send').not('.rangeslider').sendFn();
		});

	};

	$.fn.updateValue = function(newValue){

		return this.each(function() {
			var $t = $(this);
			if (typeof newValue === 'undefined') {
				digitalPins[$t.data("pinNumber")] = $t.data("value");
			}
			else{
				var valueCheck = isNaN(newValue);
				if(valueCheck == false) parseInt(newValue);
					digitalPins[$t.data("pinNumber")] = newValue;
					if (typeof $t.data("value2") === 'undefined') {
						$t.data("value", newValue);
					};       
			};
		});

	};

	$.fn.sendString = function(string){

		var directSend = string+"\n";
			involt.send(directSend);
				return this;

	};

	$.fn.pinDefine = function(pin){

		return this.each(function() {

			$(this).data("pin", pin).data("pinNumber", parseInt(pin.substring(1,pin.length)));

		});

	};

	$.fn.pinSwap = function(newPin){

		return this.each(function() {

			var $t = $(this);
			var previousPin = $t.data("pinNumber");

			$t.data("pin", newPin);
			$t.data("pinNumber", parseInt(newPin.substring(1,newPin.length)));

			//check if the new pin value is defined - if not - put the previous value
			if (typeof digitalPins[$t.data("pinNumber")] == 'undefined') {
				digitalPins[$t.data("pinNumber")] = digitalPins[previousPin];
			};

		});

	};

}(jQuery));

//----------------------------------------------------------------------------------------------

//CREATE INVOLT APP

var involt = new Involt();

//IDENTIFY INVOLT OBJECTS AND DEFINE THEIR PARAMETERS

$(document).ready(function() {

	//hack for UI elements that somehow shows on loader background
	$(".knob, .knob-send, .rangeslider").hide();

	//check css classes and define framework elements
	$(".ard").not(".custom-write").each(function(index, el) {
		involt.defineElement($(this));
	});
	
});

//GET DEVICES AND THEIR STATE
//For bluetooth: getDevices also updates device/adapter status.
involt.getDevices();
//search for devices on startup
if (isBluetooth){
	involt.btDiscovery(discoveryDuration);
};

//CREATE LOADER TO CONNECT WITH BUTTON OR CONNECT DIRECTLY
if (loaderOnLaunch){
	involt.createLoader();
	//involt.createLoader(involt.devices);
}
else {
	//For bluetooth: connection without launcher is right after btDiscovery
	if(isSerial){
		involt.connect(defaultSerialPort, bitrate);
	};
};

//DATA RECEIVE AND VALUE UPDATE
if(involt.id !== 0){
	involt.receive();
};