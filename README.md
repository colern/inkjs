# InkJS


InkJS is a JavaScript library supported ink canvas which like microsoft inkcanvas. It inherited from signature_pad but support more features, applied with stabilizer(https://github.com/opentoonz/opentoonz/issues/81).
It works base pointer event api which firefox and some browsers has not supported now.
So if you hope to use a light weight library or compatibility for older browser, I addvise you use signature_pad.

## Usage
### API
``` javascript
var canvas = document.querySelector("canvas");

var inkCanvas = new InkCanvas(canvas);

// Returns signature image as data URL
inkCanvas.toDataURL(); // save image as PNG
inkCanvas.toDataURL("image/jpeg"); // save image as JPEG
inkCanvas.toDataURL("image/svg+xml"); // save image as SVG

// Draws signature image from data URL.
// NOTE: This method does not populate internal data structure that represents drawn signature. Thus, after using #fromDataURL, #toData won't work properly.
inkCanvas.fromDataURL("data:image/png;base64,iVBORw0K...");

// Returns signature image as an array of point groups
const data = inkCanvas.toData();

// Draws signature image from an array of point groups
inkCanvas.fromData(data);

// Clears the canvas
inkCanvas.clear();

// Returns true if canvas is empty, otherwise returns false
inkCanvas.isEmpty();

// Unbinds all event handlers
inkCanvas.off();

// Rebinds all event handlers
inkCanvas.on();
```

### Options
<dl>
<dt>dotSize</dt>
<dd>(float or function) Radius of a single dot.</dd>
<dt>radiu</dt>
<dd>(float) Minimum width of a line. Defaults to <code>0.5</code>.</dd>
<dt>throttle</dt>
<dd>(integer) Draw the next point at most once per every <code>x</code> milliseconds. Set it to <code>0</code> to turn off throttling. Defaults to <code>16</code>.</dd>
<dt>backgroundColor</dt>
<dd>(string) Color used to clear the background. Can be any color format accepted by <code>context.fillStyle</code>. Defaults to <code>"rgba(0,0,0,0)"</code> (transparent black). Use a non-transparent color e.g. <code>"rgb(255,255,255)"</code> (opaque white) if you'd like to save signatures as JPEG images.</dd>
<dt>penColor</dt>
<dd>(string) Color used to draw the lines. Can be any color format accepted by <code>context.fillStyle</code>. Defaults to <code>"black"</code>.</dd>
<dt>onBegin</dt>
<dd>(function) Callback when stroke begin.</dd>
<dt>onEnd</dt>
<dd>(function) Callback when stroke end.</dd>
</dl>

You can set options during initialization:
```javascript
var inkCanvas = new InkCanvas(canvas, {
    radiu: 2,
    penColor: "rgb(66, 133, 244)"
});
```
or during runtime:
```javascript
var inkCanvas = new InkCanvas(canvas);
inkCanvas.radiu = 5;
inkCanvas.penColor = "rgb(66, 133, 244)";
```


### Tips and tricks
#### Handling high DPI screens
To correctly handle canvas on low and high DPI screens one has to take `devicePixelRatio` into account and scale the canvas accordingly. This scaling is also necessary to properly display signatures loaded via `SignaturePad#fromDataURL`. Here's an example how it can be done:
```javascript
function resizeCanvas() {
    var ratio =  Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    inkCanvas.clear(); // otherwise isEmpty() might return incorrect value
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
```
Instead of `resize` event you can listen to screen orientation change, if you're using this library only on mobile devices. You can also throttle the `resize` event - you can find some examples on [this MDN page](https://developer.mozilla.org/en-US/docs/Web/Events/resize).

When you modify width or height of a canvas, it will be automatically cleared by the browser. SignaturePad doesn't know about it by itself, so you can call `inkCanvas.clear()` to make sure that `inkCanvas.isEmpty()` returns correct value in this case.

This clearing of the canvas by the browser can be annoying, especially on mobile devices e.g. when screen orientation is changed. There are a few workarounds though, e.g. you can [lock screen orientation](https://developer.mozilla.org/en-US/docs/Web/API/Screen/lockOrientation), or read an image from the canvas before resizing it and write the image back after.

## License
Released under the [MIT License](http://www.opensource.org/licenses/MIT).
