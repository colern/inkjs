/*!
 * Signature Pad v2.3.0
 * https://github.com/szimek/signature_pad
 *
 * Copyright 2017 Szymon Nowak
 * Released under the MIT license
 *
 * The main idea and some parts of the code (e.g. drawing variable width Bézier curve) are taken from:
 * http://corner.squareup.com/2012/07/smoother-signatures.html
 *
 * Implementation of interpolation using cubic Bézier curves is taken from:
 * http://benknowscode.wordpress.com/2012/09/14/path-interpolation-using-cubic-bezier-and-control-point-estimation-in-javascript
 *
 * Algorithm for approximated length of a Bézier curve is taken from:
 * http://www.lemoda.net/maths/bezier-length/index.html
 *
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.InkCanvas = factory());
}(this, (function () { 'use strict';

function Point(x, y, pressure, time) {
    this.x = x;
    this.y = y;
    this.time = time || new Date().getTime();
    this.pressure = pressure || 0.5;
}

Point.prototype.velocityFrom = function (start) {
    return this.time !== start.time ? this.distanceTo(start) / (this.time - start.time) : 1;
};

Point.prototype.distanceTo = function (start) {
    return Math.sqrt(Math.pow(this.x - start.x, 2) + Math.pow(this.y - start.y, 2));
};

Point.prototype.equals = function (other) {
    return this.x === other.x && this.y === other.y;
};

Point.prototype.radiu = function () {};

function Bezier(startPoint, control1, control2, endPoint) {
  this.startPoint = startPoint;
  this.control1 = control1;
  this.control2 = control2;
  this.endPoint = endPoint;
}

Bezier.calculateCurveControlPoints = function (s1, s2, s3) {
  var dx1 = s1.x - s2.x;
  var dy1 = s1.y - s2.y;
  var dx2 = s2.x - s3.x;
  var dy2 = s2.y - s3.y;

  var m1 = { x: (s1.x + s2.x) / 2.0, y: (s1.y + s2.y) / 2.0 };
  var m2 = { x: (s2.x + s3.x) / 2.0, y: (s2.y + s3.y) / 2.0 };

  var l1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  var l2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

  var dxm = m1.x - m2.x;
  var dym = m1.y - m2.y;

  var k = l2 / (l1 + l2);
  var cm = { x: m2.x + dxm * k, y: m2.y + dym * k };

  var tx = s2.x - cm.x;
  var ty = s2.y - cm.y;

  return {
    c1: new Point(m1.x + tx, m1.y + ty),
    c2: new Point(m2.x + tx, m2.y + ty)
  };
};

// Returns approximated length.
Bezier.prototype.length = function () {
  var steps = 10;
  var length = 0;
  var px = void 0;
  var py = void 0;

  for (var i = 0; i <= steps; i += 1) {
    var t = i / steps;
    var cx = this._point(t, this.startPoint.x, this.control1.x, this.control2.x, this.endPoint.x);
    var cy = this._point(t, this.startPoint.y, this.control1.y, this.control2.y, this.endPoint.y);
    if (i > 0) {
      var xdiff = cx - px;
      var ydiff = cy - py;
      length += Math.sqrt(xdiff * xdiff + ydiff * ydiff);
    }
    px = cx;
    py = cy;
  }

  return length;
};

/* eslint-disable no-multi-spaces, space-in-parens */
Bezier.prototype._point = function (t, start, c1, c2, end) {
  return start * (1.0 - t) * (1.0 - t) * (1.0 - t) + 3.0 * c1 * (1.0 - t) * (1.0 - t) * t + 3.0 * c2 * (1.0 - t) * t * t + end * t * t * t;
};

/* eslint-disable */

function throttle(func, wait, options) {
  var context, args, result;
  var timeout = null;
  var previous = 0;
  if (!options) options = {};
  var later = function later() {
    previous = options.leading === false ? 0 : Date.now();
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) context = args = null;
  };
  return function () {
    var now = Date.now();
    if (!previous && options.leading === false) previous = now;
    var remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
}

