import BBox from './bbox';
import Stabilizer from './stabilizer';
import Bezier from './bezier';
function Curve(id, color) {
    this.data = [];
    this._smoothData = [];
    this.color = color;
    this.id = id;
    this.length = 0;
    this.hide = false;
    this.radiu = 1.5;
    this.bbox = new BBox(null,null);
    //this.lbbox = [];//a box group that sort by x-axie;
}

Curve.createFragment = function (data, index) {
    let len = data.length - index;
    if (len >= 2) {
        let pt1 = data[index],
            pt2 = null,
            pt3 = null,
            pt4 = null;
        if (len == 2) {
            pt2 = data[index];
            pt3 = data[index + 1];
            pt4 = data[index + 1];
        }
        else if (len === 3) {
            pt2 = data[index];
            pt3 = data[index + 1];
            pt4 = data[index + 2];
        }
        else {
            pt2 = data[index+1];
            pt3 = data[index + 2];
            pt4 = data[index + 3];
        }
        let tmp = Bezier.calculateCurveControlPoints(pt1, pt2, pt3);
        const c2 = tmp.c2;
        tmp = Bezier.calculateCurveControlPoints(pt2, pt3, pt4);
        const c3 = tmp.c1;
        return new Bezier(pt2, c2, c3, pt3);
    }
    return null;
}

Curve.calculateFragmentWidths = function (fragment,radiu) {
    const startPoint = fragment.startPoint;
    const endPoint = fragment.endPoint;
    const widths = { start: null, end: null };

    const startE = Math.exp(-2 * radiu * (startPoint.pressure - 0.5));
    const endE = Math.exp(-2 * radiu * (endPoint.pressure - 0.5));
    widths.start = 2 * radiu / (1 + startE);
    widths.end = 2 * radiu / (1 + endE);

    return widths;
}

Curve.drawFragment = function (context, fragment, startWidth, endWidth) {
    const widthDelta = endWidth - startWidth;
    const drawSteps = Math.floor(fragment.length());
    context.beginPath();
    //if (drawSteps == 0) {
    //    console.info('000');
    //}
    for (let i = 0; i < drawSteps; i += 1) {
        // Calculate the Bezier (x, y) coordinate for this step.
        const t = i / drawSteps;
        const tt = t * t;
        const ttt = tt * t;
        const u = 1 - t;
        const uu = u * u;
        const uuu = uu * u;

        let x = uuu * fragment.startPoint.x;
        x += 3 * uu * t * fragment.control1.x;
        x += 3 * u * tt * fragment.control2.x;
        x += ttt * fragment.endPoint.x;

        let y = uuu * fragment.startPoint.y;
        y += 3 * uu * t * fragment.control1.y;
        y += 3 * u * tt * fragment.control2.y;
        y += ttt * fragment.endPoint.y;

        const width = startWidth + (ttt * widthDelta);
        if (width <= 0.3) {
            console.info('----');
        }
        Curve.drawPoint(context,x, y, width);
    }

    context.closePath();
    context.fill();
}

Curve.drawPoint = function (context, x, y, size) {
    context.moveTo(x, y);
    context.arc(x, y, size, 0, 2 * Math.PI, false);
}

Curve.drawDot = function (context, x, y, size) {
    context.beginPath();
    Curve.drawPoint(context, x, y, size);
    context.closePath();
    context.fill();
}

Curve.appendPoint = function (data, bbox, point) {
    if (bbox.left == null) {
        bbox.left = point.x;
        bbox.right = point.x;
        bbox.top = point.y;
        bbox.bottom = point.y;
    }
    data.push(point);
    const x = point.x;
    const y = point.y;
    bbox.right = Math.max(bbox.right, x, bbox.left);
    bbox.left = Math.min(bbox.right, x, bbox.left);
    bbox.top = Math.min(bbox.top, y, bbox.bottom);
    bbox.bottom = Math.max(bbox.top, y, bbox.bottom);
}

Curve.prototype.addPoint = function (point) {
    Curve.appendPoint(this.data, this.bbox, point);
    this.length += 1;
};

Curve.prototype.last = function(){
    if (this.data.length == 0) return null;
    return this.data[this.data.length - 1];
}

Curve.prototype.get = function(index){
    return this.data[index];
}

Curve.prototype.isIn = function (x, y) {
    return this.bbox.isInBound(x, y);
}

Curve.prototype.draw = function (context) {
    if (this.hide == true) return;
    let fst = context.fillStyle;
    context.fillStyle = this.color;
    //draw first 3 points
    for (let st = 0; st < 4; ++st) {
        let arr = [];
        for (let i = 0; i <= st; ++i) {
                let index = i;
                if (st < 3) {
                if (index >= this._smoothData.length) index = this._smoothData.length-1;
                arr.push(this._smoothData[index]);
            }
            else {
                if (index >= this._smoothData.length) index = this._smoothData.length - 1;
                arr.push(this._smoothData[index]);
            }
        }
        this._drawFrag(context,arr, 0);
    }
    for (let idx = 0; idx < this._smoothData.length; ++idx) {
        this._drawFrag(context,this._smoothData, idx);
    }
    context.fillStyle = fst;
}

Curve.prototype._drawFrag = function (context, data, pos) {
    if (data.length < 2) {
        Curve.drawDot(context, data[0].x, data[0].y, this.radiu);
    }
    else {
        const frag = Curve.createFragment(data, pos);
        if (frag) {
            const widths = Curve.calculateFragmentWidths(frag, this.radiu);
            if (widths) {
                Curve.drawFragment(context, frag, widths.start, widths.end);
            }
        }
    }
}

export default Curve;