import Point from './point';
function Bezier(startPoint, control1, control2, endPoint) {
  this.startPoint = startPoint;
  this.control1 = control1;
  this.control2 = control2;
  this.endPoint = endPoint;
}

Bezier.calculateCurveControlPoints = function (s1, s2, s3) {
    const dx1 = s1.x - s2.x;
    const dy1 = s1.y - s2.y;
    const dx2 = s2.x - s3.x;
    const dy2 = s2.y - s3.y;

    const m1 = { x: (s1.x + s2.x) / 2.0, y: (s1.y + s2.y) / 2.0 };
    const m2 = { x: (s2.x + s3.x) / 2.0, y: (s2.y + s3.y) / 2.0 };

    const l1 = Math.sqrt((dx1 * dx1) + (dy1 * dy1));
    const l2 = Math.sqrt((dx2 * dx2) + (dy2 * dy2));

    const dxm = (m1.x - m2.x);
    const dym = (m1.y - m2.y);

    const k = l2 / (l1 + l2);
    const cm = { x: m2.x + (dxm * k), y: m2.y + (dym * k) };

    const tx = s2.x - cm.x;
    const ty = s2.y - cm.y;

    return {
        c1: new Point(m1.x + tx, m1.y + ty),
        c2: new Point(m2.x + tx, m2.y + ty),
    };
}

// Returns approximated length.
Bezier.prototype.length = function () {
  const steps = 10;
  let length = 0;
  let px;
  let py;

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const cx = this._point(
      t,
      this.startPoint.x,
      this.control1.x,
      this.control2.x,
      this.endPoint.x,
    );
    const cy = this._point(
      t,
      this.startPoint.y,
      this.control1.y,
      this.control2.y,
      this.endPoint.y,
    );
    if (i > 0) {
      const xdiff = cx - px;
      const ydiff = cy - py;
      length += Math.sqrt((xdiff * xdiff) + (ydiff * ydiff));
    }
    px = cx;
    py = cy;
  }

  return length;
};

/* eslint-disable no-multi-spaces, space-in-parens */
Bezier.prototype._point = function (t, start, c1, c2, end) {
  return (       start * (1.0 - t) * (1.0 - t)  * (1.0 - t))
       + (3.0 *  c1    * (1.0 - t) * (1.0 - t)  * t)
       + (3.0 *  c2    * (1.0 - t) * t          * t)
       + (       end   * t         * t          * t);
};
/* eslint-enable no-multi-spaces, space-in-parens */

export default Bezier;
