import Point from './point';

function Stabilizer(points,radiu){
    
}

Stabilizer.smooth = function (points,start,n) {
    if (n <= 1) return points[0];
    let totalX = 0, totalY = 0, totalP = 0, totalT = 0;
    const end = Math.min(start + n, points.length);
    for (let idx = start; idx < end; ++idx) {
        totalX += points[idx].x;
        totalY += points[idx].y;
        totalP += points[idx].pressure;
        totalT += points[idx].time;
    }
    const num = end - start;
    return new Point(totalX / num, totalY / num, totalP / num, totalT / num);
}

export default Stabilizer;