function BBox(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
    if (p1 != null && p2 != null) {
        this.top = Math.min(p1.y, p2.y);
        this.bottom = Math.max(p1.y, p2.y);
        this.left = Math.min(p1.x, p2.x);
        this.right = Math.max(p1.x, p2.x);
    }
}

BBox.prototype.isInBound = function (x, y) {
    if (x >= this.left && x <= this.right && y >= this.top && y <= this.bottom) return true;
    return false;
};

BBox.prototype.slopeWith = function (x, y) {
    var d = Math.abs(this.slope(x, y));
    //console.info(d);
    if (d < 0.3) return true;
    return false;
};

BBox.prototype.slope = function (x, y) {
    var dx = this.p2.x - this.p1.x;
    var dy = this.p2.y - this.p1.y;
    var px = x - this.p1.x;
    var py = y - this.p1.y;
    var tx = px / dx;
    var ty = py / dy;
    return tx - ty;
};

BBox.prototype.isIntersect = function (box) {
    var xLeft = Math.max(this.left, box.left);
    var xRight = Math.min(this.right, box.right);
    var yTop = Math.max(this.top, box.top);
    var yBottom = Math.min(this.bottom, box.bottom);
    if (xLeft - xRight < 0 && yTop - yBottom < 0) {
        return true;
    }
    return false;
};

function Stabilizer(points, radiu) {}

Stabilizer.smooth = function (points, start, n) {
    if (n <= 1) return points[0];
    var totalX = 0,
        totalY = 0,
        totalP = 0,
        totalT = 0;
    var end = Math.min(start + n, points.length);
    for (var idx = start; idx < end; ++idx) {
        totalX += points[idx].x;
        totalY += points[idx].y;
        totalP += points[idx].pressure;
        totalT += points[idx].time;
    }
    var num = end - start;
    return new Point(totalX / num, totalY / num, totalP / num, totalT / num);
};

function Curve(id, color) {
    this.data = [];
    this._smoothData = [];
    this.color = color;
    this.id = id;
    this.length = 0;
    this.hide = false;
    this.radiu = 1.5;
    this.bbox = new BBox(null, null);
    //this.lbbox = [];//a box group that sort by x-axie;
}

Curve.createFragment = function (data, index) {
    var len = data.length - index;

    if (len >= 2) {
        var pt1 = data[index],
            pt2 = null,
            pt3 = null,
            pt4 = null;
        if (len == 2) {
            pt2 = data[index];
            pt3 = data[index + 1];
            pt4 = data[index + 1];
        } else if (len === 3) {
            pt2 = data[index];
            pt3 = data[index + 1];
            pt4 = data[index + 2];
        } else {
            pt2 = data[index + 1];
            pt3 = data[index + 2];
            pt4 = data[index + 3];
        }
        var tmp = Bezier.calculateCurveControlPoints(pt1, pt2, pt3);
        var c2 = tmp.c2;
        tmp = Bezier.calculateCurveControlPoints(pt2, pt3, pt4);
        var c3 = tmp.c1;
        return new Bezier(pt2, c2, c3, pt3);
    }
    return null;
};

Curve.calculateFragmentWidths = function (fragment, radiu) {
    var startPoint = fragment.startPoint;
    var endPoint = fragment.endPoint;
    var widths = { start: null, end: null };

    var startE = Math.exp(-2 * radiu * (startPoint.pressure - 0.5));
    var endE = Math.exp(-2 * radiu * (endPoint.pressure - 0.5));
    widths.start = 2 * radiu / (1 + startE);
    widths.end = 2 * radiu / (1 + endE);

    return widths;
};

