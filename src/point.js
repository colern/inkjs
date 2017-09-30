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

export default Point;
