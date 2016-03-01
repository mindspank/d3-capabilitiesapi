## A example of using D3js with the Capabilities API

This is a short introduciton on how to use the Qlik Sense Capabilities API together with D3js.  
For this page we make the assumptions that the QS server and the webserver is seperated.  
  
This is not in any way a ultimate guide on how to get started with the Capabilities API but it showcases some common techniques such as fetching field data and constructing HyperCubes to calculate and aggregate data on the fly via the Qlik Sense Engine.  
It will also cover how to apply D3js data join techniques together with Qlik Sense to establish the enter, update and exit selections.  
  
In the interest of keeping the code base small everything is organized within a single javascript file.  
In a production setting we would recommend you split your modules across multiple files to keep the entry point of your app smaller.  

The code is heavily commented but feel free to sumbit pull requests or raise an issue if you spot any errors.

## What this sample is **not**
* A complete guide to the Capabilities API
* A reference guide on supported methods and classes, refer to the Qlik Sense API documentation.
* A guide on how to use AngularJS together with Qlik Sense

## Areas for improvements
You will notice a somewhat 'janky' render process in the browser.
In a production setting I would recommend that you don't repaint the entire filter list but instead iterate over it and change classnames alternative utilize the virtual DOM to diff the changes.  
ReactJS is a good example on a rendering library that would fit very well together with Qlik Sense.