Curve.drawFragment = function (context, fragment, startWidth, endWidth) {
    var widthDelta = endWidth - startWidth;
    var drawSteps = Math.floor(fragment.length());
    context.beginPath();

    for (var i = 0; i < drawSteps; i += 1) {
        // Calculate the Bezier (x, y) coordinate for this step.
        var t = i / drawSteps;
        var tt = t * t;
        var ttt = tt * t;
        var u = 1 - t;
        var uu = u * u;
        var uuu = uu * u;

        var x = uuu * fragment.startPoint.x;
        x += 3 * uu * t * fragment.control1.x;
        x += 3 * u * tt * fragment.control2.x;
        x += ttt * fragment.endPoint.x;

        var y = uuu * fragment.startPoint.y;
        y += 3 * uu * t * fragment.control1.y;
        y += 3 * u * tt * fragment.control2.y;
        y += ttt * fragment.endPoint.y;

        var width = startWidth + ttt * widthDelta;
        Curve.drawPoint(context, x, y, width);
    }

    context.closePath();
    context.fill();
};

Curve.drawPoint = function (context, x, y, size) {
    context.moveTo(x, y);
    context.arc(x, y, size, 0, 2 * Math.PI, false);
};

Curve.prototype.appendPoint = function (point) {
    if (this.data.length == 0) {
        this.bbox.left = point.x;
        this.bbox.right = point.x;
        this.bbox.top = point.y;
        this.bbox.bottom = point.y;
    }
    this.data.push(point);
    var x = point.x;
    var y = point.y;
    this.bbox.right = Math.max(this.bbox.right, x, this.bbox.left);
    this.bbox.left = Math.min(this.bbox.right, x, this.bbox.left);
    this.bbox.top = Math.min(this.bbox.top, y, this.bbox.bottom);
    this.bbox.bottom = Math.max(this.bbox.top, y, this.bbox.bottom);
    this.length += 1;
};

Curve.prototype.last = function () {
    if (this.data.length == 0) return null;
    return this.data[this.data.length - 1];
};

Curve.prototype.get = function (index) {
    return this.data[index];
};

Curve.prototype.isIn = function (x, y) {
    return this.bbox.isInBound(x, y);
};

Curve.prototype.draw = function (context) {
    if (this.hide == true) return;
    var fst = context.fillStyle;
    context.fillStyle = this.color;
    for (var idx = 1; idx < this._smoothData.length; ++idx) {
        var frag = Curve.createFragment(this._smoothData, idx);
        if (frag) {
            var widths = Curve.calculateFragmentWidths(frag, this.radiu);
            if (widths) {
                Curve.drawFragment(context, frag, widths.start, widths.end);
            }
        }
    }
    context.fillStyle = fst;
};

function InkCanvas(canvas, options) {
    if (!window.PointerEvent) {
        alert('unsupport pointer event api');
    }
    var self = this;
    var opts = options || {};

    this.velocityFilterWeight = opts.velocityFilterWeight || 0.7;
    this.radiu = opts.radiu || 1.5;
    this.throttle = 'throttle' in opts ? opts.throttle : 16; // in miliseconds
    this.minDistance = opts.minDistance || 2;
    this.maxID = 0;
    this.smoothGroup = [];
    this.smoothLength = 5;

    if (this.throttle) {
        this._strokeMoveUpdate = throttle(InkCanvas.prototype._strokeUpdate, this.throttle);
    } else {
        this._strokeMoveUpdate = InkCanvas.prototype._strokeUpdate;
    }

    this.dotSize = opts.dotSize || function () {
        return this.radiu;
    };
    this.penColor = opts.penColor || 'black';
    this.state = opts.state || 'pen'; //other value is: eraser,selector,
    this.backgroundColor = opts.backgroundColor || 'rgba(0,0,0,0)';
    this.onBegin = opts.onBegin;
    this.onEnd = opts.onEnd;

    this._lastPoint = null; //captured point in last time
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this.clear();

    // We need add these inline so they are available to unbind while still having
    // access to 'self' we could use _.bind but it's not worth adding a dependency.
    this._handlePointerDown = function (event) {
        if (event.which == 1) {
            self._mouseButtonDown = true;
            self._strokeBegin(event);
        } else if (event.which == 6) {//pen cap
        }
    };

    this._handlePointerMove = function (event) {
        if (self._mouseButtonDown) {
            self._strokeMoveUpdate(event);
        }
    };

    this._handlePointerUp = function (event) {
        if (event.which === 1 && self._mouseButtonDown) {
            self._mouseButtonDown = false;
            self._strokeEnd(event);
        }
    };

    this._handlePointerLost = function (event) {
        if (self._mouseButtonDown) {
            self._mouseButtonDown = false;
            self._strokeEnd(event);
        }
    };

    // Enable mouse and touch event handlers
    this.on();
}

