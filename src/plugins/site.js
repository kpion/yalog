(function (win) {
    'use strict';
    
    
    let plugin =
        {
            
            name: 'site',
            //default params:
            params: {
                selector: '#yalog-wrapper',
                //should we add the styling to it?
                styleIt: true,
                template:`
                <div>
                    <span style = 'float:left;margin-right:10px' title = {htmlTitle}>•</span>
                    <pre style = '{htmlStyle};' >{htmlMessage}</pre>
                </div>`
            },
            
            /*
            * called once on .addPlugin
            */ 
            init: (yalog) => {
                //inserting css|:
                let headEl = document.querySelector('html head');
                let style = document.createElement('style');
                style.appendChild(document.createTextNode(plugin.css));
                headEl.appendChild(style);                
                //inserting html into body:
                let html = document.querySelector('body').appendChild(document.createElement('div'));
                html.innerHTML = plugin.html;
                
                document.querySelector('#yalog-controls-toggle').addEventListener('click',() => {
                    document.querySelector('#yalog-wrapper').classList.toggle('yalog-enabled');
                    win.scrollTo(0,document.body.scrollHeight);
                });
            },
            
            run: (yalog, data) => {
                let wrapperEl = document.querySelector(data.params.selector);
                let consoleEl = document.querySelector(data.params.selector + ' #yalog-console');

                if (!wrapperEl || !consoleEl) {
                    return;
                }
                let hmessage = data.message;
                if (typeof hmessage === 'undefined') {
                    hmessage = 'undefined';//we want this fact as string
                } else {
                    if (typeof hmessage === 'function') {
                        hmessage = hmessage.toString();
                    } else if (typeof hmessage !== 'string' && typeof hmessage !== 'number') {
                        hmessage = yalog.JSONStringify(hmessage, null, 2);
                    }
                }
                //things go to data so we can use params.template to ouput log
                hmessage = data.htmlMessage = yalog.escapeHTML(hmessage);
                data.htmlStyle = '';
                if (data.params.styleIt) {
                    data.htmlStyle = yalog.stringifyStyle(data.style);
                }

                data.htmlTitle = '';
                data.stack.forEach(step => {
                    data.htmlTitle += yalog.template("{file}:{line}&#10;", step);
                });
                data.htmlTitle += yalog.template("{time}&#10;", data);
                
                //consoleEl.innerHTML += `<div><span style = 'float:left;margin-right:10px' title = ${title}>•</span><pre style = '${styleString};display:inline-block;margin-top:0px;' >${hmessage}</pre></div>`;
                consoleEl.innerHTML += yalog.template(data.params.template,data);
                consoleEl.scrollTop = consoleEl.scrollHeight;

                //stats
                let stats = yalog.stats();
                //the (...|| {}) is there so if those elements are missing, nothing horrible will happen:
                (wrapperEl.querySelector('#yalog-stats-total') || {}).textContent = stats.total;
                (wrapperEl.querySelector('#yalog-stats-error') || {}).textContent = stats.error;
                (wrapperEl.querySelector('#yalog-stats-warn') || {}).textContent = stats.warn;
                (wrapperEl.querySelector('#yalog-stats-other') || {}).textContent = stats.total - (stats.error + stats.warn);


            },
            css : `
                #yalog-wrapper{
                    position: sticky;
                    box-sizing: border-box;
                    padding: 15px 15px 15px 15px;
                    border:1px dotted #c0c0c0;
                    border-radius: 2px;
                    bottom: 0px;
                    z-index:10;
                    /*width: 98%;*/
                    width: 100%;
                    min-height: 50px;
                    display: flex;
                    flex-direction: column;	
                    /*background-color: black;
                    color: white;*/
                    background-color: #eaeaea;				
                    color:black;
                }
                #yalog-wrapper #yalog-console{
                        font-family: Courier;
                        overflow-y: scroll;
                        overflow: auto;
                        height: 45vh;
                        margin-bottom: 30px;
                        display:none;
                        resize: vertical;
                }

                #yalog-wrapper #yalog-console pre {
                        display:inline-block;
                        font-size:75%;
                        padding:2px 2px;
                        border-bottom: 1px dotted #ccc; 
                        border-left:none;
                        background:none;
                        margin-bottom:0px;
                        margin-top:0px;
                        font-family:monospace;
                        
                }


                #yalog-wrapper.yalog-enabled #yalog-console{
                        display:block;//it's hidden by default
                }
                #yalog-wrapper #yalog-controls {
                        display:flex;
                        font-size:70%;
                }

                #yalog-wrapper #yalog-controls-toggle{
                        font-size:130%;
                        font-weight:bold;
                        cursor:pointer;
                }

                #yalog-wrapper #yalog-controls-toggle::after{
                        content:'↗'
                }
                #yalog-wrapper.yalog-enabled #yalog-controls-toggle::after{
                        content:'↙'
                }			
                #yalog-wrapper #yalog-stats{
                        display: flex;
                }
                #yalog-wrapper #yalog-controls-toggle{
                        border-radius: 5px;


                }
                #yalog-wrapper #yalog-stats span{
                        margin-left:5px;
                        padding:5px 10px;
                        color:black;
                        border-radius: 5px;

                }
                #yalog-wrapper #yalog-stats #yalog-stats-total{
                        background-color:#fbfbfb;
                }
                #yalog-wrapper #yalog-stats #yalog-stats-error{
                        background-color:#DC143C;
                }
                #yalog-wrapper #yalog-stats #yalog-stats-warn{
                        background-color:#FFFF66;
                }			
                #yalog-wrapper #yalog-stats #yalog-stats-other{
                        background-color:#1E90FF;
                }	    
            `,            
            html: `
                <div id = "yalog-wrapper" class = ''>
                    <div id = 'yalog-console'></div>
                    <div id = 'yalog-controls'>
                        <span id  = 'yalog-controls-toggle'>Toggle</span>
                        <div id = 'yalog-stats'>
                            <span id = 'yalog-stats-total' title = 'Total'>0</span>
                            <span id = 'yalog-stats-error' title = 'Errors'>0</span>
                            <span id = 'yalog-stats-warn' title = 'Warnings'>0</span>
                            <span id = 'yalog-stats-other' title = 'Other'>0</span>
                        </div>	
                    </div>
                </div>            
        
            `,
        };
    win.yalogSite = plugin;    
}(window));     