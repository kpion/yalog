# yalog

A small project which helps me learn and test new things in JS.

A colorful browser console output. Plus (via built in plugin) a Site (DOM) console.
Only one file, no dependencies. 

You can see the demo here: https://kpion.github.io/yalog

## How it looks like

![It looks like this](https://raw.githubusercontent.com/kpion/yalog/master/img/yalog-screenshot-1.png)


## Setting it up

## Node

Will come soon.

## Directly in your web page:

Just download the only yalog.js file and:

```
<script src="yalog.js"></script>
<script>
yalog.log("works!").style('font-size:150%').log('This one too!');
</script>
```

Will later prepare the .min version and node stuff.

## Demo and docs:

You can see the demo here: https://kpion.github.io/yalog

## To do

1. there is smth like window.onerror, need to read about it
2. working with npm and also with require...
3. would be great if browsers showed the rght file/line number in the console (i.e. the real .log call occurence, not the yalog one)  
4. yalog.log(circular-object); brings yalog.log(this); even if there already is yalog.JSONStringify ready to use
5. outputting prototype.constructor.name just like chrome does it?