// Public methods
InkCanvas.prototype.clear = function () {
    var ctx = this._ctx;
    var canvas = this._canvas;

    ctx.fillStyle = this.backgroundColor;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this._data = [];
    this._reset();
    this._isEmpty = true;
};

InkCanvas.prototype.setRadiu = function (radiu) {
    if (radiu > 5) radiu = 5;
    if (radiu < 0.01) radiu = 1;
    this.radiu = radiu || 1.5;
};

InkCanvas.prototype.setState = function (st) {
    this.state = st;
};

InkCanvas.prototype.fromDataURL = function (dataUrl) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var image = new Image();
    var ratio = options.ratio || window.devicePixelRatio || 1;
    var width = options.width || this._canvas.width / ratio;
    var height = options.height || this._canvas.height / ratio;

    this._reset();
    image.src = dataUrl;
    image.onload = function () {
        _this._ctx.drawImage(image, 0, 0, width, height);
    };
    this._isEmpty = false;
};

InkCanvas.prototype.toDataURL = function (type) {
    var _canvas;

    switch (type) {
        case 'image/svg+xml':
            return this._toSVG();
        default:
            for (var _len = arguments.length, options = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                options[_key - 1] = arguments[_key];
            }

            return (_canvas = this._canvas).toDataURL.apply(_canvas, [type].concat(options));
    }
};

InkCanvas.prototype.on = function () {
    this._mouseButtonDown = false;

    this._canvas.addEventListener('pointerdown', this._handlePointerDown);
    this._canvas.addEventListener('pointermove', this._handlePointerMove);
    this._canvas.addEventListener('pointerup', this._handlePointerUp);
    this._canvas.addEventListener('lostpointercapture', this._handlePointerLost);
};

InkCanvas.prototype.off = function () {
    this._canvas.removeEventListener('pointerdown', this._handlePointerDown);
    this._canvas.removeEventListener('pointermove', this._handlePointerMove);
    this._canvas.removeEventListener('pointerup', this._handlePointerUp);
};

InkCanvas.prototype.isEmpty = function () {
    return this._isEmpty;
};

InkCanvas.prototype.hitTest = function (pt) {
    var len = this._data.length;
    var checkCurves = [];
    for (var i = 0; i < len; ++i) {
        if (this._data[i].isIn(pt.x, pt.y)) {
            checkCurves.push(this._data[i]);
        }
    }
    var hitIds = [];
    //const ctx = this._ctx;
    //ctx.strokeStyle = 'red';
    //ctx.beginPath();
    for (var _i = 0; _i < checkCurves.length; ++_i) {
        //const curve = checkCurves[i].data;
        var curve = checkCurves[_i];
        var data = curve._smoothData;
        console.info('in box: ' + curve.id);
        for (var idx = 0; idx < data.length - 1; ++idx) {
            var pt1 = data[idx];
            var pt2 = data[idx + 1];
            var bbox = new BBox(pt1, pt2);
            //ctx.moveTo(bbox.left, bbox.top);
            //ctx.lineTo(bbox.right, bbox.top);
            //ctx.lineTo(bbox.right, bbox.bottom);
            //ctx.lineTo(bbox.left, bbox.bottom);
            //ctx.lineTo(bbox.left, bbox.top);
            //ctx.stroke();
            if (this._lastPoint == null) {
                if (bbox.isInBound(pt.x, pt.y)) {
                    if (bbox.slopeWith(pt.x, pt.y)) {
                        hitIds.push(curve);
                    }
                    console.info('in bound: ' + curve.id);
                }
            } else {
                if (bbox.isIntersect(new BBox(this._lastPoint, pt))) {
                    var first = bbox.slope(this._lastPoint.x, this._lastPoint.y);
                    var second = bbox.slope(pt.x, pt.y);
                    if (first * second < 0 || Math.abs(first) < 0.3 || Math.abs(second) < 0.3) {
                        hitIds.push(curve);
                    }
                }
            }
            bbox = null;
        }
        //let endPt = data[data.length - 1];
        //ctx.fillText(endPt.x + ',' + endPt.y, endPt.x+2, endPt.y+2);
    }
    //ctx.closePath();
    //ctx.strokeStyle = 'black';
    this._lastPoint = pt;
    if (hitIds.length > 0) return hitIds;
    return null;
};

