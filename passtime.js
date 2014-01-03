/*
 Copyright 2014 Marcus Aspin
 http://github.com/marcusaspin

 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
window["passtime"] = {
/* Options */
    "characterSet" : "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()",
    "passwordLength" : 8,
    "minInputLength" : 5,   // Must be greater than passwordLength/2 to create enough user-generated entropy
    "attr" : "data-passtime-target-id",
/*---------*/

    "Control" : function(generator, target){
        this.generator = generator;
        this.target = target;
        this._timings = [];
        this._time = 0;

        passtime._addEvent(generator, "keydown", this._gKeyUpDown, this);
        passtime._addEvent(generator, "keyup", this._gKeyUpDown, this);
        passtime._controls.push(this);
    },
    _controls : [],
    /**
     * Initial setup
     * @private
     */
    _init : function(){
        // Minimum input length must be > half the password length
        passtime.minInputLength = Math.max(passtime.minInputLength, Math.floor(passtime.passwordLength / 2) + 1);

        // Create Control objects for the elements with the required data attribute
        var els = passtime._getElements();
        for(var i = 0; i < els.length; i++){
            if(els[i][0].getAttribute(passtime.attr) != null) new passtime.Control(els[i][0], els[i][1]);
        }
    },
    /**
     * Generate a password using the characters in the characterSet
     * @param {Array} seeds Random array to be used
     * @returns {string} password
     * @private
     */
    _generatePassword : function(seeds){
        var pass = "";

        // Normalize seed array length
        var pl = passtime.passwordLength,
            sl = seeds.length;
        if(sl < pl) return "";
        var minGroupSize = Math.floor(sl/pl),
            groups = [];
        // Group together into arrays of equal length
        for(var i = 0; i < pl; i++){
            groups.push(seeds.slice(i*minGroupSize, (i + 1)*minGroupSize));
        }
        // Add leftovers evenly
        if(sl%pl !== 0){
            for(i = 0; i < (sl%pl); i++){
                groups[Math.floor(i*pl/(sl%pl))].push(seeds[sl - (sl%pl) + i]);
            }
        }

        // Get mean value for each group
        var sum;
        for(i = 0; i < groups.length; i++){
            sum = 0;
            for(var j = 0; j < groups[i].length; j++){
                sum += groups[i][j]
            }
            groups[i] = sum/groups[i].length;
        }

        // Get characters by generating a random character based on each groups mean value
        var pool = passtime.characterSet.split(""),
            poolLength = pool.length,
            seed, rand, character;
        // RNG parameters (from http://en.wikipedia.org/wiki/Numerical_Recipes)
        var m = 4294967296,
            a = 1664525,    // a - 1 should be divisible by m's prime factors
            c = 1013904223, z; // c and m should be co-prime
        for(i = 0; i < groups.length; i++){
            seed = z = groups[i];

            // Create randomness using a modified linear congruential generator
            for(j = 0; j < groups[(a * i + c) % groups.length]; j++){
                z = (a * z + c) % m;
            }
            rand = z / m;

            // Get character from random number
            character = pool[Math.floor(rand*poolLength)];
            pass += character;
        }

        return pass;
    },
    /**
     * Get an array of all elements on the page with the required data attribute
     * @return {Array}
     * @private
     */
    _getElements : function(){
        for(var els = document.all, i = 0, c = [], l = els.length, target; i < l; i++){
            target = els[i].getAttribute(passtime.attr);
            if(target != null && document.getElementById(target)){
                c.push([els[i], document.getElementById(target)]);
            }
        }
        return c
    },
    /**
     * Quick shim for addEventListener
     * @param el        Element
     * @param evt       Event (eg. "click")
     * @param handler   Function
     * @param ctx       Context to run the function in (ie. 'this')
     * @private
     */
    _addEvent : function(el, evt, handler, ctx){
        if(el.addEventListener){
            el.addEventListener(evt, function(){ handler.apply(ctx, arguments) });
        } else {
            el.attachEvent("on"+evt, function(){ handler.apply(ctx, arguments) });
        }
    }
};
/**
 * Log timing between last keyup/down and now
 */
passtime.Control.prototype._gKeyUpDown = function(){
    // Add new timing
    var time = (new Date()).getTime();
    if(this._time > 0 && time - this._time > 0){
        this._timings.push(time - this._time);
    }
    this._time = (new Date()).getTime();

    if(this.generator.value.length < passtime.minInputLength){
        if(this.target.value.length > 0){
            // User has cleared input field, reset data
            this._time = 0;
            this._timings = [];
            this.target.value = "";
        }
    } else if(this._timings.length >= passtime.passwordLength){
        // Generate password
        this.target.value = passtime._generatePassword(this._timings);
    }
};

if(document.addEventListener){
    document.addEventListener("DOMContentLoaded", passtime._init);
} else {
    document.attachEvent("onreadystatechange", passtime._init);
}