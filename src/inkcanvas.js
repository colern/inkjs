import Point from './point';
import Bezier from './bezier';
import throttle from './throttle';
import Curve from './curve';
import BBox from './bbox';
import Stabilizer from './stabilizer';

function InkCanvas(canvas, options) {
    if(!window.PointerEvent){
        alert('unsupport pointer event api');
    }
    const self = this;
    const opts = options || {};
    
    this.velocityFilterWeight = opts.velocityFilterWeight || 0.7;
    this.radiu = opts.radiu||1.5;
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
    this.state = opts.state||'pen'; //other value is: eraser,selector,
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
        if(event.which==1){
            self._mouseButtonDown = true;
            self._strokeBegin(event);
        }
        else if(event.which==6){//pen cap
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

    this._handlePointerLost = function(event){
        if(self._mouseButtonDown){
            self._mouseButtonDown = false;
            self._strokeEnd(event);
        }
    }
    
    // Enable mouse and touch event handlers
    this.on();
}

// Public methods
InkCanvas.prototype.clear = function () {
    const ctx = this._ctx;
    const canvas = this._canvas;
    
    ctx.fillStyle = this.backgroundColor;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    this._data = [];
    this._reset();
    this._isEmpty = true;
};

InkCanvas.prototype.setRadiu = function(radiu){
    if (radiu > 5) radiu = 5;
    if (radiu < 0.01) radiu = 1;
    this.radiu = radiu || 1.5;
}

InkCanvas.prototype.setState = function (st) {
    this.state = st;
}

InkCanvas.prototype.fromDataURL = function (dataUrl, options = { }) {
    const image = new Image();
    const ratio = options.ratio || window.devicePixelRatio || 1;
    const width = options.width || (this._canvas.width / ratio);
    const height = options.height || (this._canvas.height / ratio);

    this._reset();
    image.src = dataUrl;
    image.onload = () => {
        this._ctx.drawImage(image, 0, 0, width, height);
    };
    this._isEmpty = false;
};

InkCanvas.prototype.toDataURL = function(type, ...options) {
    switch (type) {
        case 'image/svg+xml':
            return this._toSVG();
        default:
            return this._canvas.toDataURL(type, ...options);
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
    let len = this._data.length;
    let checkCurves = [];
    for (let i = 0; i < len; ++i) {
        if (this._data[i].isIn(pt.x, pt.y)) {
            checkCurves.push(this._data[i]);
        }
    }
    let hitIds = [];
    //const ctx = this._ctx;
    //ctx.strokeStyle = 'red';
    //ctx.beginPath();
    for (let i = 0; i < checkCurves.length; ++i) {
        //const curve = checkCurves[i].data;
        const curve = checkCurves[i];
        const data = curve._smoothData;
        console.info('in box: ' + curve.id);
        for (let idx = 0; idx < data.length-1; ++idx) {
            const pt1 = data[idx];
            const pt2 = data[idx + 1];
            let bbox = new BBox(pt1, pt2);
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
            }
            else {
                if (bbox.isIntersect(new BBox(this._lastPoint, pt))) {
                    let first = bbox.slope(this._lastPoint.x, this._lastPoint.y);
                    let second = bbox.slope(pt.x, pt.y);
                    if (first * second < 0 || Math.abs(first) < 0.3 || Math.abs(second)<0.3) {
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
}

InkCanvas.prototype.redraw = function () {
    this.drawCurves(this._data);
}

InkCanvas.prototype.drawCurve = function (curve) {
    this._ctx.beginPath();
    this._drawCurve(curve);
    this._ctx.closePath();
}

InkCanvas.prototype.drawCurves = function (curves) {
    this._ctx.beginPath();
    for (let i = 0; i < curves.length; ++i) {
        this._drawCurve(curves[i]);
    }
    this._ctx.closePath();
}

// Private methods
InkCanvas.prototype._strokeBegin = function (event) {
    if (this.state == 'pen') {
        this.maxID += 1;
        let curve = new Curve(this.maxID, this.penColor);
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
    const point = this._event2Point(event);
    switch (this.state) {
        case 'pen':
            const lastPointGroup = this._data[this._data.length - 1];
            const lastPoint = lastPointGroup && lastPointGroup.get(lastPointGroup.length - 1);
            const isLastPointTooClose = lastPoint && point.distanceTo(lastPoint) < this.minDistance;
            this._drawAddedPoint(point);
            break;
        case 'eraser':
            //may be too fast to close the curve.
            const hits = this.hitTest(point);
            if (hits != null) {
                for (let i = 0; i < hits.length; ++i) {
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
        const canDrawCurve = this.points.length > 2;
        let point = this.points[0]; // Point instance

        if (!canDrawCurve && point) {
            this._drawDot(point);
        }
        const curPoint = this._event2Point(event);
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
    const ctx = this._ctx;
    const canvas = this._canvas;
    ctx.fillStyle = this.backgroundColor;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

InkCanvas.prototype._drawCurve = function (curve) {
    curve.draw(this._ctx);
}

InkCanvas.prototype._addSmoothPoint = function (pt) {
    this.smoothGroup.push(pt);
    this._data[this._data.length - 1]._smoothData.push(pt);
}

InkCanvas.prototype._smoothTo = function (point) {
    let points = this.points;
    const len = points.length;
    let lastCurve = this._data[this._data.length - 1];
    if(!point){
        if (len < 2) {
            this._addSmoothPoint(points[len - 1]);
        }
        else if (len > 2) {
            const pt = Stabilizer.smooth(points, len - 3,3);
            this._addSmoothPoint(pt);
            this._addSmoothPoint(points[len - 1]);
        }
        return ;
    }
    if(len>0){
        const lastPoint = points[len - 1];
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
    if(len<2){
        if (this.smoothGroup.length == 0) {
            this._addSmoothPoint(points[0]);
        }
        return;
    }
    const index = Math.max(len - 5, 0);
    const pt = Stabilizer.smooth(points, index, index > 0 ? 5 : 3);
    this._addSmoothPoint(pt);
}

InkCanvas.prototype._event2Point = function (event){
    const x = event.clientX;
    const y = event.clientY;
    if (event.pressure) {
        this.pressure = event.pressure;
    }
    return this._createPoint(x, y, this.pressure);
}

InkCanvas.prototype._drawAddedPoint = function (point) {
    const curve = this._addPoint(point);
    if(curve){
        this._calculateWidthAndDraw(curve);
    }
    else if(this.points.length==0){
        this._drawDot(point);
    }
}

InkCanvas.prototype._calculateWidthAndDraw = function (curve) {
    const widths = Curve.calculateFragmentWidths(curve, this.radiu);
    if (widths) {
        Curve.drawFragment(this._ctx, curve, widths.start, widths.end);
    }
}

InkCanvas.prototype._drawLastPoints = function(){
    let curve = this._addPoint();
    if(curve){
        this._calculateWidthAndDraw(curve);
        //draw last 2 points
        curve = this._caculateCurve(this.smoothGroup);
        this._calculateWidthAndDraw(curve);
        const p = this.smoothGroup[this.smoothGroup.length - 1];
        this.smoothGroup.push(p);
    }
}

InkCanvas.prototype._reset = function () {
    this.points = [];
    this.smoothGroup = [];
    this._lastPoint = null;
    this._lastVelocity = 0;
    this._lastWidth = this.radiu;
    this._ctx.fillStyle = this.penColor;
};

InkCanvas.prototype._createPoint = function (x, y, pressure, time) {
    const rect = this._canvas.getBoundingClientRect();
    
    return new Point(
        x - rect.left,
    y - rect.top,
    pressure,
    time || new Date().getTime(),
    );
};

InkCanvas.prototype._caculateCurve = function (points) {
    if (points.length > 2) {
        // To reduce the initial lag make it work with 3 points
        // by copying the first point to the beginning.
        if (points.length === 3) points.unshift(points[0]);
        const curve = Curve.createFragment(points, 0);
        points.shift();
        return curve;
    }
    return null;
}

InkCanvas.prototype._addPoint = function (point) {
    this._smoothTo(point);
    return this._caculateCurve(this.smoothGroup);
};

InkCanvas.prototype._drawPoint = function (x, y, size) {
    Curve.drawPoint(this._ctx, x, y, size);
    this._isEmpty = false;
};

InkCanvas.prototype._drawDot = function (point) {
    const ctx = this._ctx;
    const width = (typeof this.dotSize) === 'function' ? this.dotSize() : this.dotSize;
    
    ctx.beginPath();
    this._drawPoint(point.x, point.y, width);
    ctx.closePath();
    ctx.fill();
};

InkCanvas.prototype._fromData = function (pointGroups, drawCurve, drawDot) {
    for (let i = 0; i < pointGroups.length; i += 1) {
        const group = pointGroups[i];
        
        if (group.length > 1) {
            for (let j = 0; j < group.length; j += 1) {
                const point = group.get(j);
                //const point = new Point(rawPoint.x, rawPoint.y, rawPoint.time);
                const color = group.color;
                
                if (j === 0) {
                    // First point in a group. Nothing to draw yet.
                    this._reset();
                    this._addPoint(point);
                } else if (j !== group.length - 1) {
                    // Middle point in a group.
                    const curve = this._addPoint(point);
                    if (curve) {
                        const widths = Curve.calculateFragmentWidths(curve, this.radiu);
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
            const rawPoint = group.get(0);
            drawDot(rawPoint);
        }
    }
};

InkCanvas.prototype._toSVG = function () {
    const pointGroups = this._data;
    const canvas = this._canvas;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const minX = 0;
    const minY = 0;
    const maxX = canvas.width / ratio;
    const maxY = canvas.height / ratio;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    
    svg.setAttributeNS(null, 'width', canvas.width);
    svg.setAttributeNS(null, 'height', canvas.height);
    
    this._fromData( pointGroups, 
        (curve, widths, color) => {
            const path = document.createElement('path');
        
            // Need to check curve for NaN values, these pop up when drawing
            // lines on the canvas that are not continuous. E.g. Sharp corners
            // or stopping mid-stroke and than continuing without lifting mouse.
            if (!isNaN(curve.control1.x) &&
              !isNaN(curve.control1.y) &&
              !isNaN(curve.control2.x) &&
              !isNaN(curve.control2.y)) {
                const attr = `M ${curve.startPoint.x.toFixed(3)},${curve.startPoint.y.toFixed(3)} `
                    + `C ${curve.control1.x.toFixed(3)},${curve.control1.y.toFixed(3)} `
                    + `${curve.control2.x.toFixed(3)},${ curve.control2.y.toFixed(3)} `
                    + `${curve.endPoint.x.toFixed(3)},${ curve.endPoint.y.toFixed(3)}`            ;
            
                path.setAttribute('d', attr);
                path.setAttribute('stroke-width', (widths.end * 2.25).toFixed(3));
                path.setAttribute('stroke', color);
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke-linecap', 'round');
            
                svg.appendChild(path);
            }
        },
        (rawPoint) =>{
            const circle = document.createElement('circle');
            const dotSize = (typeof this.dotSize) === 'function' ? this.dotSize() : this.dotSize;
            circle.setAttribute('r', dotSize);
            circle.setAttribute('cx', rawPoint.x);
            circle.setAttribute('cy', rawPoint.y);
            circle.setAttribute('fill', rawPoint.color);

            svg.appendChild(circle);
        },
    );

    const prefix = 'data:image/svg+xml;base64,';
    const header = '<svg'
        + ' xmlns="http://www.w3.org/2000/svg"'
        + ' xmlns:xlink="http://www.w3.org/1999/xlink"'
        + ` viewBox="${minX} ${minY} ${maxX} ${maxY}"`
        + ` width="${maxX}"`
        + ` height="${maxY}"`
        + '>';
    let body = svg.innerHTML;

    // IE hack for missing innerHTML property on SVGElement
    if (body === undefined) {
        const dummy = document.createElement('dummy');
        const nodes = svg.childNodes;
        dummy.innerHTML = '';

        for (let i = 0; i < nodes.length; i += 1) {
            dummy.appendChild(nodes[i].cloneNode(true));
        }

        body = dummy.innerHTML;
    }

    const footer = '</svg>';
    const data = header + body + footer;

    return prefix + btoa(data);
};

InkCanvas.prototype.fromData = function (pointGroups) {
    this.clear();

    this._fromData(
        pointGroups,
        (curve, widths) => Curve.drawFragment(this._ctx, curve, widths.start, widths.end),
        rawPoint => this._drawDot(rawPoint),
    );

    this._data = pointGroups;
};

InkCanvas.prototype.toData = function () {
return this._data;
};

export default InkCanvas;