InkCanvas.prototype.redraw = function () {
    this.drawCurves(this._data);
};

InkCanvas.prototype.drawCurve = function (curve) {
    this._ctx.beginPath();
    this._drawCurve(curve);
    this._ctx.closePath();
};

InkCanvas.prototype.drawCurves = function (curves) {
    this._ctx.beginPath();
    for (var i = 0; i < curves.length; ++i) {
        this._drawCurve(curves[i]);
    }
    this._ctx.closePath();
};

// Private methods
InkCanvas.prototype._strokeBegin = function (event) {
    if (this.state == 'pen') {
        this.maxID += 1;
        var curve = new Curve(this.maxID, this.penColor);
        curve.radiu = this.radiu;
        this._data.push(curve);
        this._reset();
    }
    this._strokeUpdate(event);

    if (typeof this.onBegin === 'function') {
        this.onBegin(event);
    }
};

InkCanvas.prototype._strokeUpdate = function (event) {
    var point = this._event2Point(event);
    switch (this.state) {
        case 'pen':
            var lastPointGroup = this._data[this._data.length - 1];
            var lastPoint = lastPointGroup && lastPointGroup.get(lastPointGroup.length - 1);
            var isLastPointTooClose = lastPoint && point.distanceTo(lastPoint) < this.minDistance;
            this._drawAddedPoint(point);
            break;
        case 'eraser':
            //may be too fast to close the curve.
            var hits = this.hitTest(point);
            if (hits != null) {
                for (var i = 0; i < hits.length; ++i) {
                    hits[i].hide = true;
                }
                this._clearBackground();
                this.redraw();
            }

            break;
        default:
            if (this.hitTest(point)) {
                console.info('hit');
            }
            break;
    }
};

InkCanvas.prototype._strokeEnd = function (event) {
    if (this.state == 'pen') {
        var canDrawCurve = this.points.length > 2;
        var point = this.points[0]; // Point instance

        if (!canDrawCurve && point) {
            this._drawDot(point);
        }
        var curPoint = this._event2Point(event);
        curPoint.pressure = 0.005;
        this._drawAddedPoint(curPoint);
        //console.info('strokeEnd: (' + curPoint.x + ',' + curPoint.y + ')');
        this._drawLastPoints();
    }

    if (typeof this.onEnd === 'function') {
        this.onEnd(event);
    }
};

InkCanvas.prototype._clearBackground = function () {
    var ctx = this._ctx;
    var canvas = this._canvas;
    ctx.fillStyle = this.backgroundColor;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
};

InkCanvas.prototype._drawCurve = function (curve) {
    curve.draw(this._ctx);
};

InkCanvas.prototype._addSmoothPoint = function (pt) {
    this.smoothGroup.push(pt);
    this._data[this._data.length - 1]._smoothData.push(pt);
};

