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

BBox.prototype.clear = function () {
    this.p1 = null;
    this.p2 = null;
    this.top = null;
    this.bottom = null;
    this.left = null;
    this.right = null;
}

BBox.prototype.isInBound = function (x, y) {
    if (x >= this.left && x <= this.right && y >= this.top && y <= this.bottom) return true;
    return false;
}

BBox.prototype.slopeWith = function (x, y) {
    const d = Math.abs(this.slope(x,y));
    //console.info(d);
    if (d < 0.3) return true;
    return false;
}

BBox.prototype.slope = function (x, y) {
    const dx = this.p2.x - this.p1.x;
    const dy = this.p2.y - this.p1.y;
    const px = x - this.p1.x;
    const py = y - this.p1.y;
    const tx = px / dx;
    const ty = py / dy;
    return tx - ty;
}

BBox.prototype.isIntersect = function (box) {
    let xLeft = Math.max(this.left, box.left);
    let xRight = Math.min(this.right, box.right);
    let yTop = Math.max(this.top, box.top);
    let yBottom = Math.min(this.bottom, box.bottom);
    if ((xLeft - xRight) < 0 && (yTop - yBottom) < 0) {
        return true;
    }
    return false;
}

BBox.prototype.merge = function (box) {
    if (this.left == null) {
        this.p1 = box.p1;
        this.p2 = box.p2;
        this.left = box.left;
        this.right = box.right;
        this.top = box.top;
        this.bottom = box.bottom;
    }
    this.top = Math.min(this.top, box.top);
    this.bottom = Math.max(this.bottom, box.bottom);
    this.left = Math.min(this.left, box.left);
    this.right = Math.max(this.right, box.right);
}

export default BBox;