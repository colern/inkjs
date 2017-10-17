function Point(x, y, pressure, time) {
    this.x = x;
    this.y = y;
    this.time = time || new Date().getTime();
    this.pressure = pressure || 0.5;
}

Point.prototype.velocityFrom = function (start) {
    return (this.time !== start.time) ? this.distanceTo(start) / (this.time - start.time) : 1;
};

Point.prototype.distanceTo = function (start) {
    return Math.sqrt(Math.pow(this.x - start.x, 2) + Math.pow(this.y - start.y, 2));
};

Point.prototype.equals = function (other) {
    return this.x === other.x && this.y === other.y;
};

Point.prototype.radiu = function(){

}

Point.prototype.isInArea = function (area) {
    const pi2 = Math.PI * 2;
    let angls = [];
    for (let bi = 0; bi < area.length; ++bi) {
        const p1 = area[bi];
        const dx1 = p1.x - this.x;
        const dy1 = p1.y - this.y;
        const ag = Math.atan2(dy1, dx1);
        if (ag < 0) {
            angls.push(pi2+ag);
        }
        else {
            angls.push(ag);
        }
    }
    let angle = 0;
    for (let ai = 0; ai < angls.length; ++ai) {
        const a0 = angls[ai];
        let idx = ai + 1;
        if (idx >= angls.length) {
            idx = 0;
        }
        const a1 = angls[idx];
        let diff = a1 - a0;
        if (ai + 1 >= angls.length && diff < -Math.PI) {
            diff = 2 * Math.PI + diff;
        }
        angle += diff;
    }
    //console.info(': '+angle);
    if (Math.abs(angle) < 0.01) {//point is in area
        //console.info('=== ' + angle+" == " + angls.length);
        return true;
    }
    return false;
}

export default Point;