InkCanvas.prototype._smoothTo = function (point) {
    var points = this.points;
    var len = points.length;
    var lastCurve = this._data[this._data.length - 1];
    if (!point) {
        if (len < 2) {
            this._addSmoothPoint(points[len - 1]);
        } else if (len > 2) {
            var _pt = Stabilizer.smooth(points, len - 3, 3);
            this._addSmoothPoint(_pt);
            this._addSmoothPoint(points[len - 1]);
        }
        return;
    }
    if (len > 0) {
        var lastPoint = points[len - 1];
        if (point.equals(lastPoint)) {
            //const lp = lastCurve._smoothData[lastCurve._smoothData.length - 1];
            //if (!lp.equals(lastPoint)) {
            //    lastCurve._smoothData.push(lastPoint);
            //}
            return;
        }
    }
    lastCurve.appendPoint(point);
    points.push(point);
    if (len < 2) {
        if (this.smoothGroup.length == 0) {
            this._addSmoothPoint(points[0]);
        }
        return;
    }
    var index = Math.max(len - 5, 0);
    var pt = Stabilizer.smooth(points, index, index > 0 ? 5 : 3);
    this._addSmoothPoint(pt);
};

InkCanvas.prototype._event2Point = function (event) {
    var x = event.clientX;
    var y = event.clientY;
    if (event.pressure) {
        this.pressure = event.pressure;
    }
    return this._createPoint(x, y, this.pressure);
};

InkCanvas.prototype._drawAddedPoint = function (point) {
    var curve = this._addPoint(point);
    if (curve) {
        this._calculateWidthAndDraw(curve);
    } else if (this.points.length == 0) {
        this._drawDot(point);
    }
};

InkCanvas.prototype._calculateWidthAndDraw = function (curve) {
    var widths = Curve.calculateFragmentWidths(curve, this.radiu);
    if (widths) {
        Curve.drawFragment(this._ctx, curve, widths.start, widths.end);
    }
};

InkCanvas.prototype._drawLastPoints = function () {
    var curve = this._addPoint();
    if (curve) {
        this._calculateWidthAndDraw(curve);
        //draw last 2 points
        curve = this._caculateCurve(this.smoothGroup);
        this._calculateWidthAndDraw(curve);
        var p = this.smoothGroup[this.smoothGroup.length - 1];
        this.smoothGroup.push(p);
    }
};

InkCanvas.prototype._reset = function () {
    this.points = [];
    this.smoothGroup = [];
    this._lastPoint = null;
    this._lastVelocity = 0;
    this._lastWidth = this.radiu;
    this._ctx.fillStyle = this.penColor;
};

InkCanvas.prototype._createPoint = function (x, y, pressure, time) {
    var rect = this._canvas.getBoundingClientRect();

    return new Point(x - rect.left, y - rect.top, pressure, time || new Date().getTime());
};

InkCanvas.prototype._caculateCurve = function (points) {
    if (points.length > 2) {
        // To reduce the initial lag make it work with 3 points
        // by copying the first point to the beginning.
        if (points.length === 3) points.unshift(points[0]);
        var curve = Curve.createFragment(points, 0);
        points.shift();
        return curve;
    }
    return null;
};

InkCanvas.prototype._addPoint = function (point) {
    this._smoothTo(point);
    return this._caculateCurve(this.smoothGroup);
};

InkCanvas.prototype._drawPoint = function (x, y, size) {
    Curve.drawPoint(this._ctx, x, y, size);
    this._isEmpty = false;
};

InkCanvas.prototype._drawDot = function (point) {
    var ctx = this._ctx;
    var width = typeof this.dotSize === 'function' ? this.dotSize() : this.dotSize;

    ctx.beginPath();
    this._drawPoint(point.x, point.y, width);
    ctx.closePath();
    ctx.fill();
};

