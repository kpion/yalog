/*
 * YaLog - colorful logger, featuring cloning and huskies: https://github.com/kpion/yalog
 */
(function (global) {
    'use strict';
    class YaLog {

        /*
         @param something can be null, style object (like {color:'blue'}) or another YaLog instance (we'll copy its style)
         @param name  - just a name for this logger instance, useful with the 'formatter' plugin
         @param params: {
         name: optional, name of this logger
         addDefaultPlugins: true,
         addDefaultCss: true,
         outputName: true, //only if 'name' provided
         css: {style properties collection}
         plugins: {
         pluginName: {pluginParams}
         },
         example:
         params: {
         addDefaultPlugins: true,
         //.....
         css: {
         .alarm: //
         {
         'color':'#c00';
         'font-size': '150%'
         }
         }
         plugins: {
         filter: {level:'error'}//will load the predefined 'filter' plugin with options level:'error'
         }            
         }   
         */
        constructor(something = null, name = '', params = {}) {
            this._name = name;
            this._style = {};
            this._css = {};//actually, these are named properties collections , like 'h1' : {'font-size':'120%','color':'blue';}
            this.plugins = [];
            this._parent = null;//only if created basing on another logger instance

            let isCloning = something instanceof YaLog;
            //
            //cloning
            //if(false)
            if (isCloning) {
                //Object.assign(this, something);
                this._parent = something;//not used as of yet
                this._style = JSON.parse(JSON.stringify(this._parent._style));
                this._css = JSON.parse(JSON.stringify(this._parent._css));
                Object.assign(this.plugins, this._parent.plugins);
                this._params = Object.assign({}, this._parent._params, params);
                if (name) {//overwriting
                    this._name = name;
                } else {
                    this._name = this._parent._name;
                }
            }

            //only if vanillia instance. Including the very first instance. Often being the 'parent' node of 
            //all instances.
            //adding default plugins, like 'style'. Every instance can have its own plugins
            //adding some css
            //if we are instantiating basing on another YaLog, we don't want to do that.
            if (!isCloning) {
                this._internalLog = [];
                this._params = JSON.parse(JSON.stringify(params));
                if (params.addDefaultPlugins !== false) {
                    this.addPlugin('style');//we  always add it
                }
                if (params.addDefaultCss !== false) {
                    this._css = {
                        h1: {'font-size': '150%', 'font-weight': 'bold'},
                        h2: {'font-size': '130%', 'font-weight': 'bold'},
                        h3: {'font-size': '110%', 'font-weight': 'bold'},
                        h4: {'font-weight': 'bold'},

                        b: {'font-weight': 'bold'},
                        i: {'font-style': 'italic'},
                        u: {'text-decoration': 'underline'},

                        indent: {'margin-left': '3%'}
                    };
                }
            }

            if (something && !isCloning && typeof something === 'object') {
                this._style = something;
            }

            if (typeof params.plugins !== 'undefined') {
                this.addPlugins(params.plugins);
            }

        }

        /*
         clones current instance (creates a new one basing on current one)
         */
        clone(name, params) {
            return new YaLog(this, name, params);
        }

        /*
         same as new (YaLog) creates a new instance of YaLog. If no params provided, this will be a fresh non styled YaLog instance. 
         @param something - same thing as in constructor above.
         */
        make(something = null, name = '', params = {}) {
            return new YaLog(something, name, params);
        }

        ////////////////////////////////////////////////////////////////////
        //Stuff related to 'style'.

        //sets style on THIS instance
        setStyle(style, merge = true) {
            if (typeof style === 'string') {
                style = this.parseStyle(style);
            }
            if (merge) {
                Object.assign(this._style, JSON.parse(JSON.stringify(style)));
            } else {
                this._style = style;
            }
            return this;
        }

        /*
         clears the style
         */
        clearStyle() {
            this._style = {};
            return this;
        }

        /*
         * creates a new instance with given style
         */
        style(style, merge = true) {
            let clone = this.clone();
            return clone.setStyle(style, merge);
            //return this.clone().setStyle(style);
        }

        /*
         * gets or *adds* a css rule.
         * @param {string} selector - example: {'h1': {'font-size:120%'},'h2': {'font-size:110%'}} 
         * p.s. term "selector" is used because "class" is a reserved keyword in js
         */
        cssSelector(selector, style /*= undefined*/) {
            //reading:
            if (typeof selector === 'string' && typeof style === 'undefined') {
                if (selector.indexOf(' ') !== -1) {//many selectors' styles to read
                    let resultStyle = {};
                    selector.split(' ').forEach(selectorName => {
                        Object.assign(resultStyle, this._css[selectorName]);
                    });
                    return resultStyle;
                }
                return this._css[selector];

            }
            //writing (adding):
            //obj: e.g. {h1: {...style...}, h2: {...style...}}
            if (typeof selector === 'object') {
                Object.keys(selector).forEach(selectorName => {
                    this.cssSelector(selectorName, selector[selectorName]);
                });
            } else {
                //selector is string, so we expect that there will also be a `style`, as an object, or string
                if (!this._css[selector]) {
                    this._css[selector] = {};
                }
                if (typeof style === 'string') {
                    style = this.parseStyle(style);
                }
                Object.assign(this._css[selector], style);
            }
            return this;
        }

        /*
         * returns a new instance of logger, setting its style to the one specified by selector(s) 
         */
        css(selectors) {
            let style = this.cssSelector(selectors);
            return this.style(style, true);
        }

        /*
         * similary to setStyle, this one sets the style taken from css rules on  THIS instance
         */
        setCss(selectors) {
            return this.setStyle(this.cssSelector(selectors));
        }
        /////////
        ///////////////////////////////////////////////////////////
        //other

        /**
         * @param {bool} ouputName if true, the name of the message will be prefixed with the name of the logger, 
         * if null - the behaviour will not change.
         */
        name(name, outputName = null) {
            if (typeof name === 'undefined') {
                return this._name;
            }
            this._name = name;
            if (outputName !== null) {
                this._params.outputName = outputName;
            }
            return this;
        }

        ///////////////////////////////////////////////////////////////////
        //plugins

        /*
         * returns an active plugin or null.
         * or, sets its params. 
         * Examples:
         * yalog.plugin('test',{param1: 'changed param'});
         */
        plugin(name, params /*=undefined*/) {
            let index = this.findPlugin(this.plugins, name);
            if (index === -1) {
                return null;
            }
            if (typeof params === 'undefined') {
                return this.plugins[index];
            }
            //changing params:
            Object.assign(this.plugins[index].params, params);
            return this.plugins[index];
        }

        /*
         @param nameOrPlugin - one of the available plugins in YaLog.prototype.pluginStore 
         or your own plugin object
         
         @param {params} - this will be passed to the plugin and is plugin dependant
         */
        addPlugin(nameOrPlugin, params = {}){
            let plugin = null;
            if (typeof nameOrPlugin === 'object') {
                plugin = nameOrPlugin;
            } else {//it's in the pluginStore
                let pluginIndex = this.findPlugin(this.pluginStore, nameOrPlugin);
                console.assert(pluginIndex !== -1, `"${nameOrPlugin}" plugin not found`);
                plugin = this.pluginStore[pluginIndex];
            }

            //merging user params with plugins default params: 
            if (typeof plugin.params === 'undefined') {
                plugin.params = {};
            }
            plugin.params = Object.assign({}, plugin.params, params);
            //replace if exists

            let exists = this.findPlugin(this.plugins, plugin.name);
            if (exists !== -1) {
                //@todo maybe we should make a copy:
                this.plugins[exists] = plugin;
                return this;
            }
            //If there is the `init` method:
            if(typeof plugin.init === 'function'){
                plugin.init(this);
            }
            //insert at start, we really want the 'style' plugin to be the last one. It changes .message to an array
            this.plugins.unshift(plugin);
            return this;
        }
        /*
         * adding multiple plugins, both predefined and user, see @addPlugin
         * @param {object} plugins, like:
         *  {   //predefined:
         filter: {level:'error'},//will load the predefined 'filter' plugin with options level:'error'
         //user:
         userDefined: {
         run: (yalog, data) => {}
         }
         }         
         * 
         */
        addPlugins(plugins) {
            Object.keys(plugins).forEach((name, index) => {
                let plugin = plugins[name];

                if (typeof plugin.run === 'function') {
                    //this isn't a predefined plugin, it's a user-defined one. Duck typing.
                    if (!plugin.name) {//if user forgot that
                        plugin.name = name;
                    }
                    this.addPlugin(plugin);
                } else {
                    this.addPlugin(name, plugin);
                }
            });
            return this;
        }

        /*
         * internal, creates an object with log entry data for the purpose of plugins or saving to prototype._story
         */
        getEntryData(method, message = null) {
            let now = new Date();
            let stack = {};
            try
            {
                let stackStr = new Error().stack;
                stack = this.parseStack(stackStr);
                if (stack) {
                    stack = stack.slice(4, stack.length);//remoing stack related to yalog.js
                }
            } catch (cerror) {
                //console.error(cerror);
                //we do nothing about it.
            }
            return {
                'name': this.name(),
                'method': method,
                'message': message,
                'dateObject': now,
                'time': this.formatTime(now), //string time, like '02:01:59'
                //useful only for plugins:
                'continue': true, //only for plugins
                'style': JSON.parse(JSON.stringify(this._style)), //it's here as a copy, so plugins can change that. 
                'stack': stack,
                'caller': stack[0] || {}, //it's just the first element in 'stack' - i.e. the place yalog... was actually called.
            };
        }

        /*
         * allows plugin to modify given entryData
         * @param {object} entryData - data returned by this.getEntryData - contains stuff like 'message', 'method', 'style' etc
         * @returns modified entryData
         */
        processPlugins(entryData) {
            entryData = JSON.parse(JSON.stringify(entryData));//copy
            this.plugins.forEach((plugin, index) => {
                entryData.params = plugin.params;
                plugin.run(this, entryData);
                //we are told to cancel this message.
                if (entryData.continue === false) {
                    return entryData;
                }
            });
            return  entryData;
        }

        /*
         This is THE method. 
         In the end it will simply call the original console['method'], eg. console.log(...);
         @param method - one of 'log', 'info' etc.
         */
        process(method, ...messages) {

            //this is possible... like e.g. .groupEnd doesn't need arguments at all, yet maybe we still want to process it.
            if (messages.length === 0) {
                let entryData = this.getEntryData(method);
                this.storyAdd(entryData);//before processing by plugins.
                let processed = this.processPlugins(entryData);
                if (processed.continue) {
                    console[processed.method].apply(this, processed.message);
                }
            }
            messages.forEach(message => {

                let namePrefixAdded = false;
                if (this._params.outputName !== false && this._name && (typeof message === 'string' || typeof message === 'number')) {
                    message = this._name + ': ' + message;
                    namePrefixAdded = true;
                }
                let entryData = this.getEntryData(method, message);
                Object.freeze(entryData);//constant
                this.storyAdd(entryData);//before processing by plugins.
                let processed = this.processPlugins(entryData);

                if (processed.continue) {
                    let processedMessages = processed.message;
                    if (
                            !Array.isArray(processedMessages) || //for some reason the 'style' plugin didn't kick in  
                            Array.isArray(message) //this was *originally* an array, we have to put it into one [processedMessages] so console will show it as an array
                            ) {
                        processedMessages = [processedMessages];
                        if (this._params.outputName !== false && this._name && !namePrefixAdded) {//this little thing complicated things...
                            processedMessages.unshift(this._name);
                        }
                    } else {//it's an array already, 'style' plugin kicked in
                    }
                    console[processed.method].apply(this, processedMessages);

                }
            });
            return this;
        }

        /*
         * our version of .group, which just encapsulates code into groups in console:
         * c stands for call
         */
        cgroup(groupName, callback, collapsed = false) {
            if (collapsed) {
                this.process('groupCollapsed', groupName);
            } else {
                this.process('group', groupName);
            }
            callback();
            console.groupEnd();
            return this;
        }

        /*
         * our version of .groupCollapsed, which just encapsulates code into groups in console:
         * c stands for call
         */
        cgroupCollapsed(groupName, callback) {
            this.cgropu(groupName, callback, true);
        }

        /*
         * Returns all the stuff recorded (.log, .warn etc). An array of entryData as prepared by .getEntryData
         * Global for all the instances, unless we'll provide the 'name' in 'filter'.
         * Called 'story', not 'log', or 'history' to avoid confusion with already existing things. 
         * filter can be like {
         * filter example:{
         *  name: 'something',
         *  method: 'warn',
         * }
         */
        story(filter = null) {
            if (!filter) {
                return this._story;
            }
            //filter is on:
            return this._story.filter(storyEntry => {
                return Object.entries(storyEntry).every(([storyKey, storyVal]) => {
                    return (typeof filter[storyKey] === 'undefined') || storyVal === filter[storyKey];
                });

            });
        }
        /*
         * returns *global* (all instances, unless we'll provide the name) stats in the form like:
         * {
         *  total:10,
         *  log: 6,
         *  info:4,
         *  //if there are no e.g. 'info', there will be no 'info' key.
         * }
         */
        stats(name = null) {
            let stats = {
                total: 0, warn: 0, info: 0, error: 0, debug: 0, dir: 0,
                //the other keys will be created in the loop
            };
            this._story.forEach(storyEntry => {
                //name not given = we want all.
                if (name === null || storyEntry.name === name) {
                    let storyMethod = storyEntry.method;
                    stats.total += 1;
                    if (typeof stats[storyMethod] === 'undefined') {
                        stats[storyMethod] = 0;
                    }
                    stats[storyMethod] += 1;
                }
            });
            return stats;
        }
        ////////////////////////////////////////////////////////
        //INTERNAL stuff. Utils.

        /* 
         * adds a new item to our prototype.story. Used in this.process(...);
         * public method is - .story (reads it)
         * @param {object} entryData as returned by this.getEntryData();
         */
        storyAdd(entryData) {
            this._story.push(entryData);
        }
        /*
         @param list - this.pluginStore or this.plugins
         @return index or -1
         */
        findPlugin(list, name) {
            let resultIndex = -1;
            let result = list.find((plugin, index) => {
                if (plugin.name === name) {
                    resultIndex = index;
                    return true;
                }
                return false;
            });
            return resultIndex;
        }

        /*
         * style object e.g. {'color':'blue'} to string, like 'color:blue';
         */
        stringifyStyle(styleObj) {
            //@todo my guess is this could be simplified? 
            let styleString = '';
            let delim = '';
            Object.keys(styleObj).forEach((prop) => {
                styleString += `${delim}${prop}:${styleObj[prop]}`;
                delim = '; ';
            });
            return styleString;
        }

        /*
         * Useful only for very simple rules, like:
         * 'color:blue;
         * font-size:42%' 
         * if there are other weird things things, this will not make it.
         * alternative: https://repl.it/@mpalmr/AcidicGrubbyTelevisions
         */
        parseStyle(style) {
            let result = {};
            style.trim().split(';').forEach(rule => {
                let propAndVal = rule.split(':').map((item) => {
                    return item.trim();
                });
                if (propAndVal.length >= 2) {
                    //result[propAndVal[0]] = propAndVal[1];//this works, unless there are ':' in the 'val'. So, here we go:
                    result[propAndVal[0]] = propAndVal.slice(1).join(':');
                } else if (rule) {
                    this.warn('warning, parseStyle, failure at: ' + rule);
                }
            });
            //this.internalLog(result,true);
            return result;
        }

        /*
         @param date - Date object. Will return e.g. '03:11:59' This method can be also used to measure
         time span, with dt = new Date(null);dt.SetSeconds(1000);formatTime(dt);
         */
        formatTime(date) {
            return date.toISOString().substr(11, 8);
        }    

        /*
         * Useful only when we create child instances of the logger and probably trying to debug the logger itself
         */
        parent() {
            return this._parent;
        }

        /*
         * Useful only when we create child instances of the logger  and probably trying to debug the logger itself
         */
        root() {
            let parent = this.parent();
            if (parent) {
                return parent.root();
            }
            return this;//no parent, so we must be the root.
        }

        /*
         * "internal" log for this script's debugging purposes. 
         * Which, btw, is always saved to the root. 
         * @output shoud or not be outputted to the console as well
         */
        internalLog() {
            if (this._parent) {
                return this._parent.internalLog(...arguments);
            }
            ;
            //we are the root
            this._internalLog.push(...arguments);
        }        

        getInternalLog() {
            if (this._parent) {
                return this._parent.internalLog(...arguments);
            }
            ;
            //we are the root
            return this._internalLog;
        }

        escapeHTML(str) {
            const replacements = {
                34: '&quot;',
                38: '&amp;',
                39: '&#39;',
                60: '&lt;',
                62: '&gt;',
            };
            let result = '';
            for (let n = 0; n < str.length; n++) {
                let replacement = replacements[str.charCodeAt(n)];
                if (replacement) {
                    result += replacement;
                } else {
                    result += str[n];
                }
            }
            return result;
        }

        /*
         * given obj == {name:'something', children:{a:34}} then with keychain ['children','a'] the value of 'a' - 34 - will be returned 
         * in case there is no such property, undefined is returned
         * used by the .template method
         */
        objPath(keyChain, obj) {
            let cur = obj;
            //in contrast to .forEach we can break; or return inside.
            for (var index = 0; index < keyChain.length; index++){
                let key = keyChain[index];
                if (typeof cur[key] === 'undefined') {
                    return undefined;
                }
                cur = cur[key];
            }
            return cur;
        }
        /*
         * Replaces variables in 'template' with those found in given 'data'. Data being an object.
         * @param {string} e.g. "foo bar {info.length}"
         * @param {object} data e.g. {info:{length:42}}
         * @returns {string}
         */
        template(template, data) {
            return template.replace(/\{(.*?)\}/g, ((fullmatch, varname) => {
                return this.objPath(varname.split('.'), data);
            }));
        }

        /*
         * deals with Converting circular structure to JSON error.
         * from: https://github.com/moll/json-stringify-safe
         */
        JSONStringify(obj, replacer = null, spaces = null, cycleReplacer = null) {
            return JSON.stringify(obj, this.JSONStringifySerializer(replacer, cycleReplacer), spaces);
        }

        //Used by the above JSONStringify
        JSONStringifySerializer(replacer, cycleReplacer) {
            var stack = [], keys = [];

            if (cycleReplacer === null) {
                cycleReplacer = function (key, value) {
                    if (stack[0] === value) {
                        return "[Circular ~]";
                    }
                    return "[Circular ~." + keys.slice(0, stack.indexOf(value)).join(".") + "]";
                };
            };

            return function (key, value) {
                if (stack.length > 0) {
                    var thisPos = stack.indexOf(this);
                    ~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
                    ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);
                    if (~stack.indexOf(value)) {
                        value = cycleReplacer.call(this, key, value);
                    }
                } else {
                    stack.push(value);
                }

                return replacer === null ? value : replacer.call(this, key, value);
            };
        }

        /*
         used by parseStack below. 
         example "lines": https://gist.github.com/kpion/1a1b70b1f97e1e604f5421eed5efc54f
         playing with regex: https://regex101.com/r/U5IkrH/1/
         */
        parseStackLine(line) {
            //this regex doesn't try to capture function name, maybe some day:
            let parsed = line.match(/^(?:.*?)((http[s]?).*\/(.*?)):(\d+):(\d+)\)?(?:\s*)$/);
            if (!parsed) {
                //return {full:line, url:null,file:null,line:null,column:null};                    
                return null;//this is probably chrome's attempt to show some anonymous func call.
            }
            return {
                full: line,
                url: parsed[1], //eg. http://example.com/test/index.html
                file: parsed[3], //only file name eg. index.html
                line: parsed[4],
                column: parsed[5],
            };
        }

        //parses the content of new Error().stack to an array of objects: {url:http://example.com/test/index.html, line:100} ;
        parseStack(stack) {
            let lines = stack.split("\n").filter(el => el !== '' && el !== 'Error').map(el => el.trim()); //lines with trash removed.
            return lines.map(el => this.parseStackLine(el)).filter(el => el !== null);
        }        

    }

    //////////////////////////////////////////////////////////////////////
    //end of class definition.

    //////////////////////////////////////////////////////////////////////
    //prototype stuff.

    ['trace', 'log', 'debug', 'info', 'warn', 'error', 'dir',
        'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd',
        'clear'
    ].forEach(func => {
        YaLog.prototype[func] = function () {
            return this.process(func, ...arguments);
        };
    });

    //every .log .warn etc is also written here, as e.g. {method: 'log', message: 'some string message'/or object};
    YaLog.prototype._story = [];

    /*
     @param yalog - instance of the YaLog class.
     
     @param data is an object filled with YaLog, which the 'plugin' can to change.
     {
     method: 'info', 'error' etc
     
     message: message argument which is supposed to be passed to console.log
     etc, more @processPlugins method
     
     }*/
    YaLog.prototype.pluginStore = [

        //must be called at the very end.
        {
            name: 'style',
            run: (yalog, data) => {
                let styleString = yalog.stringifyStyle(data.style);
                if (styleString && (typeof data.message === 'string' || data.message === 'number')) {
                    data.message = ['%c' + data.message, styleString];
                }
            }
        },

        /*
         filters he stuff, like eg: with
         params.logLevel example : 'warn'
         only 'warnings' and higher levels will be further processed.
         */
        {
            name: 'filter',
            //default params:
            params: {
                level: 'verbose',
                levels: {"verbose": 0, "trace": 0, "debug": 1, "log": 1, "info": 2, "warn": 3,
                    "error": 4, "group": 5, "groupCollapsed": 5, "groupEnd": 5, "silent": 20},
            },

            run: (yalog, data) => {
                if (typeof data.params.level === 'undefined') {
                    return;
                }
                let level = data.params.levels[data.params.level.toLowerCase()];
                let curMethodLevel = data.params.levels[data.method];
                if (curMethodLevel < level) {
                    data.continue = false;
                }
            }
        },

        {
            name: 'format',
            //default params:
            params: {
                format: '{message}',
            },

            run: (yalog, data) => {
                if (typeof data.message !== 'string' && typeof data.message !== 'number') {
                    return;//we cannot format that ^
                }
                data.message = yalog.template(data.params.format, data);
            }
        },

      
        /*
         * just for testing plugins, this will simply add some prefix (Test...) to the message
         */
        {
            name: 'test',
            params: {
                param1: 'test param 1',
            },
            run: (yalog, data) => {
                if (typeof data.message === 'string' || data.message === 'number') {
                    data.message = `Test >> (${data.params.param1}) >> ${data.message}`;
                }
            }
        },
    ];

    global.yalog = new YaLog();
}(window));
