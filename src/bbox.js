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
}

BBox.prototype.slopeWith = function (x, y) {
    const dx = this.p2.x - this.p1.x;
    const dy = this.p2.y - this.p1.y;
    const px = x - this.p1.x;
    const py = y - this.p1.y;
    const tx = px / dx;
    const ty = py / dy;
    const d = Math.abs(tx - ty);
    //console.info(d);
    if (d < 0.3) return true;
    return false;
}

export default BBox;