InkCanvas.prototype._fromData = function (pointGroups, drawCurve, drawDot) {
    for (var i = 0; i < pointGroups.length; i += 1) {
        var group = pointGroups[i];

        if (group.length > 1) {
            for (var j = 0; j < group.length; j += 1) {
                var point = group.get(j);
                //const point = new Point(rawPoint.x, rawPoint.y, rawPoint.time);
                var color = group.color;

                if (j === 0) {
                    // First point in a group. Nothing to draw yet.
                    this._reset();
                    this._addPoint(point);
                } else if (j !== group.length - 1) {
                    // Middle point in a group.
                    var curve = this._addPoint(point);
                    if (curve) {
                        var widths = Curve.calculateFragmentWidths(curve, this.radiu);
                        if (widths) {
                            drawCurve(curve, widths, color);
                        }
                    }
                } else {
                    // Last point in a group. Do nothing.
                }
            }
        } else {
            this._reset();
            var rawPoint = group.get(0);
            drawDot(rawPoint);
        }
    }
};

InkCanvas.prototype._toSVG = function () {
    var _this2 = this;

    var pointGroups = this._data;
    var canvas = this._canvas;
    var ratio = Math.max(window.devicePixelRatio || 1, 1);
    var minX = 0;
    var minY = 0;
    var maxX = canvas.width / ratio;
    var maxY = canvas.height / ratio;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    svg.setAttributeNS(null, 'width', canvas.width);
    svg.setAttributeNS(null, 'height', canvas.height);

    this._fromData(pointGroups, function (curve, widths, color) {
        var path = document.createElement('path');

        // Need to check curve for NaN values, these pop up when drawing
        // lines on the canvas that are not continuous. E.g. Sharp corners
        // or stopping mid-stroke and than continuing without lifting mouse.
        if (!isNaN(curve.control1.x) && !isNaN(curve.control1.y) && !isNaN(curve.control2.x) && !isNaN(curve.control2.y)) {
            var attr = 'M ' + curve.startPoint.x.toFixed(3) + ',' + curve.startPoint.y.toFixed(3) + ' ' + ('C ' + curve.control1.x.toFixed(3) + ',' + curve.control1.y.toFixed(3) + ' ') + (curve.control2.x.toFixed(3) + ',' + curve.control2.y.toFixed(3) + ' ') + (curve.endPoint.x.toFixed(3) + ',' + curve.endPoint.y.toFixed(3));

            path.setAttribute('d', attr);
            path.setAttribute('stroke-width', (widths.end * 2.25).toFixed(3));
            path.setAttribute('stroke', color);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');

            svg.appendChild(path);
        }
    }, function (rawPoint) {
        var circle = document.createElement('circle');
        var dotSize = typeof _this2.dotSize === 'function' ? _this2.dotSize() : _this2.dotSize;
        circle.setAttribute('r', dotSize);
        circle.setAttribute('cx', rawPoint.x);
        circle.setAttribute('cy', rawPoint.y);
        circle.setAttribute('fill', rawPoint.color);

        svg.appendChild(circle);
    });

    var prefix = 'data:image/svg+xml;base64,';
    var header = '<svg' + ' xmlns="http://www.w3.org/2000/svg"' + ' xmlns:xlink="http://www.w3.org/1999/xlink"' + (' viewBox="' + minX + ' ' + minY + ' ' + maxX + ' ' + maxY + '"') + (' width="' + maxX + '"') + (' height="' + maxY + '"') + '>';
    var body = svg.innerHTML;

    // IE hack for missing innerHTML property on SVGElement
    if (body === undefined) {
        var dummy = document.createElement('dummy');
        var nodes = svg.childNodes;
        dummy.innerHTML = '';

        for (var i = 0; i < nodes.length; i += 1) {
            dummy.appendChild(nodes[i].cloneNode(true));
        }

        body = dummy.innerHTML;
    }

    var footer = '</svg>';
    var data = header + body + footer;

    return prefix + btoa(data);
};

InkCanvas.prototype.fromData = function (pointGroups) {
    var _this3 = this;

    this.clear();

    this._fromData(pointGroups, function (curve, widths) {
        return Curve.drawFragment(_this3._ctx, curve, widths.start, widths.end);
    }, function (rawPoint) {
        return _this3._drawDot(rawPoint);
    });

    this._data = pointGroups;
};

InkCanvas.prototype.toData = function () {
    return this._data;
};

return InkCanvas;

})));
